const debug = require('debug')('minecraft-wrap');

let ClientControl;
try {
  ClientControl=require('./lib/client_control');
}
catch(err) {
  debug(err);
}

module.exports={
  Wrap:require("./lib/wrap_server"),
  WrapServer:require("./lib/wrap_server"),
  WrapClient:require("./lib/wrap_client"),
  download:require("./lib/download").downloadServer,
  downloadServer:require("./lib/download").downloadServer,
  downloadClient:require("./lib/download").downloadClient,
  LauncherDownload:require("./lib/launcher_download"),
  ClientControl
};
