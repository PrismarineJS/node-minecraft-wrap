const fs = require('fs/promises')
const fsO = require('fs')
const path = require('path')
const { EventEmitter, once } = require('events')
const { DEFAULT_SERVER_PROPERTIES } = require('./constants.json')
const { spawn } = require('child_process')

class WrapServer extends EventEmitter {
  constructor (MC_SERVER_JAR, MC_SERVER_PATH, OPTIONS) {
    super()
    this.MC_SERVER_JAR = MC_SERVER_JAR
    this.MC_SERVER_PATH = MC_SERVER_PATH
    this.OPTIONS = {
      minMem: OPTIONS?.minMem ?? '1024',
      maxMem: OPTIONS?.maxMem ?? '1024',
      doneRegex: OPTIONS?.doneRegex ?? /\[.+\]: Done/,
      noOverride: OPTIONS?.noOverride,
      javaPath: OPTIONS?.javaPath
    }
  }

  async startServer (propOverrides) {
    if (!fsO.existsSync(this.MC_SERVER_PATH)) await fs.mkdir(this.MC_SERVER_PATH, { recursive: true })
    const writeToFile = (data, fileName) => fs.writeFile(path.join(this.MC_SERVER_PATH, fileName), data)
    const props = { ...DEFAULT_SERVER_PROPERTIES, ...propOverrides }
    if (!this.OPTIONS.noOverride) {
      const serverProperties = Object.entries(props).map(([key, value]) => `${key}=${value}`).join('\n')
      await Promise.all([
        writeToFile(serverProperties, 'server.properties'),
        writeToFile('eula=true', 'eula.txt'),
        writeToFile('[]', 'banned-players.json'),
        writeToFile('[]', 'banned-ips.json'),
        writeToFile('[]', 'ops.json'),
        writeToFile('[]', 'whitelist.json')
      ])
    }
    if (!fsO.existsSync(this.MC_SERVER_JAR)) throw new Error(`${this.MC_SERVER_JAR} does not exist`)
    await new Promise((resolve, reject) => {
      this.mcServer = spawn(this.OPTIONS.javaPath ?? 'java', [
        '-Xms' + this.OPTIONS.minMem + 'M',
        '-Xmx' + this.OPTIONS.maxMem + 'M',
        '-jar',
        this.MC_SERVER_JAR,
        'nogui'
      ],
      {
        stdio: 'pipe',
        detached: false,
        cwd: this.MC_SERVER_PATH
      })
      this.mcServer.stdin.setEncoding('utf8')
      this.mcServer.stdout.setEncoding('utf8')
      this.mcServer.stderr.setEncoding('utf8')
      ;['stdout', 'stderr'].forEach(type => this.mcServer[type].on('data', data => this.mcServer.emit('line', data)))
      this.mcServer.on('line', data => this.emit('line', data.toString().replace('\n', '')))

      const startListener = (line) => {
        if (this.OPTIONS.doneRegex.test(line)) {
          this.mcServer.off('line', startListener)
          resolve()
        } else if (/FAILED TO BIND TO PORT/.test(line)) {
          reject(new Error('failed to bind to port'))
        }
      }
      this.mcServer.on('line', startListener)
    })
  }

  async stopServer () {
    if (!this.mcServer) return
    this.writeServer('stop\n')
    await once(this.mcServer, 'close')
    this.mcServer = null
  }

  writeServer (line) {
    this.mcServer.stdin.write(line)
  }

  deleteServerData () {
    return fs.rm(this.MC_SERVER_PATH, { recursive: true })
  }
}

module.exports = WrapServer
