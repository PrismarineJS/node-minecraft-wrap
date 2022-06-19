const EventEmitter = require('events').EventEmitter
const LauncherDownload = require('./launcher_download')
const spawn = require('child_process').spawn
const ygg = require('yggdrasil')()
const promisify = require('es6-promisify')
const auth = promisify(ygg.auth.bind(ygg))
const refresh = promisify(ygg.refresh.bind(ygg), { multiArgs: true })
const validate = promisify(ygg.validate.bind(ygg))
const fs = require('mz/fs')
const debug = require('debug')('minecraft-wrap')
const mcDefaultFolderPath = require('minecraft-folder-path')
const mkdirp = promisify(require('mkdirp'))

class WrapClient extends EventEmitter {
  constructor (clientPath, version, maxMem = 1024, doneRegex = /\[.+\]: Narrator library successfully loaded/) {
    super()
    this.clientPath = clientPath || mcDefaultFolderPath
    this.maxMem = maxMem
    this.doneRegex = doneRegex
    this.version = version
    this.launcher = new LauncherDownload(this.clientPath)
  }

  prepare () {
    return this.launcher.getWholeClient(this.version).then(({ client, libraries, nativesPath }) => {
      this.minecraftJar = client
      this.libraries = libraries
      this.nativesPath = nativesPath
      return this.launcher.getVersionInfos(this.version)
    }).then(versionInfo => {
      this.mainClass = versionInfo.mainClass
      this.minecraftArguments = versionInfo.minecraftArguments
    })
  }

  auth (username, password) {
    const doAuth = (auths) => {
      const updateProfile = (name) => {
        if (!auths.profiles) { auths.profiles = {} }
        auths.profiles[name] = {
          name,
          lastVersionId: this.version,
          allowedReleaseTypes: [
            'release',
            'snapshot'
          ]
        }
        auths.selectedProfile = name
      }

      let k
      if (!username && auths.selectedUser) { k = auths.selectedUser } else {
        k = Object.keys(auths.authenticationDatabase).filter(kuuid => auths.authenticationDatabase[kuuid].username === username)
        k = k.length === 0 ? null : k[0]
      }

      if (!this.version && auths.selectedProfile) {
        this.version = auths.profiles[auths.selectedProfile].lastVersionId
      }

      const initialAuth = () => {
        debug('initial auth', auths.clientToken ? auths.clientToken.replace(/-/g, '') : null, username, password)
        return auth({
          token: auths.clientToken ? auths.clientToken.replace(/-/g, '') : null,
          user: username,
          pass: password,
          requestUser: true
        })
          .then((data) => {
            const { accessToken, clientToken, selectedProfile: { id: wuuid, name: displayName }, user: { id: userid, properties: userProperties } } = data
            auths.clientToken = clientToken.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5')
            const session = {
              displayName,
              userProperties,
              accessToken,
              userid,
              uuid: wuuid.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5'),
              username
            }
            auths.authenticationDatabase[wuuid] = session
            auths.selectedUser = wuuid
            updateProfile(displayName)
            this.setAuthInfo(session.displayName, wuuid, session.accessToken, session.userProperties)
            return fs.writeFile(this.clientPath + '/launcher_profiles.json', JSON.stringify(auths, null, 2))
          })
      }

      if (k === null) {
        return initialAuth()
      } else {
        const session = auths.authenticationDatabase[k]
        auths.selectedUser = k
        updateProfile(session.displayName)
        debug('validating auth', k, 'with token', session.accessToken)

        return validate(session.accessToken)
          .then(() => {
            this.setAuthInfo(session.displayName, k, session.accessToken, session.userProperties)
            return fs.writeFile(this.clientPath + '/launcher_profiles.json', JSON.stringify(auths, null, 2))
          })
          .catch(() => {
            debug('refreshing auth', session.accessToken, auths.clientToken.replace(/-/g, ''))
            return refresh(session.accessToken, auths.clientToken.replace(/-/g, '')).then(([accessToken, data]) => {
              if (accessToken === null) { return initialAuth() }
              session.accessToken = accessToken
              this.setAuthInfo(session.displayName, k, session.accessToken, session.userProperties)
              return fs.writeFile(this.clientPath + '/launcher_profiles.json', JSON.stringify(auths, null, 2))
            }).catch((err) => {
              debug('refreshing auth failed', err)
              return initialAuth()
            })
          })
      }
    }

    return fs.readFile(this.clientPath + '/launcher_profiles.json', 'utf8')
      .then(data => JSON.parse(data))
      .catch(() => mkdirp(this.clientPath).then(() => ({ authenticationDatabase: {} })))
      .then(auths => doAuth(auths))
  }

