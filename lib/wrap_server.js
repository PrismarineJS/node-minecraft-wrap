const path = require('path')
const fs = require('mz/fs')
const promisify = require('es6-promisify')
const mkdirp = promisify(require('mkdirp'))
const spawn = require('child_process').spawn
const rimraf = require('rimraf')
const EventEmitter = require('events').EventEmitter

const defaultServerProps = {
  'generator-settings': '',
  'op-permission-level': '4',
  'allow-nether': 'true',
  'level-name': 'world',
  'enable-query': 'false',
  'allow-flight': 'false',
  'announce-player-achievements': true,
  'server-port': '25565',
  'level-type': 'DEFAULT',
  'enable-rcon': 'false',
  'force-gamemode': 'false',
  'level-seed': '',
  'server-ip': '',
  'max-build-height': '256',
  'spawn-npcs': 'true',
  'white-list': 'false',
  'spawn-animals': 'true',
  hardcore: 'false',
  'snooper-enabled': 'true',
  'online-mode': 'true',
  'resource-pack': '',
  pvp: 'true',
  difficulty: '1',
  'enable-command-block': 'false',
  gamemode: '0',
  'player-idle-timeout': '0',
  'max-players': '20',
  'spawn-monsters': 'true',
  'generate-structures': 'true',
  'view-distance': '10',
  'spawn-protection': '16',
  motd: 'A Minecraft Server',
  'use-native-transport': 'false'
}

const TOO_OLD_JAVA_REGEX = /has been compiled by a more recent version of the Java Runtime \(class file version (\d+\.\d+)\), this version of the Java Runtime only recognizes class file versions up to (\d+\.\d+)/

class WrapServer extends EventEmitter {
  constructor (MC_SERVER_JAR, MC_SERVER_PATH, OPTIONS) {
    super()
    this.MC_SERVER_JAR = MC_SERVER_JAR
    this.MC_SERVER_PATH = MC_SERVER_PATH
    this.OPTIONS = {
      minMem: (OPTIONS && OPTIONS.minMem) ? OPTIONS.minMem : '1024',
      maxMem: (OPTIONS && OPTIONS.maxMem) ? OPTIONS.maxMem : '1024',
      doneRegex: (OPTIONS && OPTIONS.doneRegex) ? OPTIONS.doneRegex : /\[.+\]: Done/,
      noOverride: OPTIONS && OPTIONS.noOverride,
      javaPath: OPTIONS && OPTIONS.javaPath
    }
  }

  stopServer (done) {
    if (!this.mcServer) {
      done()
      return
    }
    this.mcServer.stdin.write('stop\n')
    const timeoutHandle = setTimeout(() => {
      console.warn('Server shutdown took to long. Killing process.')
      this.mcServer.kill()
    }, 10000)
    this.mcServer.on('close', () => {
      this.mcServer = null
      clearTimeout(timeoutHandle)
      done()
    })
  }

  writeServer (line) {
    this.mcServer.stdin.write(line)
  }

  deleteServerData (done) {
    rimraf(this.MC_SERVER_PATH, done)
  }

  startServer (propOverrides, done) {
    const props = {}
    Object.keys(defaultServerProps).forEach(prop => { props[prop] = defaultServerProps[prop] })
    Object.keys(propOverrides).forEach(prop => { props[prop] = propOverrides[prop] })

    mkdirp(this.MC_SERVER_PATH)
      .then(() => this.OPTIONS.noOverride
        ? Promise.resolve()
        : Promise.all([
          fs.writeFile(path.join(this.MC_SERVER_PATH, 'server.properties'),
            Object.keys(props).map(prop => prop + '=' + props[prop] + '\n').join('')),
          fs.writeFile(path.join(this.MC_SERVER_PATH, 'eula.txt'), 'eula=true'),
          fs.writeFile(path.join(this.MC_SERVER_PATH, 'banned-players.json'), '[]'),
          fs.writeFile(path.join(this.MC_SERVER_PATH, 'banned-ips.json'), '[]'),
          fs.writeFile(path.join(this.MC_SERVER_PATH, 'ops.json'), '[]'),
          fs.writeFile(path.join(this.MC_SERVER_PATH, 'whitelist.json'), '[]')
        ]))
      .then(() => {
        return fs.exists(this.MC_SERVER_JAR).then(exists => {
          if (!exists) { throw new Error('The file ' + this.MC_SERVER_JAR + " doesn't exist.") }
        })
      })
      .then(() => new Promise((resolve, reject) => {
        this.mcServer = spawn(this.OPTIONS.javaPath ?? 'java', [
          '-jar',
          '-Xms' + this.OPTIONS.minMem + 'M',
          '-Xmx' + this.OPTIONS.maxMem + 'M',
          this.MC_SERVER_JAR,
          'nogui'
        ], {
          stdio: 'pipe',
          detached: false,
          cwd: this.MC_SERVER_PATH
        })
        this.mcServer.stdin.setEncoding('utf8')
        this.mcServer.stdout.setEncoding('utf8')
        this.mcServer.stderr.setEncoding('utf8')
        let buffer = ''
        this.mcServer.stdout.on('data', onData)
        this.mcServer.stderr.on('data', onData)

        const self = this
        function onData (data) {
          buffer += data
          const lines = buffer.split('\n')
          const len = lines.length - 1
          for (let i = 0; i < len; ++i) {
            self.mcServer.emit('line', lines[i])
          }
          buffer = lines[lines.length - 1]
        }

        this.mcServer.on('line', onLine)
        this.mcServer.on('line', (line) => {
          this.emit('line', line)
        })
        function onLine (line) {
          const regex = self.OPTIONS.doneRegex

          if (regex.test(line)) {
            self.mcServer.removeListener('line', onLine)
            return resolve()
          } else if (/FAILED TO BIND TO PORT/.test(line)) {
            return reject(new Error('failed to bind to port'))
          } else if (TOO_OLD_JAVA_REGEX.test(line)) {
            const matches = line.match(TOO_OLD_JAVA_REGEX)
            return reject(new Error(`Java too old, have java for class files version ${matches[1]}, need java for class files version ${matches[2]}`))
          }
        }
      }))
      .then(() => done())
      .catch(err => done(err))
  }
}

module.exports = WrapServer
