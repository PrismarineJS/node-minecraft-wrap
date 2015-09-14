# minecraft wrap

Download and wrap the vanilla minecraft server in node.js

## Usage

See [exampleDownload.js](examples/exampleDownload.js) and [exampleWrap.js](examples/exampleWrap.js)

### download(minecraftVersion,filename,done)

download the vanilla server of version `minecraftVersion` jar file at `filename`.

### new Wrap(MC_SERVER_JAR,MC_SERVER_PATH)

initialize a wrapper with jar `MC_SERVER_JAR`, store mc server file at `MC_SERVER_PATH`

#### Wrap.startServer(propOverrides, done)

start the minecraft server with properties overrides `propOverrides`. Calls `done` when the server is started.

#### Wrap.stopServer(done)

stop the minecraft server, calls `done` when the server is stopped.

#### "line" (line)

the Wrap instance emit that event when the server write a line

## Testing

The MC_SERVER_JAR environment variable must be defined and point the .jar location before calling npm test.

## History

### 0.1.0

* download and wrap functionality (mostly imported from mineflayer and node-minecraft-protocol)
