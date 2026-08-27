const fetch = require('node-fetch')
const fs = require('mz/fs')
const crypto = require('mz/crypto')
const assert = require('assert')
const debug = require('debug')('minecraft-wrap')
const promisify = require('es6-promisify')
const mkdirp = promisify(require('mkdirp'))
const Queue = require('promise-queue')
const flatmap = require('flatmap')
const extract = promisify(require('extract-zip'))

// http://wiki.vg/Game_files

const queue = new Queue(10, Infinity)

class LauncherDownload {
  // linux,osx or windows
  constructor (mcPath, os = 'linux') {
    this.mcPath = mcPath
    this.os = os
    this.versionsInfos = {}
    this.assetIndexes = {}
  }

  getWholeClient (version) {
    return Promise.all([
      this.getClient(version),
      this.getAllAssets(version),
      this.getLibraries(version).then(l => this.extractNatives(version).then(p => [l, p]))
    ]).then(([client, assets, [libraries, nativesPath]]) => (
      { client, assets, libraries, nativesPath }))
  }

  getVersionsList () {
    if (this.versionsList) { return Promise.resolve(this.versionsList) }
    // The manifest is mutable and carries no validation hash: a persisted
    // copy can neither be trusted fresh nor be shared safely between
    // processes, so it must stay in memory.
    return withRetry('https://launchermeta.mojang.com/mc/game/version_manifest.json', url =>
      fetchOnce(url, res => res.json())
    ).then((json) => {
      this.versionsList = json
      return json
    })
  }

  getVersionInfos (version) {
    if (this.versionsInfos[version]) { return Promise.resolve(this.versionsInfos[version]) }
    return this.getVersionsList()
      .then(versionsList => {
        const versionInfos = versionsList.versions.find(({ id }) => id === version)
        const versionUrl = versionInfos.url
        const path = `${this.mcPath}/versions/${version}/${version}.json`
        return downloadFile(versionUrl, path, null, null).then(() => path)
      })
      .then(path => fs.readFile(path, 'utf8'))
      .then(data => {
        const parsed = JSON.parse(data)
        this.versionsInfos[version] = parsed
        return parsed
      })
  }

  getAssetIndex (version) {
    if (this.assetIndexes[version]) { return Promise.resolve(this.assetIndexes[version]) }
    return this.getVersionInfos(version)
      .then(versionInfo => {
        const { url, size, sha1 } = versionInfo.assetIndex
        return downloadFile(url, this.mcPath + '/assets/indexes/' + version + '.json', size, sha1)
      })
      .then(path => fs.readFile(path, 'utf8'))
      .then(data => {
        const parsed = JSON.parse(data)
        this.assetIndexes[version] = parsed
        return parsed
      })
  }

  getAllAssets (version) {
    return this.getAssetIndex(version).then(assetIndex => {
      return Promise.all(Object.keys(assetIndex.objects)
        .map(assetFile => this.getAsset(assetFile, version)))
    })
  }

  getAsset (assetFile, version) {
    return this.getAssetIndex(version).then(assetIndex => {
      const { hash: sha1, size } = assetIndex.objects[assetFile]
      const subPath = sha1.substring(0, 2) + '/' + sha1
      const url = 'http://resources.download.minecraft.net/' + subPath
      return downloadFile(url, this.mcPath + '/assets/objects/' + subPath, size, sha1)
    })
  }

  getClient (version, path = this.mcPath + '/versions/' + version + '/' + version + '.jar') {
    return this.getVersionInfos(version)
      .then(versionInfo => {
        const { url, size, sha1 } = versionInfo.downloads.client
        return downloadFile(url, path, size, sha1)
      })
  }

  getServer (version, path = this.mcPath + '/servers/' + version + '/' + version + '.jar') {
    return this.getVersionInfos(version)
      .then(versionInfo => {
        const { url, size, sha1 } = versionInfo.downloads.server
        return downloadFile(url, path, size, sha1)
      })
  }

  extractNatives (version) {
    const nativesPath = this.mcPath + '/versions/' + version + '/' + version + '-natives-' + Math.floor(Math.random() * 10000000000000)
    return mkdirp(nativesPath)
      .then(() => this.getVersionInfos(version))
      .then(versionInfo => Promise.all(versionInfo.libraries
        .filter(lib => lib.extract !== undefined)
        .filter(lib => !this._parseLibRules(lib.rules) && lib.downloads.classifiers['natives-' + this.os])
        .map(lib => {
          const { path } = lib.downloads.classifiers['natives-' + this.os]
          const nativePath = this.mcPath + '/libraries/' + path
          return extract(nativePath, { dir: nativesPath })
        })))
      .then(() => nativesPath)
  }

