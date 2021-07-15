const fetch = require('node-fetch')
const crypto = require('crypto')
const fs = require('fs')
const pathPromises = {}

async function downloadFile (url, fileName, { expectedSize, expectedHash, hashType } = {}) {
  if (pathPromises[fileName]) return pathPromises[fileName]
  const folderPath = fileName.substring(0, fileName.lastIndexOf('\\') + 1)
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true })
  const res = await fetch(url)
  const fileStream = fs.createWriteStream(fileName)
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream)
    res.body.on('error', reject)
    fileStream.on('close', resolve)
  })
  if (expectedSize === undefined && hashType === undefined) return fileName
  if (expectedSize !== undefined) {
    const currentFileSize = await (await fs.promises.stat(fileName)).size
    if (currentFileSize !== expectedSize) throw new Error('Downloaded file size does not match expected size.')
  }
  if (expectedHash !== undefined) {
    const fileHash = await getHashFromFile(fileName, hashType)
    if (fileHash !== expectedHash) throw new Error(`Downloaded file hash ${fileHash} does not match expected hash ${expectedHash}`)
  }
  return fileName
}

async function getHashFromFile (fileName, hashType) {
  const hash = crypto.createHash(hashType)
  const fileData = await fs.promises.readFile(fileName)
  return hash.update(fileData).digest('hex')
}

module.exports = { downloadFile }
