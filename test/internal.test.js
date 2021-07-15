/* eslint-env mocha */
const path = require('path')
const assert = require('assert')
const fs = require('fs/promises')
const fsO = require('fs')
const { LauncherDownload } = require('minecraft-wrap')

let totalTestFiles = 0
describe('internal', function () {
  this.timeout(10_000)
  before(async () => { totalTestFiles = await (await fs.readdir(__dirname)).length })
  afterEach(async () => {
    assert(await (await fs.readdir(__dirname)).length === totalTestFiles, `test directory should have one file, instead has ${await (await fs.readdir(__dirname)).length} files`)
  })

  it('etag download + hashing works', async () => {
    const download = require('../lib/etag_download')
    const filePath = path.resolve(__dirname, '1.10.json')
    await download('https://launchermeta.mojang.com/v1/packages/1548866cad074c15272ed916d04f35e34d81fb2d/1.10.json', filePath)
    assert(fsO.existsSync(filePath), 'file does not exist')
    await fs.rm(filePath, { force: true })
  })

  it('can get versionlists', async () => {
    const download = new LauncherDownload(path.join(__dirname, 'data'))
    const data = await download.getVersionInfos('1.10')
    assert(data.assets === '1.10')
    assert(data.assetIndex.id === '1.10')
    await fs.rm(path.join(__dirname, 'data'), { recursive: true })
  })

  it('can download a server jar', async function () {
    this.timeout(4000)
    const download = new LauncherDownload(__dirname)
    await download.getServer('1.12.2', path.join(__dirname, 'server.jar'))
    assert(fsO.existsSync(path.join(__dirname, 'server.jar')), 'file does not exist')
    await fs.rm(path.join(__dirname, 'server.jar'), { recursive: true })
    await fs.rm(path.join(__dirname, 'versions'), { recursive: true })
  })

  it('can download a client jar', async function () {
    this.timeout(4000)
    const download = new LauncherDownload(__dirname)
    await download.getClient('1.12.2', path.join(__dirname, 'client.jar'))
    assert(fsO.existsSync(path.join(__dirname, 'client.jar')), 'file does not exist')
    await fs.rm(path.join(__dirname, 'client.jar'), { recursive: true })
    await fs.rm(path.join(__dirname, 'versions'), { recursive: true })
  })

  it('can get assetsindex', async () => {
    const download = new LauncherDownload(path.join(__dirname, 'data'))
    const data = await download.getAssetsIndex('1.10')
    const { hash, size } = getFirstItemInObject(data.objects)
    assert(hash && size, 'hash and size are not defined')
    await fs.rm(path.join(__dirname, 'data'), { recursive: true })
  })

  it('can get assets', async () => {
    const version = '1.14.4'
    const download = new LauncherDownload(__dirname)
    const data = await download.getAssetsIndex(version)
    const name = getFirstKey(data.objects)
    await download.getAsset(name, version)
    const { hash } = data.objects[name]
    const subPath = hash.substring(0, 2) + '/' + hash
    assert(fsO.existsSync(path.join(__dirname, 'assets', 'objects', subPath)), "asset didn't download correctly")
    await fs.rm(path.join(__dirname, 'versions'), { recursive: true })
    await fs.rm(path.join(__dirname, 'assets'), { recursive: true })
  })

  it.skip('can get all assets', async function () {
    this.timeout(5 * 60 * 1000)
    const version = '1.15.2'
    const download = new LauncherDownload(__dirname)
    const paths = await download.getAllAssets(version)
    assert(paths.length > 2000, 'not enough assets downloaded')
    await fs.rm(path.join(__dirname, 'versions'), { recursive: true })
    await fs.rm(path.join(__dirname, 'assets'), { recursive: true })
  })

  it('can get all libraries', async function () {
    this.timeout(5 * 1000)
    const dl = new LauncherDownload(__dirname)
    const filePaths = await dl.getLibraries('1.15.2')
    const allFilesExist = !(filePaths.map(fileName => fsO.existsSync(fileName)).some(o => o === false))
    assert(allFilesExist, 'not all files downloaded')
    await fs.rm(path.join(__dirname, 'libraries'), { force: true, recursive: true })
    await fs.rm(path.join(__dirname, 'versions'), { force: true, recursive: true })
  })
})

const getFirstKey = obj => Object.keys(obj)[0]
const getFirstItemInObject = obj => obj[getFirstKey(obj)]
