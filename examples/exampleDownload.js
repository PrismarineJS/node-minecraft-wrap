#!/usr/bin/env node

const wrap = require('../')
const path = require('path')
if (process.argv.length < 4 || process.argv.length > 5) {
  console.log('Usage : node exampleDownload.js <version> <jar_file> [<client|server>]')
  process.exit(0)
}

const version = process.argv[2]
const jarFile = path.isAbsolute(process.argv[3]) ? process.argv[3] : path.join(process.cwd(), process.argv[3])
const downloadServer = !process.argv[4] || process.argv[4] === 'server'

let lastProgress = null

const printProgress = () => {
  if (lastProgress) {
    console.log(`Downloading... ${lastProgress.name ||
      Math.ceil((lastProgress.done / lastProgress.total) * 100)} % (${lastProgress.done}/${lastProgress.total})`)
  }
}
const progress = setInterval(printProgress, 500)

wrap['download' + (downloadServer ? 'Server' : 'Client')](version, jarFile, function (err) {
  clearInterval(progress)
  printProgress()
  if (err) {
    console.log(err)
    process.exit(1)
  }
  console.log('Done !')
}, progress => { lastProgress = progress })
