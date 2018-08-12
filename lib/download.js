const etagDownload = require('./etag_download')
const LauncherDownload = require('./launcher_download')

module.exports.downloadServer = function (minecraftVersion, filename, done) {
  const ld = new LauncherDownload(process.cwd(), 'linux') // Options don't really matter
  ld.getVersionInfos(minecraftVersion).then(info => {
    etagDownload(info.downloads.server.url, filename, done)
  }).catch(done)
}

module.exports.downloadClient = function (minecraftVersion, filename, done) {
  const ld = new LauncherDownload(process.cwd(), 'linux') // Options don't really matter
  ld.getVersionInfos(minecraftVersion).then(info => {
    etagDownload(info.downloads.client.url, filename, done)
  }).catch(done)
}
