const promisify = require('util').promisify
const WrapServer = require('./wrap_server')
const downloadServer = promisify(require('./download').downloadServer)
const path = require('path')
const debug = require('debug')('minecraft-wrap')

async function startServer (version, port = 25569, serverProperties = {}) {
  const MC_SERVER_PATH = path.join(__dirname, `../versions/server_${version}`)
  const MC_SERVER_JAR = path.join(__dirname, `../versions/server_${version}.jar`)

  await downloadServer(version, MC_SERVER_JAR)

  const vServer = new WrapServer(MC_SERVER_JAR, MC_SERVER_PATH)

  vServer.on('line', function (line) {
    debug(line)
  })

  const settings = {
    'online-mode': 'false',
    'server-port': port,
    'view-distance': 2,
    'level-type': 'flat',
    ...serverProperties
  }

  await new Promise(resolve => vServer.startServer(settings, resolve))

  vServer.stop = async () => new Promise((resolve, reject) => vServer.stopServer(reject, resolve))

  return vServer
}

async function collectPackets (nmp, version, names = [], cb, { timeout = 9000, port = 25569 } = {}) {
  const collected = []
  console.log('🔻 Downloading server', version)
  const server = await startServer(version, port)
  console.log('Started server')

  const client = nmp.createClient({
    version: version,
    host: 'localhost',
    port,
    username: 'test' + (Date.now() & 0xffff)
  })

  let clientConnected = false

  client.on('connect', () => {
    console.log('Client connected')
    clientConnected = true
  })

  for (const name of names) {
    client.on(name, (packet) => {
      cb(name, packet)
      collected.push(packet)
    })
  }

  client.on('packet', (data, { name }) => debug('[client] -> ', name))

  let didQuit = false
  function finish () {
    if (didQuit) return
    didQuit = true
    console.log('Stopping server')
    server.stop()
    client.end()
    if (!clientConnected) {
      throw new Error('Client never connected')
    }
  }

  setTimeout(finish, timeout)
  server.finish = finish
  return server
}

module.exports = { startServer, collectPackets }
