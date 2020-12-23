const { LauncherDownload } = require('../')
const { performance } = require('perf_hooks')

async function run (version) {
  return new Promise(resolve => {
    const launcher = new LauncherDownload(version)
    let lastProgress = null
    const printProgress = () => {
      if (lastProgress) {
        console.log(`Downloading... ${lastProgress.name ||
          (Math.ceil((lastProgress.done / lastProgress.total) * 100))} % (${lastProgress.done}/${lastProgress.total})`)
      }
    }
    const progress = setInterval(printProgress, 1000)
    // const exampleFilter = e => e.endsWith('.png')
    launcher.getAllAssets(version, null, progress => { lastProgress = progress })
      .then(() => {
        clearInterval(progress)
        printProgress()
      })
      .then(r => resolve(true))
  })
}

async function main (version) {
  const latest = await LauncherDownload.getLatestVersion()
  version = version || latest.release
  const dn = performance.now()
  await run(version)
  const end = performance.now() - dn
  console.log('Took', end, '=>', `./${version}`)
}

main(process.argv[2])
