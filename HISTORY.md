# History

## 1.6.0
* [node 22 (#97)](https://github.com/PrismarineJS/node-minecraft-wrap/commit/9edf01617d4d4e8bf7339f8a5f4649d52de96e9a) (thanks @rom1504)
* [Bump mocha from 10.8.2 to 11.0.1 (#96)](https://github.com/PrismarineJS/node-minecraft-wrap/commit/d3beda18d3f5d1840fb880a8f69a830ca19d72ff) (thanks @dependabot[bot])
* [Add command gh workflow allowing to use release command in comments (#93)](https://github.com/PrismarineJS/node-minecraft-wrap/commit/39941e7e4db5fac4427083ed57288fb05591cb56) (thanks @rom1504)
* [Update to node 18.0.0 (#92)](https://github.com/PrismarineJS/node-minecraft-wrap/commit/3e6ab62135c0ff468d394355ca6b906257eae388) (thanks @rom1504)
* [Add bedrock server download support (#51)](https://github.com/PrismarineJS/node-minecraft-wrap/commit/9fb26ca0ed0a51005607bf55d8ee271557429b97) (thanks @u9g)

## 1.5.1

* Fix publish.yml

## 1.5.0

* Fix etag not md5 on all downloads (@u9g)
* Kill process when shutdown takes too long (@IceTank)

## 1.4.0

* Throw on too old java version
* Don't use broken native transport (Thanks @nickelpro)
* Allow explicitly picking a java executable
* Use node-fetch instead of request

## 1.3.0

* update dependencies
* make the server depend on its parent process (thanks @imharvol)

## 1.2.3

* run the server in detached mode to avoid closing it by accident when doing ctrl+c on the main script

## 1.2.2

* stop printing . to the console for wrap server

## 1.2.1

* increase ram default in wrap server

## 1.2.0

* standardjs
* use new non-aws client and server download urls (thanks @lluiscab) : required >= mc 1.13

## 1.1.8

* fix yggdrasil dependency

## 1.1.7

* bump dependencies

## 1.1.6

* add params for mc <=1.6

## 1.1.5

* handle userProperties (necessary for 1.8) in wrap client

## 1.1.4

* implement path based promise queue for downloading to avoid downloading 2 times the same path

## 1.1.3

* remove duplicate libs

## 1.1.2

* fix some bugs for initial download of the client

## 1.1.1

* fix wrap client arg processing

## 1.1.0

* add launcher_download class that act like the launcher downloader
* implement client wrap
* add runMinecraft bin
* add option to not override config files in wrap server

## 1.0.2

* write empty arrays in json list files instead of nothing, needed since 17w18b

## 1.0.1

* use 'close' instead of 'exit' event for quitServer : might cause less problems

## 1.0.0

* improve the cli interface
* can now download the client

## 0.7.1

* improve default done regex to support both spigot and vanilla

## 0.7.0

* add OPTIONS parameter to specify the ram usage and the done string to check for spigot support

## 0.6.5

* go back to using mkdirp, which doesn't have any problem after all

## 0.6.4

* batch.concurrency(1) fixes the bug

## 0.6.3

* use fs.mkdir instead of mkdirp, should fix the bug

## 0.6.2

* fix the dir existence checking

## 0.6.1

* check the created path is actually created in wrap_server.js

## 0.6.0

* check with a md5 hash that the file downloaded is correct, doesn't download it if the destination file is already the correct file

## 0.5.4

* create empty banned-players.json, banned-ips.json, ops.json, whitelist.json to avoid errors

## 0.5.3

* fix writeServer

## 0.5.2

* don't stop the server if there's nothing to stop

## 0.5.1

* some cleanup of wrap

## 0.5.0

* change default properties to something more default

## 0.4.0

* add wrap.writeServer(line)

## 0.3.0

* separate stopping the server and deleting its files

## 0.2.0

* add downloadMinecraft to bin

## 0.1.0

* download and wrap functionality (mostly imported from mineflayer and node-minecraft-protocol)
