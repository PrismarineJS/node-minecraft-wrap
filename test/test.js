const  WrapServer=require("../").WrapServer;
const  path = require('path');
const  MC_SERVER_PATH = path.join(__dirname, 'server');

describe("server_session", function() {
  this.timeout(10 * 60 * 1000);
  it("start and stop the server",function(done){
    const  vServer=new WrapServer(process.env.MC_SERVER_JAR,MC_SERVER_PATH);

    vServer.on('line',function(line){
      console.log(line);
    });

    vServer.startServer({"server-port":25569},
      function(err){
      if(err) {
        console.log(err);
        done(err);
        return;
      }
      console.log("Server Started !");

      setTimeout(function(){
        vServer.stopServer(function(err){
          if(err) {
            console.log(err);
            done(err);
            return;
          }
          console.log("Server Stopped !");

          vServer.deleteServerData(function(err){
            if(err) {
              console.log(err);
              done(err);
              return;
            }
            console.log("Server data deleted !");
            done();
          });
        });
      },3000);
    });
  })
});