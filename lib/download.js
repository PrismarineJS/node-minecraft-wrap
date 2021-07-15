const LauncherDownload = require('./launcher_download')

function downloadServer (minecraftVersion, fileName) {
  const launcherDownload = new LauncherDownload(process.cwd(), 'linux')
  return launcherDownload.getServer(minecraftVersion, fileName)
}

function downloadClient (minecraftVersion, fileName) {
  const launcherDownload = new LauncherDownload(process.cwd(), 'linux')
  return launcherDownload.getClient(minecraftVersion, fileName)
}

module.exports = { downloadServer, downloadClient }
