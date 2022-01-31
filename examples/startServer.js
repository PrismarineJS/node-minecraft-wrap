#!/usr/bin/env node
const { startServer } = require('../')

const [,, version, port, online, path] = process.argv

if (!version) {
  console.error('startServer <version> [port] [online] [path]')
  process.exit(1)
}

const opt = { 'online-mode': Boolean(online), path: path || undefined }

startServer(version, port || 25565, opt).then(p => {
  process.stdin.pipe(p.mcServer.stdin)
})
