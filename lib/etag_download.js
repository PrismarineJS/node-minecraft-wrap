const https = require('https');
const fs = require('fs');
const md5File=require("md5-file");
const mkdirp = require('mkdirp');

module.exports=download;

const pathsPromises={};

function download(url,filename,done)
{
  if(pathsPromises[filename]) {
    pathsPromises[filename].then((r) => done(null,r)).catch(err => done(err));
    return;
  }

  const p=new Promise((resolve,reject) => {
    https.get(url, function(response) {
      if(response.statusCode===200) {
        checkSum(filename,response.headers.etag,function(err,alreadyThere){
          if(!alreadyThere) {
            const parts=filename.split("/");
            parts.pop();
            const dirPath=parts.join("/");
            return mkdirp(dirPath, (err) => {
              if(err) {
                return reject(err);
              }
              const file = fs.createWriteStream(filename);
              response.pipe(file)
                .on('close', function() {
                  checkSum(filename,response.headers.etag,function(err,correct){
                    if(!correct)
                      reject(new Error("download failed : wrong or partial file downloaded "+url+" "+filename));
                    else
                      resolve(filename);
                  });
                });
            });
          }
          else
            resolve(filename);
        });
      }
      else
        reject(new Error("download failed : server responds with status "+response.statusCode+" "+url+" "+filename));
    });
  });
  pathsPromises[filename]=p;
  p.then((r) => done(null,r)).catch(err => done(err));
}

function checkSum(filename,etag,done)
{
  md5File(filename,function(err,sum){
    const expectedSum=etag.substr(1,etag.length-2);
    done(null,!(err || expectedSum!==sum));
  });
}