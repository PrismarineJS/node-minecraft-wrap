/* eslint-env mocha */

const assert = require('assert')
const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const testedVersions = require('./tested_versions.json')

// Enough children to make an unsafe in-place write fail nearly every run
const CHILDREN = 12
const CHILD_SCRIPT = path.join(__dirname, 'fixtures', 'concurrent_download_child.js')

describe('concurrent downloads', function () {
  this.timeout(10 * 60 * 1000)

  it(`${CHILDREN} processes sharing one directory all get valid version infos`, async () => {
    const mcPath = fs.mkdtempSync(path.join(os.tmpdir(), 'minecraft-wrap-test-'))
    const version = testedVersions[testedVersions.length - 1]
    try {
      await Promise.all(Array.from({ length: CHILDREN }, () => new Promise((resolve, reject) => {
        cp.execFile(process.execPath, [CHILD_SCRIPT, mcPath, version], (err, stdout, stderr) => {
          if (err) reject(new Error(stderr.trim() || err.message))
          else resolve()
        })
      })))
      const leftoverTmpFiles = fs.readdirSync(mcPath, { recursive: true }).filter(f => f.endsWith('.tmp'))
      assert.deepStrictEqual(leftoverTmpFiles, [], 'every temp file must be renamed into place or unlinked')
    } finally {
      fs.rmSync(mcPath, { recursive: true, force: true })
    }
  })
})
