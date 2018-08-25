const LauncherDownload = require('./launcher_download')

module.exports.downloadServer = function (minecraftVersion, filename, done) {
  const launcherDownload = new LauncherDownload(process.cwd(), 'linux')
  launcherDownload.getServer(minecraftVersion, filename)
    .then(info => done(null, info))
    .catch(err => done(err))
}

module.exports.downloadClient = function (minecraftVersion, filename, done) {
  const launcherDownload = new LauncherDownload(process.cwd(), 'linux')
  launcherDownload.getClient(minecraftVersion, filename)
    .then(info => done(null, info))
    .catch(err => done(err))
}
