const fetch = require('node-fetch')
const { downloadFile } = require('./util')

async function download (url, fileName) { // maybe bad? does two get requests
  const etag = await (await fetch(url)).headers.get('etag')
  return await downloadFile(
    url,
    fileName,
    { expectedHash: etag.substr(1, etag.length - 2), hashType: 'md5' }
  )
}

module.exports = download
