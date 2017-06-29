const rp = require('request-promise');
const rq = require('request');
const fs = require('mz/fs');
const crypto = require('mz/crypto');
const assert = require('assert');
const debug = require('debug')('minecraft-wrap');
const promisify = require("es6-promisify");
const mkdirp = promisify(require('mkdirp'));
const etagDownload = promisify(require('./etag_download'));
const Queue=require('promise-queue');

// http://wiki.vg/Game_files

const queue=new Queue(10,Infinity);

class LauncherDownload
{
  // linux,osx or windows
  constructor(mcPath,os="linux") {
    this.mcPath=mcPath;
    this.os=os;
    this.versionsInfos={};
    this.assetIndexes={};
  }

  getWholeClient(version) {
    return Promise.all([
      this.getClient(version),
      this.getAllAssets(version),
      this.getLibraries(version)
    ]).then(([client,assets,libraries]) => (
      {client,assets,libraries}));
  }

  getVersionsList() {
    if(this.versionsList)
      return Promise.resolve(this.versionsList);
    return rp('https://launchermeta.mojang.com/mc/game/version_manifest.json').then((text) => {
      this.versionsList=JSON.parse(text);
      return this.versionsList;
    });
  }

  getVersionInfos(version) {
    if(this.versionsInfos[version])
      return Promise.resolve(this.versionsInfos[version]);
    return this.getVersionsList()
      .then(versionsList => {
        const versionInfos=versionsList.versions.find(({id}) => id===version);
        const versionUrl=versionInfos['url'];
        return etagDownload(versionUrl,this.mcPath+"/versions/"+version+"/"+version+".json")
      })
      .then(path => fs.readFile(path,"utf8"))
      .then(data => {
        const parsed=JSON.parse(data);
        this.versionsInfos[version]=parsed;
        return parsed;
      });
  }

  getAssetIndex(version) {
    if(this.assetIndexes[version])
      return Promise.resolve(this.assetIndexes[version]);
    return this.getVersionInfos(version)
      .then(versionInfo => {
        const {url,size,sha1}=versionInfo["assetIndex"];
        return downloadFile(url,this.mcPath+"/assets/indexes/"+version+".json",size,sha1)

      })
      .then(path => fs.readFile(path,"utf8"))
      .then(data => {
        const parsed=JSON.parse(data);
        this.assetIndexes[version]=parsed;
        return parsed;
      });
  }

  getAllAssets(version) {
    return this.getAssetIndex(version).then(assetIndex => {
      return Promise.all(Object.keys(assetIndex['objects'])
        .map(assetFile => this.getAsset(assetFile,version)))});
  }

  getAsset(assetFile,version) {
    return this.getAssetIndex(version).then(assetIndex => {
      const {hash:sha1,size}=assetIndex['objects'][assetFile];
      const subPath=sha1.substring(0,2)+'/'+sha1;
      const url='http://resources.download.minecraft.net/'+subPath;
      return downloadFile(url,this.mcPath+"/assets/objects/"+subPath,size,sha1);
    });
  }

  getClient(version) {
    return this.getVersionInfos(version)
      .then(versionInfo => {
        const {url,size,sha1}=versionInfo["downloads"]["client"];
        return downloadFile(url,this.mcPath+"/versions/"+version+"/"+version+".jar",size,sha1);
      });
  }

  getServer(version) {
    return this.getVersionInfos(version)
    .then(versionInfo => {
      const {url, size, sha1} = versionInfo["downloads"]["server"];
      return downloadFile(url, this.mcPath + "/servers/" + version + "/" + version + ".jar", size, sha1);
    });
  }

  getLibraries(version) {
    return this.getVersionInfos(version)
      .then(versionInfo => {
        return Promise.all(versionInfo["libraries"].map(lib => {
          const artifact=lib['downloads']['artifact'] ?
            lib['downloads']['artifact'] :
            lib['downloads']['classifiers']["natives-"+this.os];

          const {url, path, size, sha1} = artifact;
          return downloadFile(url, this.mcPath + "/libraries/" + path, size, sha1)
        }));
      });
  }
}


function downloadFile(url,path,size,sha1) {
  assert.notEqual(url,undefined);
  return checkFile(path,size,sha1)
    .catch(err => {
      debug(err);
      const parts=path.split("/");
      parts.pop();
      const dirPath=parts.join("/");
      return mkdirp(dirPath)
        .then(() => {

        return queue.add(() => new Promise((resolve,reject) => {
          rq(url)
            .pipe(fs.createWriteStream(path))
            .on('finish', () => resolve(path))
            .on('error', err => reject(err))
        }))
      })
        .then(() => checkFile(path,size,sha1));
    })
}

function checkFile(path,size,sha1) {
  return fs.stat(path).then(stats => assert.equal(stats.size,size,"wrong size"))
    .then(() => fs.readFile(path))
    .then(data => assert.equal(crypto.createHash('sha1').update(data).digest('hex'),sha1,"wrong sha1"))
    .then(() => path);
}

module.exports=LauncherDownload;