#!/usr/bin/env node

var wrap=require("../");
var path = require('path');
if(process.argv.length > 4) {
  console.log("Usage : node exampleDownload.js [<version>] [<path>]");
  process.exit(1);
}

var version=process.argv[2] || '1.8.3';
var jar=process.argv[3] || path.join(__dirname, 'minecraft_server.1.8.3.jar');

wrap.download(version,jar,function(err){
  if(err) {
    console.log(err);
    process.exit(1);
  }
  console.log("Done !");
});