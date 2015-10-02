# minecraft wrap

[![NPM version](https://img.shields.io/npm/v/minecraft-wrap.svg)](http://npmjs.com/package/minecraft-wrap)
[![Build Status](https://img.shields.io/circleci/project/rom1504/node-minecraft-wrap/master.svg)]
(https://circleci.com/gh/rom1504/node-minecraft-wrap)

Download and wrap the vanilla minecraft server in node.js

## Usage

minecraft wrap exposes a binary you can use with node_modules/.bin/downloadMinecraft or just downloadMinecraft if you 
install minecraft wrap globally.

See [exampleDownload.js](examples/exampleDownload.js) and [exampleWrap.js](examples/exampleWrap.js)

### download(minecraftVersion,filename,done)

download the vanilla server of version `minecraftVersion` jar file at `filename`.

It checks with a md5 hash that the file downloaded is correct and it
 doesn't download it if the destination file is already the correct file.

### new Wrap(MC_SERVER_JAR,MC_SERVER_PATH)

initialize a wrapper with jar `MC_SERVER_JAR`, store mc server file at `MC_SERVER_PATH`

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

## History

### 0.6.5

* go back to using mkdirp, which doesn't have any problem after all

### 0.6.4

* batch.concurrency(1) fixes the bug

### 0.6.3

* use fs.mkdir instead of mkdirp, should fix the bug

### 0.6.2

* fix the dir existence checking

### 0.6.1

* check the created path is actually created in wrap.js

### 0.6.0

* check with a md5 hash that the file downloaded is correct, doesn't download it if the destination file is already the correct file

### 0.5.4

* create empty banned-players.json, banned-ips.json, ops.json, whitelist.json to avoid errors

### 0.5.3

* fix writeServer

### 0.5.2

* don't stop the server if there's nothing to stop

### 0.5.1

* some cleanup of wrap

### 0.5.0

* change default properties to something more default

### 0.4.0

* add wrap.writeServer(line)

### 0.3.0

* separate stopping the server and deleting its files

### 0.2.0

* add downloadMinecraft to bin

### 0.1.0

* download and wrap functionality (mostly imported from mineflayer and node-minecraft-protocol)
