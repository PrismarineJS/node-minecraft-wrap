var Wrap=require("../").Wrap;
var path = require('path');

describe("server_session", function() {
  this.timeout(10 * 60 * 1000);
  it("start and stop the server",function(done){
    var vServer=new Wrap();

    vServer.on('line',function(line){
      console.log(line);
    });

    vServer.startServer({},
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