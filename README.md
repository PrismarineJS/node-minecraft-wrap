# minecraft wrap

[![NPM version](https://img.shields.io/npm/v/minecraft-wrap.svg)](http://npmjs.com/package/minecraft-wrap)
[![Build Status](https://github.com/PrismarineJS/node-minecraft-wrap/workflows/CI/badge.svg)](https://github.com/PrismarineJS/node-minecraft-wrap/actions?query=workflow%3A%22CI%22)

Download and wrap the vanilla minecraft server and client in node.js.

## Install

To install a downloadMinecraft and a runMinecraft command line programs, run:

```
npm install -g minecraft-wrap
```


## Usage

```
downloadMinecraft 1.8.8 1.8.8.jar server
runMinecraft [<minecraft dir>] [<version>] [<username>] [<password>] [<stop>]
```

See [examples](examples)

## API

### download(minecraftVersion,filename,done)

download the vanilla server of version `minecraftVersion` jar file at `filename`.

It checks with a md5 hash that the file downloaded is correct and it
 doesn't download it if the destination file is already the correct file.
 
### downloadClient(minecraftVersion,filename,done)
 
download the vanilla client of version `minecraftVersion` jar file at `filename`.

### downloadBedrockServer(os, version, outputPath, suffixVersion)

os: 'win' | 'linux'
version: valid bedrock version (ie: '1.16.220')
outputPath: name of folder to extract server to
suffixVersion: the name of the outputFolder will be suffixed to the end of the folder name, ie: `output` to `output1.16.220`

download + unzip the bedrock server

### new WrapServer(MC_SERVER_JAR,MC_SERVER_PATH[,OPTIONS])

initialize a wrapper with jar `MC_SERVER_JAR`, store mc server file at `MC_SERVER_PATH`

`OPTIONS` is an object containing the following optional properties:

* minMem : the minimum memory allocated to the minecraft server, default to 512
* maxMem : the maximum memory allocated to the minecraft server, default to 512
* doneRegex : the regex to check for the server message announcing the server has started, default to `new RegExp(/\[Server thread\/INFO\]: Done/)`
* noOverride : don't override config files
* javaPath : specify path to a java executable to use, by default it's just `java`

#### WrapServer.startServer(propOverrides, done)

start the minecraft server with properties overrides `propOverrides`. Calls `done` when the server is started.

#### WrapServer.stopServer(done)

stop the minecraft server, calls `done` when the server is stopped.

#### WrapServer.deleteServerData(done)

delete the minecraft server data.

#### WrapServer.writeServer(line)

write `line` to the server.

#### "line" (line)

the Wrap instance emit that event when the server write a line

### new WrapClient(clientPath,version)

create a client wrapper instance

* using `clientPath` as minecraft directory (or the default os specific path if undefined)
* with minecraft version `version` (or the version of the selected profile if undefined)

#### WrapClient.prepare()

prepare all the files requires for the minecraft client in the minecraft directory.

return a promise

#### WrapClient.auth(username,password)

authenticate the user using `username` and `password`.
If these parameters are undefined, the selected user in the profile is used

return a promise

#### WrapClient.setAuthInfo(playerName,uuid,accessToken,userProperties)

set the authentication information directly without contacting the mojang servers.
`playerName`, `uuid`, `accessToken` and `userProperties` need to be provided.

#### WrapClient.start()

start the client

return a promise that is resolved when the client is properly started

#### WrapClient.stop()

stop the client

return a promise that is resolved when the client is stopped

### new LauncherDownload(mcPath,os="linux")

create a launcher downloader with `mcPath` as minecraft directory path

#### LauncherDownload.getWholeClient(version)

get the client jar, the assets, the libraries and extract the native libraries for the version `version`.
return an object of arrays of the paths of the downloaded files

#### LauncherDownload.getVersionsList()

get and return a promise of the version list

#### LauncherDownload.getVersionInfos(version)

get and save the version infos and return a promise of it

#### LauncherDownload.getAssetIndex(version)

get and save the asset index and return a promise of it

#### LauncherDownload.getAllAssets(version)

get all the assets, save them and return a promise of an array of the paths

#### LauncherDownload.getAsset(assetFile,version)

get the asset `assetFile`, save it and return a promise of its path

#### LauncherDownload.getClient(version, [path])

get the client jar, save it and return return a promise of its path

#### LauncherDownload.getServer(version, [path])

get the server jar, save it and return return a promise of its path

#### LauncherDownload.extractNatives(version)

extract the natives files and return a promise to the path of the dir

#### LauncherDownload.getLibraries(version)

get all the libraries, save them and return a promise of an array of the paths


## Testing

The MC_SERVER_JAR environment variable must be defined and point the .jar location before calling npm test.
