const LauncherDownload = require('./launcher_download')

module.exports.downloadServer = function (minecraftVersion, filename) {
  const launcherDownload = new LauncherDownload(process.cwd(), 'linux')
  return launcherDownload.getServer(minecraftVersion, filename)
}

module.exports.downloadClient = function (minecraftVersion, filename) {
  const launcherDownload = new LauncherDownload(process.cwd(), 'linux')
  return launcherDownload.getClient(minecraftVersion, filename)
}
