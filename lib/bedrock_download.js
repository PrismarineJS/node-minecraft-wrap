const fs = require('fs')
const fetch = require('node-fetch')
const Zip = require('adm-zip')
const path = require('path')
const stream = require('stream')
const util = require('util')
const pipeline = util.promisify(stream.pipeline)
const cp = require('child_process')
const https = require('https')
const head = (url) => new Promise((resolve, reject) => https.request(url, { method: 'HEAD' }, resolve).on('error', reject).end())

/**
 * extract a file
 * @param {string} input
 * @param {string} output
 * @param {boolean} overwrite
 * @returns {Promise<void>}
 */
function unzip (input, output = path.resolve('.'), overwrite = false) {
  return new Zip(input).extractAllTo(output)
}
/**
 * download a file
 * @param {string} url
 * @param {string} output
 * @returns {Promise<void>}
 */
async function downloadFile (url, output) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`unexpected response ${response.statusText}`)
  return await pipeline(response.body, fs.createWriteStream(output))
}

async function downloadServer (os, version, outputPath = 'bds-', suffixVersion = false) {
  process.chdir(process.cwd())
  const verStr = version.split('.').slice(0, 3).join('.')
  const dir = outputPath + (suffixVersion ? version : '')

  if (fs.existsSync(dir) && fs.readdirSync(dir).length) {
    process.chdir(outputPath + (suffixVersion ? version : '')) // Enter server folder
    return verStr
  }
  try { fs.mkdirSync(dir) } catch { }

  process.chdir(outputPath + (suffixVersion ? version : '')) // Enter server folder
  const url = (os, version) => `https://minecraft.azureedge.net/bin-${os}/bedrock-server-${version}.zip`

  let foundUrl = false

  for (let i = 0; i < 8; i++) { // Check for the latest server build for version (major.minor.patch.BUILD)
    const u = url(os, `${verStr}.${String(i).padStart(2, '0')}`)
    console.info('Opening', u)
    const ret = await head(u)
    if (ret.statusCode === 200) {
      foundUrl = u
      console.info('Found server', ret.statusCode)
      break
    }
  }
  if (!foundUrl) throw Error(`did not find server bin for ${os} ${version}`)
  console.info('🔻 Downloading', foundUrl)
  await downloadFile(foundUrl, 'bds.zip')
  console.info('⚡ Unzipping')
  // Unzip server
  unzip('bds.zip')
  if (process.platform === 'linux') cp.execSync('chmod +777 ./bedrock_server')
  return verStr
}

module.exports = { downloadServer }
