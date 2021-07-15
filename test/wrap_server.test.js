/* eslint-env mocha */

const WrapServer = require('minecraft-wrap').WrapServer
const downloadServer = require('minecraft-wrap').downloadServer
const path = require('path')
const MC_SERVER_PATH = path.join(__dirname, 'server')
const MC_SERVER_JAR = path.join(__dirname, 'server.jar')
const wait = require('util').promisify(setTimeout)
const fs = require('fs')

describe('server_session', function () {
  this.timeout(10 * 60 * 1000)
  before(async () => {
    await downloadServer('1.13', MC_SERVER_JAR)
  })
  after(async () => {
    await fs.promises.rm(MC_SERVER_JAR)
  })

  it('start and stop the server', async () => {
    const vServer = new WrapServer(MC_SERVER_JAR, MC_SERVER_PATH)
    vServer.on('line', console.log)
    await vServer.startServer({ 'server-port': 25569 })
    console.log('Server Started !')
    await wait(3000)
    await vServer.stopServer()
    console.log('Server Stopped !')
    await vServer.deleteServerData()
    console.log('Server data deleted !')
  })
})
