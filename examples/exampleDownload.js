#!/usr/bin/env node

var wrap=require("../");
var path = require('path');
if(process.argv.length <4 || process.argv.length >5) {
  console.log("Usage : node exampleDownload.js <version> <jar_file> [<client|server>]");
  process.exit(0);
}

var version=process.argv[2];
var jarFile=path.isAbsolute(process.argv[3]) ? process.argv[3] : path.join(process.cwd(), process.argv[3]);
var downloadServer=!process.argv[4] || process.argv[4]=="server";

wrap["download"+(downloadServer ? "Server" : "Client")](version,jarFile,function(err){
  if(err) {
    console.log(err);
    process.exit(1);
  }
  console.log("Done !");
});