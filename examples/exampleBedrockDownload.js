#!/usr/bin/env node

const wrap = require('../')

if (process.argv.length < 4 || process.argv.length > 5) {
  console.log('Usage : node exampleBedrockServer.js <version> <outputFolder>')
  process.exit(0)
}
wrap.downloadBedrockServer(process.platform, process.argv[2], process.argv[3])
