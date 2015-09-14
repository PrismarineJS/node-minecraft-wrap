var https = require('https');
var fs = require('fs');

module.exports=download;

function download(minecraftVersion,filename,done)
{
  https.get("https://s3.amazonaws.com/Minecraft.Download/versions/"+minecraftVersion+
    "/minecraft_server."+minecraftVersion+".jar", function(response) {
    if(response.statusCode==200) {
      var file = fs.createWriteStream(filename);
      response.pipe(file);
      response.on('end', function() {
        done();
      });
    }
    else
      done(new Error("download failed"));
  });
}