/* eslint-env mocha */

const minecraftWrap = require('../')
const fs = require('fs')
const testedVersions = require('./tested_versions.json')

for (const version of testedVersions) {
  describe(`Download ${version}`, function () {
    this.timeout(10 * 60 * 1000)
    it('Can download the client', done => {
      minecraftWrap.downloadClient(version, `${version}-client.jar`, err => {
        if (err) return done(err)
        fs.unlinkSync(`${version}-client.jar`)
        done()
      })
    })

    it('Can download the server', done => {
      minecraftWrap.downloadServer(version, `${version}-server.jar`, err => {
        if (err) return done(err)
        fs.unlinkSync(`${version}-server.jar`)
        done()
      })
    })
  })
}
