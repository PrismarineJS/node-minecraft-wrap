#!/usr/bin/env node

const WrapClient = require('../').WrapClient
const path = require('path')

if (process.argv.length < 0) {
  console.log('Usage : node exampleWrapClient.js [<minecraft dir>] [<version>] [<username>] [<password>] [<stop>]')
  process.exit(0)
}

const version = process.argv[3]
const dir = process.argv[2] ? path.isAbsolute(process.argv[2]) ? process.argv[2] : path.join(process.cwd(), process.argv[2]) : null

const vClient = new WrapClient(dir, version)
const username = process.argv[4]
const password = process.argv[5]
const stop = process.argv[6]

vClient.on('line', function (line) {
  console.log(line)
})

Promise.resolve()
  .then(() => vClient.auth(username, password))
  .then(() => console.log('User logged in !'))
  .then(() => vClient.prepare())
  .then(() => console.log('Client prepared !'))
  .then(() => vClient.start())
  .then(() => {
    console.log('Client Started !')
  })
  .then(() => {
    if (stop) {
      setTimeout(() => {
        vClient.stop()
          .then(() => {
            console.log('Client Stopped !')
          })
          .catch((err) => {
            console.log(err)
          })
      }, 3000)
    }
  })
  .catch((err) => {
    console.log(err)
  })
