const http = require('http')
const https = require('https')
const rp = require('request-promise')
const fs = require('mz/fs')
const crypto = require('mz/crypto')
const assert = require('assert')
const promisify = require('es6-promisify')
const mkdirp = promisify(require('mkdirp'))
const etagDownload = promisify(require('./etag_download'))
const Queue = require('promise-queue')
const flatmap = require('flatmap')
const extract = promisify(require('extract-zip'))

// http://wiki.vg/Game_files

const queue = new Queue(8, Infinity)

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
    return rp('https://launchermeta.mojang.com/mc/game/version_manifest.json').then((text) => {
      this.versionsList = JSON.parse(text)
      return this.versionsList
    })
  }

  static getLatestVersion () {
    return rp('https://launchermeta.mojang.com/mc/game/version_manifest.json').then((text) => {
      const json = JSON.parse(text)
      return json.latest
    })
  }

  getVersionInfos (version) {
    if (this.versionsInfos[version]) { return Promise.resolve(this.versionsInfos[version]) }
    return this.getVersionsList()
      .then(versionsList => {
        const versionInfos = versionsList.versions.find(({ id }) => id === version)
        const versionUrl = versionInfos.url
        return etagDownload(versionUrl, this.mcPath + '/versions/' + version + '/' + version + '.json')
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

  async getAllAssets (version, filterFn, progressCb) {
    const assetIndex = await this.getAssetIndex(version)
    let keys = Object.keys(assetIndex.objects)
    if (filterFn) keys = keys.filter(filterFn)
    let completed = 0
    await Promise.all(
      keys.map(assetFile =>
        this.getAsset(assetFile, version).then(() => {
          completed++
          progressCb?.({ done: completed, total: keys.length, name: assetFile })
        })
      )
    )
    progressCb?.({ done: completed, total: keys.length })
  }

  getAsset (assetFile, version) {
    return this.getAssetIndex(version).then(assetIndex => {
      const { hash: sha1, size } = assetIndex.objects[assetFile]
      const subPath = sha1.substring(0, 2) + '/' + sha1
      const url = 'http://resources.download.minecraft.net/' + subPath
      return downloadFile(url, this.mcPath + '/assets/objects/' + subPath, size, sha1)
    })
  }

  getClient (version, path = this.mcPath + '/versions/' + version + '/' + version + '.jar', progressCb) {
    return this.getVersionInfos(version)
      .then(versionInfo => {
        const { url, size, sha1 } = versionInfo.downloads.client
        return downloadFile(url, path, size, sha1, progressCb)
      })
  }

  getServer (version, path = this.mcPath + '/servers/' + version + '/' + version + '.jar', progressCb) {
    return this.getVersionInfos(version)
      .then(versionInfo => {
        const { url, size, sha1 } = versionInfo.downloads.server
        return downloadFile(url, path, size, sha1, progressCb)
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

async function _downloadFile (url, path, size, sha1, progressCb) {
  try {
    await checkFile(path, size, sha1)
    progressCb?.({ done: 1, total: 1 })
    return path
  } catch {
    // no file or invalid
  }

  const parts = path.split('/')
  parts.pop()
  const dirPath = parts.join('/')
  await mkdirp(dirPath)
  const protocol = url.includes('https:') ? https : http

  const promise = queue.add(() => new Promise((resolve, reject) => {
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        const remoteFileLen = parseInt(response.headers['content-length'], 10)
        assert.strictEqual(remoteFileLen, size, `remote file size ${remoteFileLen} is different than expected ${size}`)
        let readLen = 0

        const file = fs.createWriteStream(path)

        response.on('data', (chunk) => {
          file.write(chunk)
          readLen += chunk.length
          progressCb?.({ done: readLen, total: remoteFileLen })
        })

        response.on('end', async () => {
          progressCb?.({ name: 'Saving', done: remoteFileLen, total: remoteFileLen })
          file.close(() => {
            checkFile(path, size, sha1).then(e => {
              progressCb?.({ done: remoteFileLen, total: remoteFileLen })
              resolve(path)
            }).catch(e => reject(e))
          })
        })
      } else {
        console.warn('Invalid response: ', response)
        resolve(null)
      }
    })
  }))

  pathsPromises[path] = promise
  return promise
}

async function downloadFile (url, path, size, sha1, progressCb) {
  try {
    const attempt = await _downloadFile(url, path, size, sha1, progressCb)
    console.assert(attempt != null, 'server returned non-200 status code')
    return attempt
  } catch (e) {
    console.warn(e)
    console.warn(`Failed ${url}, trying again in 5 seconds...`)
    return new Promise(resolve =>
      setTimeout(() => {
        resolve(_downloadFile(url, path, size, sha1, progressCb))
      }, 5000)
    )
  }
}

async function checkFile (path, size, expectedSha1) {
  const stats = await fs.promises.stat(path)
  const file = await fs.promises.readFile(path)

  assert.strictEqual(stats.size, size, `wrong size for ${path}, expected ${size}, got ${stats.size}`)
  const computedSha1 = crypto.createHash('sha1').update(file).digest('hex')
  assert.strictEqual(computedSha1, expectedSha1, `wrong sha1 for ${path}, expected ${expectedSha1}, got ${computedSha1}`)
}

module.exports = LauncherDownload