  setAuthInfo (playerName, uuid, accessToken, userProperties) {
    this.auth_player_name = playerName
    this.auth_uuid = uuid
    this.auth_access_token = accessToken
    this.userProperties = userProperties
    debug('auth info set to', this.auth_player_name, this.auth_uuid, this.auth_access_token, this.userProperties)
  }

  start () {
    return new Promise((resolve) => {
      const java = 'java'
      const maxRam = this.maxMem
      const maxNewSize = '128'
      const nativeLibraryPath = this.nativesPath
      const allLibrariesJar = this.libraries.join(':')
      const minecraftJar = this.minecraftJar
      const mainClass = this.mainClass

      /* eslint-disable no-unused-vars */
      /* eslint-disable camelcase */
      const auth_player_name = this.auth_player_name
      const version_name = this.version
      const game_directory = this.clientPath
      const assets_root = this.clientPath + '/assets'
      const assets_index_name = this.version
      const auth_uuid = this.auth_uuid
      const auth_access_token = this.auth_access_token
      const user_type = 'legacy'
      const version_type = 'release'
      // <= 1.8
      const user_properties = this.userProperties ? JSON.stringify(this.userProperties) : '{}'
      // <= 1.6
      const game_assets = assets_root
      const auth_session = auth_access_token
      /* eslint-enable no-unused-vars */
      /* eslint-enable camelcase */

      const args = [
        '-Xmx' + maxRam + 'M',
        '-XX:+UseConcMarkSweepGC',
        '-XX:+CMSIncrementalMode',
        '-XX:-UseAdaptiveSizePolicy',
        '-Xmn' + maxNewSize + 'M',
        '-Djava.library.path=' + nativeLibraryPath,
        '-cp',
        [allLibrariesJar, minecraftJar].join(':'),
        mainClass
      ]
      eval('`' + this.minecraftArguments + '`').split(' ').forEach(arg => args.push(arg)) // eslint-disable-line no-eval
      debug(args)
      debug(this.minecraftArguments)

      this.client = spawn(java, args, {
        stdio: 'pipe',
        cwd: this.clientPath + '/..'
      })
      this.client.stdin.setEncoding('utf8')
      this.client.stdout.setEncoding('utf8')
      this.client.stderr.setEncoding('utf8')
      let buffer = ''
      this.client.stdout.on('data', onData)
      this.client.stderr.on('data', onData)

      const self = this
      function onData (data) {
        buffer += data
        const lines = buffer.split('\n')
        const len = lines.length - 1
        for (let i = 0; i < len; ++i) {
          self.client.emit('line', lines[i])
        }
        buffer = lines[lines.length - 1]
      }

      this.client.on('line', onLine)
      this.client.on('line', (line) => {
        process.stderr.write('.')
        this.emit('line', line)
      })
      function onLine (line) {
        const regex = self.doneRegex

        if (regex.test(line)) {
          self.client.removeListener('line', onLine)
          return resolve()
        }
      }
    })
  }

  stop () {
    return new Promise((resolve) => {
      if (!this.client) {
        resolve()
        return
      }
      this.client.kill()
      this.client.on('close', () => {
        this.client = null
        resolve()
      })
    })
  }
}

module.exports = WrapClient
