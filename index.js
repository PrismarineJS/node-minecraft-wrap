module.exports = {
  Wrap: require('./lib/wrap_server'),
  WrapServer: require('./lib/wrap_server'),
  WrapClient: require('./lib/wrap_client'),
  download: require('./lib/download').downloadServer,
  downloadServer: require('./lib/download').downloadServer,
  downloadClient: require('./lib/download').downloadClient,
  downloadBedrockServer: require('./lib/bedrock_download').downloadServer,
  LauncherDownload: require('./lib/launcher_download')
}
