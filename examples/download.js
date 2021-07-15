const LD = require('minecraft-wrap').LauncherDownload

async function main () {
  for (let i = 0; i < 20; i++) {
    console.log(`test ${i}`)
    await require('fs/promises').rm(__dirname + '/libraries', { recursive: true, force: true })
    const dl = new LD(__dirname, 'linux')
    await dl.getLibraries('1.15.2')
    await require('fs/promises').rm(__dirname + '/libraries', { recursive: true, force: true })
  }
}

main()
