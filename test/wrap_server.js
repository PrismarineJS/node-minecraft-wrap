/* eslint-env mocha */

const WrapServer = require('../').WrapServer
const downloadServer = require('../').downloadServer
const path = require('path')
const MC_SERVER_PATH = path.join(__dirname, 'server')
const MC_SERVER_JAR = path.join(__dirname, 'server.jar')
const testedVersions = require('./tested_versions.json')

for (const version of testedVersions) {
  describe(`server_session ${version}`, function () {
    this.timeout(10 * 60 * 1000)
    before((done) => {
      downloadServer(version, MC_SERVER_JAR, err => {
        if (err) return done(err)
        done()
      })
    })

    it('start and stop the server', function (done) {
      const vServer = new WrapServer(MC_SERVER_JAR, MC_SERVER_PATH)

      vServer.on('line', function (line) {
        console.log(line)
      })

      vServer.startServer({ 'server-port': 25569 },
        function (err) {
          if (err) {
            console.log(err)
            done(err)
            return
          }
          console.log('Server Started !')

          setTimeout(function () {
            vServer.stopServer(function (err) {
              if (err) {
                console.log(err)
                done(err)
                return
              }
              console.log('Server Stopped !')

              vServer.deleteServerData(function (err) {
                if (err) {
                  console.log(err)
                  done(err)
                  return
                }
                console.log('Server data deleted !')
                done()
              })
            })
          }, 3000)
        })
    })
  })
}
