/* eslint-env mocha */

const WrapServer = require('../').WrapServer
const downloadServer = require('../').downloadServer
const path = require('path')
const MC_SERVER_PATH = path.join(__dirname, 'server')
const MC_SERVER_JAR = path.join(__dirname, 'server.jar')
const fs = require('fs')
const wait = require('util').promisify(setTimeout)

describe('server_session', function () {
  this.timeout(10 * 60 * 1000)
  before(async () => {
    try {
      return await downloadServer('1.13', MC_SERVER_JAR)
    } catch (err) {
      return err
    }
  })
  after(async () => {
    fs.promises.unlink(MC_SERVER_JAR)
  })

  it('start and stop the server', async () => {
    const vServer = new WrapServer(MC_SERVER_JAR, MC_SERVER_PATH)

    vServer.on('line', function (line) {
      console.log(line)
    })

    try {
      await vServer.startServer({ 'server-port': 25569 })
      console.log('Server Started !')
      await wait(3000)
      await vServer.stopServer()
      console.log('Server Stopped !')
      await vServer.deleteServerData()
      console.log('Server data deleted !')
    } catch (err) {
      console.log(err)
      return err
    }
  })
})
