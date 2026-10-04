/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { unzip } = require('../lib/bedrock_download')

// Minimal public-domain bit-by-bit CRC32, used only to build fixture zips below.
function crc32 (buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1))
    }
  }
  return (~crc) >>> 0
}

// Builds a minimal valid "store" (uncompressed) zip by hand, so entry names end up
// exactly as given on disk. AdmZip's own addFile() normalizes names on write (the
// same zipnamefix/canonical logic used on read), so it can't produce a fixture
// containing a raw, attacker-style traversal entry name — these bytes simulate what
// a real malicious archive looks like on the wire.
function buildZip (entries) {
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8')
    const crc = crc32(data)
    const size = data.length

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4) // version needed
    localHeader.writeUInt16LE(0, 6) // flags
    localHeader.writeUInt16LE(0, 8) // method: store
    localHeader.writeUInt16LE(0, 10) // mod time
    localHeader.writeUInt16LE(0, 12) // mod date
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(size, 18) // compressed size
    localHeader.writeUInt32LE(size, 22) // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26)
    localHeader.writeUInt16LE(0, 28) // extra field length

    localParts.push(localHeader, nameBuf, data)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4) // version made by
    centralHeader.writeUInt16LE(20, 6) // version needed
    centralHeader.writeUInt16LE(0, 8) // flags
    centralHeader.writeUInt16LE(0, 10) // method
    centralHeader.writeUInt16LE(0, 12) // mod time
    centralHeader.writeUInt16LE(0, 14) // mod date
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(size, 20) // compressed size
    centralHeader.writeUInt32LE(size, 24) // uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28)
    centralHeader.writeUInt16LE(0, 30) // extra field length
    centralHeader.writeUInt16LE(0, 32) // comment length
    centralHeader.writeUInt16LE(0, 34) // disk number start
    centralHeader.writeUInt16LE(0, 36) // internal attributes
    centralHeader.writeUInt32LE((0o100644 << 16) >>> 0, 38) // external attributes (unix regular file)
    centralHeader.writeUInt32LE(offset, 42) // relative offset of local header

    centralParts.push(centralHeader, nameBuf)

    offset += localHeader.length + nameBuf.length + data.length
  }

  const centralDirStart = offset
  const centralDirBuf = Buffer.concat(centralParts)

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4) // disk number
  eocd.writeUInt16LE(0, 6) // disk with central dir
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralDirBuf.length, 12)
  eocd.writeUInt32LE(centralDirStart, 16)
  eocd.writeUInt16LE(0, 20) // comment length

  return Buffer.concat([...localParts, centralDirBuf, eocd])
}

describe('bedrock_download unzip (zip-slip regression)', function () {
  let tmpRoot
  let extractDir

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mcwrap-unzip-'))
    extractDir = path.join(tmpRoot, 'extract')
    fs.mkdirSync(extractDir)
  })

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  })

  function writeZip (entries) {
    const zipPath = path.join(tmpRoot, 'test.zip')
    fs.writeFileSync(zipPath, buildZip(entries))
    return zipPath
  }

  it('does not let a ../../ entry escape the extraction directory', () => {
    const marker = `outside-marker-${Date.now()}.txt`
    const zipPath = writeZip([{ name: `../../${marker}`, data: Buffer.from('pwned') }])

    // Either rejecting the archive outright or sanitizing the path is an acceptable
    // safe outcome - the only thing that must never happen is escaping extractDir.
    try {
      unzip(zipPath, extractDir)
    } catch { }

    assert.strictEqual(fs.existsSync(path.join(tmpRoot, marker)), false)
    assert.strictEqual(fs.existsSync(path.join(path.dirname(tmpRoot), marker)), false)
  })

  it('does not let a Windows-style ..\\..\\ entry escape the extraction directory', () => {
    const marker = `outside-marker-win-${Date.now()}.txt`
    const zipPath = writeZip([{ name: `..\\..\\${marker}`, data: Buffer.from('pwned') }])

    try {
      unzip(zipPath, extractDir)
    } catch { }

    assert.strictEqual(fs.existsSync(path.join(tmpRoot, marker)), false)
    assert.strictEqual(fs.existsSync(path.join(path.dirname(tmpRoot), marker)), false)
  })

  it('still extracts a legitimate filename containing ".." with no path traversal', () => {
    const content = 'totally legitimate content'
    const zipPath = writeZip([{ name: 'file..txt', data: Buffer.from(content) }])

    unzip(zipPath, extractDir)

    const extracted = path.join(extractDir, 'file..txt')
    assert.strictEqual(fs.existsSync(extracted), true)
    assert.strictEqual(fs.readFileSync(extracted, 'utf8'), content)
  })
})
