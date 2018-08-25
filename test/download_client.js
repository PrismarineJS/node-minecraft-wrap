/* eslint-env mocha */

const minecraftWrap = require('../')
const fs = require('fs')

describe('Download', function () {
  this.timeout(10 * 60 * 1000)
  it('Can download the client', done => {
    minecraftWrap.downloadClient('1.13', '1.13-client.jar', err => {
      if (err) return done(err)
      fs.unlinkSync('1.13-client.jar')
      done()
    })
  })

  it('Can download the server', done => {
    minecraftWrap.downloadServer('1.13', '1.13-server.jar', err => {
      if (err) return done(err)
      fs.unlinkSync('1.13-server.jar')
      done()
    })
  })
})
