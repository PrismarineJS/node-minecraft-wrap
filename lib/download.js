var https = require('https');
var fs = require('fs');
var md5File=require("md5-file");

module.exports=download;

function download(minecraftVersion,filename,done)
{
  https.get("https://s3.amazonaws.com/Minecraft.Download/versions/"+minecraftVersion+
    "/minecraft_server."+minecraftVersion+".jar", function(response) {
    if(response.statusCode==200) {
      checkSum(filename,response.headers.etag,function(err,alreadyThere){
        if(!alreadyThere) {
          var file = fs.createWriteStream(filename);
          response.pipe(file);
          response.on('end', function() {
            checkSum(filename,response.headers.etag,function(err,correct){
              if(!correct)
                done(new Error("download failed : wrong or partial file downloaded"));
              else
                done();
            });
          });
        }
        else
          done();
      });
    }
    else
      done(new Error("download failed : server responds with status "+response.statusCode));
  });
}

function checkSum(filename,etag,done)
{
  md5File(filename,function(err,sum){
    var expectedSum=etag.substr(1,etag.length-2);
    done(null,!(err || expectedSum!=sum));
  });
}