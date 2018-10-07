const wrap = require('../')
const path = require('path')

if (process.argv.length !== 4) {
  console.log('Usage : node exampleWrapServer.js <jar_file> <server_dir>')
  process.exit(0)
}

const jarFile = path.isAbsolute(process.argv[2]) ? process.argv[2] : path.join(process.cwd(), process.argv[2])
const serverDir = path.isAbsolute(process.argv[3]) ? process.argv[3] : path.join(process.cwd(), process.argv[3])

const vServer = new wrap.WrapServer(jarFile, serverDir)

vServer.on('line', function (line) {
  console.log(line)
})

vServer.startServer({
  motd: 'test1234',
  'max-players': 120
}, function (err) {
  if (err) {
    console.log(err)
    return
  }
  console.log('Server Started !')

  setTimeout(function () {
    vServer.stopServer(function (err) {
      if (err) {
        console.log(err)
        return
      }
      console.log('Server Stopped !')

      vServer.deleteServerData(function (err) {
        if (err) {
          console.log(err)
          return
        }
        console.log('Server data deleted !')
      })
    })
  }, 3000)
})

process.on('exit', () => {
  vServer.stopServer()
})
