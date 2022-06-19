const https = require('https')
const fs = require('fs')
const md5File = require('md5-file')
const { mkdir } = require('fs').promises

module.exports = download

const pathsPromises = {}

function download (url, filename, done) {
  if (pathsPromises[filename]) {
    pathsPromises[filename].then((r) => done(null, r)).catch(err => done(err))
    return
  }

  // Get etag => try to checksum file already there against etag => miss => do GET. If you get a cache hit, noop.
  const p = new Promise((resolve, reject) => {
    https.get(url, function (response) {
      if (response.statusCode === 200) {
        const etagIsChecksumable = response.headers.server === 'AmazonS3' // s3 puts md5 in etag, others hosts don't
        checkSum(filename, response.headers.etag).then(alreadyDownloaded => {
          if (!alreadyDownloaded) {
            doDownload(filename, response, etagIsChecksumable, url).then((isCorrect) => {
              if (!isCorrect) {
                reject(new Error(`download failed : wrong or partial file downloaded ${url} ${filename}`))
              } else {
                resolve(filename)
              }
            })
          } else {
            resolve(filename)
          }
        })
      } else {
        reject(new Error('download failed : server responds with status ' + response.statusCode + ' ' + url + ' ' + filename))
      }
    })
  })
  pathsPromises[filename] = p
  p.then((r) => done(null, r)).catch(err => done(err))
}

// if shouldChecksum, we will use the etag
async function doDownload (filename, response, shouldChecksum, url) {
  const parts = filename.split('/')
  parts.pop()
  const dirPath = parts.join('/')
  await mkdir(dirPath, { recursive: true })
  const file = fs.createWriteStream(filename)
  return await new Promise((resolve, reject) => {
    response.pipe(file).on('close', () => {
      if (shouldChecksum) {
        checkSum(filename, response.headers.etag).then((isCorrectFile) => {
          if (isCorrectFile) {
            resolve(filename)
          } else {
            reject(new Error('download failed : wrong or partial file downloaded ' + url + ' ' + filename))
          }
        })
      }
      resolve(filename)
    })
  })
}

async function checkSum (filename, etag) {
  return new Promise((resolve, reject) => {
    md5File(filename, function (err, sum) {
      const expectedSum = etag.substr(1, etag.length - 2)
      resolve(!err && expectedSum === sum)
    })
  })
}
