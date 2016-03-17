var wrap=require("../");
var path = require('path');

if(process.argv.length !=4) {
  console.log("Usage : node exampleWrap.js <jar_file> <server_dir>");
  process.exit(0);
}

var jarFile=path.isAbsolute(process.argv[2]) ? process.argv[2] :path.join(process.cwd(), process.argv[2]);
var serverDir=path.isAbsolute(process.argv[3]) ? process.argv[3] : path.join(process.cwd(), process.argv[3]);

var vServer=new wrap.Wrap(jarFile,serverDir);

vServer.on('line',function(line){
  console.log(line);
});

vServer.startServer({
  motd: 'test1234',
  'max-players': 120
},function(err){
  if(err) {
    console.log(err);
    return;
  }
  console.log("Server Started !");

  setTimeout(function(){

    vServer.stopServer(function(err){
      if(err) {
        console.log(err);
        return;
      }
      console.log("Server Stopped !");

      vServer.deleteServerData(function(err){
        if(err) {
          console.log(err);
          return;
        }
        console.log("Server data deleted !");
      });
    });
  },3000);
});