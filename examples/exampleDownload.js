#!/usr/bin/env node

var wrap=require("../");
var path = require('path');
if(process.argv.length !=4) {
  console.log("Usage : node exampleDownload.js <version> <jar_file>");
  process.exit(0);
}

var version=process.argv[2];
var jarFile=path.isAbsolute(process.argv[3]) ? process.argv[3] : path.join(process.cwd(), process.argv[3]);

wrap.download(version,jarFile,function(err){
  if(err) {
    console.log(err);
    process.exit(1);
  }
  console.log("Done !");
});