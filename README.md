# minecraft wrap

[![NPM version](https://img.shields.io/npm/v/minecraft-wrap.svg)](http://npmjs.com/package/minecraft-wrap)
[![Build Status](https://img.shields.io/circleci/project/rom1504/node-minecraft-wrap/master.svg)](https://circleci.com/gh/rom1504/node-minecraft-wrap)

Download and wrap the vanilla minecraft server in node.js. Also download the minecraft client.

## Install

To install a downloadMinecraft command line program, run:

```
npm install -g minecraft-wrap
```


## Usage

```
downloadMinecraft 1.8.8 1.8.8.jar server
runMinecraft [<minecraft dir>] [<version>] [<username>] [<password>] [<stop>]
```

See [exampleDownload.js](examples/exampleDownload.js) and [exampleWrapServer.js](examples/exampleWrapServer.js)

### download(minecraftVersion,filename,done)

download the vanilla server of version `minecraftVersion` jar file at `filename`.

It checks with a md5 hash that the file downloaded is correct and it
 doesn't download it if the destination file is already the correct file.
 
### downloadClient(minecraftVersion,filename,done)
 
download the vanilla client of version `minecraftVersion` jar file at `filename`.

### new Wrap(MC_SERVER_JAR,MC_SERVER_PATH[,OPTIONS])

initialize a wrapper with jar `MC_SERVER_JAR`, store mc server file at `MC_SERVER_PATH`

`OPTIONS` is an object containing the following optional properties:

* minMem : the minimum memory allocated to the minecraft server, default to 512
* maxMem : the maximum memory allocated to the minecraft server, default to 512
* doneRegex : the regex to check for the server message announcing the server has started, default to `new RegExp(/\[Server thread\/INFO\]: Done/)`

#### Wrap.startServer(propOverrides, done)

start the minecraft server with properties overrides `propOverrides`. Calls `done` when the server is started.

#### Wrap.stopServer(done)

stop the minecraft server, calls `done` when the server is stopped.

#### Wrap.deleteServerData(done)

delete the minecraft server data.

#### Wrap.writeServer(line)

write `line` to the server.

#### "line" (line)

the Wrap instance emit that event when the server write a line

## Testing

The MC_SERVER_JAR environment variable must be defined and point the .jar location before calling npm test.