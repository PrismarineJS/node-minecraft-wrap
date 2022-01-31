#!/usr/bin/env node
const { startServer } = require('../')

const [,, version, port, online, path] = process.argv

console.log(process.argv)

if (!version) {
  console.error('startServer <version> [port] [online] [path]')
  process.exit(1)
}

const opt = {
  version,
  port: parseInt(port, 10) || 25565,
  online,
  path
}

console.log(opt)

startServer(opt.version, port, { 'online-mode': Boolean(opt.online), path: opt.path ? opt.path : undefined }).then(p => {
  process.stdin.pipe(p.mcServer.stdin)
})
