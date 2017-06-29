const https = require('https');
const fs = require('fs');
const md5File=require("md5-file");
const mkdirp = require('mkdirp');

module.exports=download;

function download(url,filename,done)
{
  https.get(url, function(response) {
    if(response.statusCode===200) {
      checkSum(filename,response.headers.etag,function(err,alreadyThere){
        if(!alreadyThere) {
          const parts=filename.split("/");
          parts.pop();
          const dirPath=parts.join("/");
          return mkdirp(dirPath, (err) => {
            if(err) {
              return done(err);
            }
            const file = fs.createWriteStream(filename);
            response.pipe(file);
            response.on('end', function() {
              checkSum(filename,response.headers.etag,function(err,correct){
                if(!correct)
                  done(new Error("download failed : wrong or partial file downloaded "+url+" "+filename));
                else
                  done(null,filename);
              });
            });
          });
        }
        else
          done(null,filename);
      });
    }
    else
      done(new Error("download failed : server responds with status "+response.statusCode+" "+url+" "+filename));
  });
}

function checkSum(filename,etag,done)
{
  md5File(filename,function(err,sum){
    const expectedSum=etag.substr(1,etag.length-2);
    done(null,!(err || expectedSum!==sum));
  });
}