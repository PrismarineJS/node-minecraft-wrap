var wrap=require("../");
var path = require('path');

var vServer=new wrap.Wrap(path.join(__dirname, 'minecraft_server.1.8.3.jar'),path.join(__dirname, 'server'));

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
    vServer.on('line',function(line){
      console.log(line);
    });

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