const rp = require('request-promise')
const rq = require('request')
const fs = require('mz/fs')
const crypto = require('mz/crypto')
const assert = require('assert')
const debug = require('debug')('minecraft-wrap')
const promisify = require('es6-promisify')
const mkdirp = promisify(require('mkdirp'))
const etagDownload = promisify(require('./etag_download'))
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
      {client, assets, libraries, nativesPath}))
  }

  getVersionsList () {
    if (this.versionsList) { return Promise.resolve(this.versionsList) }
    return rp('https://launchermeta.mojang.com/mc/game/version_manifest.json').then((text) => {
      this.versionsList = JSON.parse(text)
      return this.versionsList
    })
  }

  getVersionInfos (version) {
    if (this.versionsInfos[version]) { return Promise.resolve(this.versionsInfos[version]) }
    return this.getVersionsList()
      .then(versionsList => {
        const versionInfos = versionsList.versions.find(({id}) => id === version)
        const versionUrl = versionInfos['url']
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
        const {url, size, sha1} = versionInfo['assetIndex']
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
      return Promise.all(Object.keys(assetIndex['objects'])
        .map(assetFile => this.getAsset(assetFile, version)))
    })
  }

  getAsset (assetFile, version) {
    return this.getAssetIndex(version).then(assetIndex => {
      const {hash: sha1, size} = assetIndex['objects'][assetFile]
      const subPath = sha1.substring(0, 2) + '/' + sha1
      const url = 'http://resources.download.minecraft.net/' + subPath
      return downloadFile(url, this.mcPath + '/assets/objects/' + subPath, size, sha1)
    })
  }

  getClient (version, path = this.mcPath + '/versions/' + version + '/' + version + '.jar') {
    return this.getVersionInfos(version)
      .then(versionInfo => {
        const {url, size, sha1} = versionInfo['downloads']['client']
        return downloadFile(url, path, size, sha1)
      })
  }

  getServer (version, path = this.mcPath + '/servers/' + version + '/' + version + '.jar') {
    return this.getVersionInfos(version)
      .then(versionInfo => {
        const {url, size, sha1} = versionInfo['downloads']['server']
        return downloadFile(url, path, size, sha1)
      })
  }

  extractNatives (version) {
    const nativesPath = this.mcPath + '/versions/' + version + '/' + version + '-natives-' + Math.floor(Math.random() * 10000000000000)
    return mkdirp(nativesPath)
      .then(() => this.getVersionInfos(version))
      .then(versionInfo => Promise.all(versionInfo['libraries']
        .filter(lib => lib['extract'] !== undefined)
        .filter(lib => !this._parseLibRules(lib['rules']) && lib['downloads']['classifiers']['natives-' + this.os])
        .map(lib => {
          const {path} = lib['downloads']['classifiers']['natives-' + this.os]
          const nativePath = this.mcPath + '/libraries/' + path
          return extract(nativePath, {dir: nativesPath})
        })))
      .then(() => nativesPath)
  }

  _parseLibRules (rules) {
    let skip = false
    if (rules) {
      skip = true
      rules.forEach(({action, os}) => {
        if (action === 'allow' && ((os && os.name === this.os) || !os)) { skip = false }

        if (action === 'disallow' && ((os && os.name === this.os) || !os)) { skip = true }
      })
    }
    return skip
  }

  getLibraries (version) {
    return this.getVersionInfos(version)
      .then(versionInfo => {
        return Promise.all(flatmap(versionInfo['libraries'], lib => {
          if (this._parseLibRules(lib['rules'])) { return [] }

          const getLib = (artifact) => {
            const {url, path, size, sha1} = artifact
            return downloadFile(url, this.mcPath + '/libraries/' + path, size, sha1)
              .then(r => fs.writeFile(this.mcPath + '/libraries/' + path + '.sha', sha1).then(() => r))
          }
          const results = []
          if (lib['downloads']['artifact']) { results.push(getLib(lib['downloads']['artifact'])) }
          if (lib['downloads']['classifiers'] && lib['downloads']['classifiers']['natives-' + this.os]) { results.push(getLib(lib['downloads']['classifiers']['natives-' + this.os])) }
          return results
        }))
      })
  }
}

const pathsPromises = {}

function downloadFile (url, path, size, sha1) {
  assert.notEqual(url, undefined)
  if (pathsPromises[path]) { return pathsPromises[path] }
  const p = checkFile(path, size, sha1)
    .catch(err => {
      debug(err)
      const parts = path.split('/')
      parts.pop()
      const dirPath = parts.join('/')
      return mkdirp(dirPath)
        .then(() => {
          return queue.add(() => new Promise((resolve, reject) => {
            rq(url)
              .pipe(fs.createWriteStream(path))
              .on('close', () => resolve(path))
              .on('error', err => reject(err))
          }))
        })
        .then(() => checkFile(path, size, sha1))
    })
  pathsPromises[path] = p
  return p
}

function checkFile (path, size, sha1) {
  return fs.stat(path).then(stats => assert.equal(stats.size, size, 'wrong size for ' + path))
    .then(() => fs.readFile(path))
    .then(data => assert.equal(crypto.createHash('sha1').update(data).digest('hex'), sha1, 'wrong sha1 for ' + path))
    .then(() => path)
}

module.exports = LauncherDownload
