const fetch = require('node-fetch')
const { VERSIONS_LIST_URL, RESOURCE_DOWNLOAD_URL } = require('./constants.json')
const { downloadFile } = require('./util')
const path = require('path')
const fs = require('fs/promises')
const extract = require('extract-zip')
const download = require('./etag_download')

class LauncherDownload {
  constructor (mcPath, os = 'linux') {
    this.mcPath = mcPath
    this.os = os
    this.nativesString = `natives-${this.os}`
    this.versionsInfo = {}
    this.assetsIndex = {}
  }

  async getWholeClient (version) {
    const libraries = await this.getLibraries(version)
    const [client, assets, nativesPath] = await Promise.all([
      this.getClient(version),
      this.getAllAssets(version),
      this.extractNatives(version)
    ])
    return { client, assets, libraries, nativesPath }
  }

  async getVersionsList () {
    if (this.versionsList) return this.versionsList
    this.versionsList = await (await fetch(VERSIONS_LIST_URL)).json()
    return this.versionsList
  }

  async getVersionInfos (version) {
    if (version in this.versionsInfo) return this.versionsInfo[version]
    const versionsList = await this.getVersionsList()
    const versionInfos = versionsList.versions.find(v => v.id === version)
    const savedPath = await download(versionInfos.url, path.join(this.mcPath, 'versions', version, `${version}.json`))
    const fileData = require(savedPath)
    this.versionsInfo[version] = fileData
    return fileData
  }

  async getAssetsIndex (version) {
    if (version in this.assetsIndex) return this.assetsIndex[version]
    const versionInfos = await this.getVersionInfos(version)
    const { url, size, sha1 } = versionInfos.assetIndex
    const savedPath = await downloadFile(url, path.join(this.mcPath, 'assets', 'indexes', `${version}.json`), { expectedHash: sha1, hashType: 'sha1', expectedSize: size })
    const fileData = require(savedPath)
    this.assetsIndex[version] = fileData
    return fileData
  }

  async getClient (version, filePath = path.join(this.mcPath, 'clients', version, `${version}.jar`)) {
    const versionInfos = await this.getVersionInfos(version)
    const { url, size, sha1 } = versionInfos.downloads.server
    return downloadFile(url, filePath, { expectedSize: size, expectedHash: sha1, hashType: 'sha1' })
  }

  async getServer (version, filePath = path.join(this.mcPath, 'versions', version, `${version}.jar`)) {
    const versionInfos = await this.getVersionInfos(version)
    const { url, size, sha1 } = versionInfos.downloads.server
    return downloadFile(url, filePath, { expectedSize: size, expectedHash: sha1, hashType: 'sha1' })
  }

  async getAsset (assetFile, version) {
    const assetIndex = await this.getAssetsIndex(version)
    const { hash, size } = assetIndex.objects[assetFile]
    const subPath = hash.substring(0, 2) + '/' + hash
    const url = `${RESOURCE_DOWNLOAD_URL}/${subPath}`
    return downloadFile(url, path.join(this.mcPath, 'assets', 'objects', subPath), { expectedSize: size, expectedHash: hash, hashType: 'sha1' })
  }

  async getAllAssets (version) {
    const assetIndex = await this.getAssetsIndex(version)
    const assetNames = Object.keys(assetIndex.objects)
    const toRet = []
    for (const asset of assetNames) {
      const res = await this.getAsset(asset, version)
      toRet.push(res)
    }
    return toRet
  }

  async getLibraries (version) {
    const versionInfos = await this.getVersionInfos(version)
    const downloadPromises = versionInfos.libraries.map(lib => {
      if (this._parseLibRules(lib.rules)) return []
      const getLib = async artifact => {
        const { url, path: p, size, sha1 } = artifact
        try {
          const filePath = await downloadFile(url, path.join(this.mcPath, 'libraries', p), { expectedSize: size, expectedHash: sha1, hashType: 'sha1' })
          await fs.writeFile(path.join(this.mcPath, 'libraries', `${p}.sha`), sha1)
          return filePath
        } catch (err) {
          console.log(err)
        }
      }
      const results = []
      if (lib.downloads.artifact) {
        results.push(getLib(lib.downloads.artifact))
        console.log('artifact')
      }
      if (lib.downloads.classifiers && lib.downloads.classifiers[this.nativesString]) {
        results.push(getLib(lib.downloads.classifiers[this.nativesString]))
        console.log('classifiers')
      }
      return results
    })
    return await Promise.all(downloadPromises.flat(1))
  }

  async extractNatives (version) {
    const nativesPath = path.join(this.mcPath, 'versions', version, `${version}-natives-${Math.floor(Math.random() * 10000000000000)}`)
    await fs.mkdir(nativesPath, { recursive: true })
    const versionsInfos = await this.getVersionInfos(version)
    const nativesPromises = versionsInfos.libraries
      .filter(lib => lib.extract !== undefined)
      .filter(lib => !this._parseLibRules(lib.rules) && lib.downloads.classifiers[this.nativesString])
      .map(lib => {
        const { path: p } = lib.downloads.classifiers[this.nativesString]
        const nativePath = path.join(this.mcPath, 'libraries', p)
        return extract(nativePath, { dir: nativesPath })
      })
    await Promise.all(nativesPromises)
    return nativesPath
  }

  _parseLibRules (rules) {
    let skip = false
    if (rules) {
      skip = true
      rules.forEach(({ action, os }) => {
        if (action === 'allow' && ((os && os.name === this.os) || !os)) skip = false
        if (action === 'disallow' && ((os && os.name === this.os) || !os)) skip = true
      })
    }
    return skip
  }
}

module.exports = LauncherDownload
