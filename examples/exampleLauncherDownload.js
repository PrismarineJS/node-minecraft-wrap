#!/usr/bin/env node

const LauncherDownload = require('../').LauncherDownload
const path = require('path')
if (!(process.argv.length >= 4 && process.argv.length <= 5)) {
  console.log('Usage : node exampleLauncherDownload.js <version> <minecraft dir> [<linux|osx|windows>]')
  process.exit(0)
}

const version = process.argv[2]
const dir = path.isAbsolute(process.argv[3]) ? process.argv[3] : path.join(process.cwd(), process.argv[3])
const os = process.argv[4] ? process.argv[4] : 'linux'

const ld = new LauncherDownload(dir, os)

ld.getWholeClient(version).then(results => {
  console.log('Got the whole client')
  console.log(results)
}).catch(err => {
  console.log(err)
})
