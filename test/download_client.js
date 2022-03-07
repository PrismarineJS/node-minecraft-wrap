/* eslint-env mocha */

const minecraftWrap = require('../')
const fs = require('fs').promises

describe('Download', function () {
  this.timeout(10 * 60 * 1000)
  it('Can download the client', async () => {
    try {
      await minecraftWrap.downloadClient('1.13', '1.13-client.jar')
      await fs.unlink('1.13-client.jar')
    } catch (err) {
      console.log(err)
      return err
    }
  })

  it('Can download the server', async () => {
    try {
      await minecraftWrap.downloadServer('1.13', '1.13-server.jar')
      await fs.unlink('1.13-server.jar')
    } catch (err) {
      console.log(err)
      return err
    }
  })
})
