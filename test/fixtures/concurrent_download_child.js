const LauncherDownload = require('../../lib/launcher_download')

const [mcPath, version] = process.argv.slice(2)
const launcherDownload = new LauncherDownload(mcPath)
launcherDownload.getVersionsList()
  .then(() => launcherDownload.getVersionInfos(version))
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err.message)
    process.exit(1)
  })