  _parseLibRules (rules) {
    let skip = false
    if (rules) {
      skip = true
      rules.forEach(({ action, os }) => {
        if (action === 'allow' && ((os && os.name === this.os) || !os)) { skip = false }

        if (action === 'disallow' && ((os && os.name === this.os) || !os)) { skip = true }
      })
    }
    return skip
  }

  getLibraries (version) {
    return this.getVersionInfos(version)
      .then(versionInfo => {
        return Promise.all(flatmap(versionInfo.libraries, lib => {
          if (this._parseLibRules(lib.rules)) { return [] }

          const getLib = (artifact) => {
            const { url, path, size, sha1 } = artifact
            return downloadFile(url, this.mcPath + '/libraries/' + path, size, sha1)
              .then(r => fs.writeFile(this.mcPath + '/libraries/' + path + '.sha', sha1).then(() => r))
          }
          const results = []
          if (lib.downloads.artifact) { results.push(getLib(lib.downloads.artifact)) }
          if (lib.downloads.classifiers && lib.downloads.classifiers['natives-' + this.os]) { results.push(getLib(lib.downloads.classifiers['natives-' + this.os])) }
          return results
        }))
      })
  }
}

const pathsPromises = {}

const DOWNLOAD_ATTEMPTS = 3
const DOWNLOAD_TIMEOUT_MS = 120000

function downloadFile (url, path, size, sha1) {
  assert.notStrictEqual(url, undefined)
  if (pathsPromises[path]) { return pathsPromises[path] }
  const p = checkFile(path, size, sha1)
    .catch(err => {
      debug(err)
      const parts = path.split('/')
      parts.pop()
      const dirPath = parts.join('/')
      return mkdirp(dirPath)
        .then(() => downloadWithRetry(url, path, size, sha1))
    })
    // A failed download must not poison the cache: without this, every later
    // call for the same path gets the same rejected promise and can never be
    // retried in-process.
    .catch(err => {
      delete pathsPromises[path]
      throw err
    })
  pathsPromises[path] = p
  return p
}

async function downloadWithRetry (url, path, size, sha1) {
  return withRetry(url, async () => {
    try {
      await downloadOnce(url, path)
      return await checkFile(path, size, sha1)
    } catch (err) {
      // a file that failed validation must not survive to satisfy the next
      // attempt's (or another caller's) existence check
      await fs.unlink(path).catch(() => {})
      throw err
    }
  })
}

async function withRetry (url, fn) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(url)
    } catch (err) {
      if (attempt >= DOWNLOAD_ATTEMPTS) throw err
      debug(`download of ${url} failed (attempt ${attempt}/${DOWNLOAD_ATTEMPTS}): ${err.message ?? err}, retrying`)
    }
  }
}

// The stall timeout covers consume as well as the fetch: a response body
// that stops flowing must eventually reject, or callers waiting on it hang
// forever.
function fetchOnce (url, consume) {
  return queue.add(async () => {
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)
    try {
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) throw new Error(`download of ${url} failed: HTTP ${res.status}`)
      return await consume(res)
    } finally {
      clearTimeout(timeoutHandle)
    }
  })
}

let tmpCounter = 0

function downloadOnce (url, path) {
  // Concurrent processes can share these paths, and readers only check
  // existence: a file at its final path must always be complete, which only
  // the rename can guarantee.
  const tmpPath = `${path}.${process.pid}-${tmpCounter++}.tmp`
  return fetchOnce(url, res => new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(tmpPath)
    res.body.pipe(fileStream)
    res.body.on('error', reject)
    fileStream.on('error', reject)
    fileStream.on('finish', resolve)
  })).then(
    () => fs.rename(tmpPath, path),
    err => fs.unlink(tmpPath).catch(() => {}).then(() => { throw err })
  )
}

function checkFile (path, size, sha1) {
  if (size == null && sha1 == null) return fs.promises.access(path)
  return fs.stat(path).then(stats => assert.strictEqual(stats.size, size, 'wrong size for ' + path))
    .then(() => fs.readFile(path))
    .then(data => assert.strictEqual(crypto.createHash('sha1').update(data).digest('hex'), sha1, 'wrong sha1 for ' + path))
    .then(() => path)
}

module.exports = LauncherDownload
