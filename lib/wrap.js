var path = require('path');
var mkdirp = require('mkdirp');
var Batch = require('batch');
var fs = require('fs');
var spawn = require('child_process').spawn;
var rimraf = require('rimraf');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var defaultServerProps = {
  'generator-settings': "",
  'op-permission-level': '4',
  'allow-nether': 'true',
  'level-name': 'world',
  'enable-query': 'false',
  'allow-flight': 'false',
  'announce-player-achievements': true,
  'server-port': '25565',
  'level-type': 'FLAT',
  'enable-rcon': 'false',
  'force-gamemode': 'false',
  'level-seed': "",
  'server-ip': "",
  'max-build-height': '256',
  'spawn-npcs': 'false',
  'white-list': 'false',
  'spawn-animals': 'false',
  'hardcore': 'false',
  'snooper-enabled': 'true',
  'online-mode': 'false',
  'resource-pack': '',
  'pvp': 'true',
  'difficulty': '1',
  'enable-command-block': 'false',
  'gamemode': '1',
  'player-idle-timeout': '0',
  'max-players': '20',
  'spawn-monsters': 'false',
  'generate-structures': 'false',
  'view-distance': '10',
  'spawn-protection': '16',
  'motd': 'A Minecraft Server'
};

module.exports = Wrap;

function Wrap(MC_SERVER_JAR,MC_SERVER_PATH)
{
  EventEmitter.call(this);
  this.MC_SERVER_JAR=MC_SERVER_JAR || process.env.MC_SERVER_JAR;
  this.MC_SERVER_PATH=MC_SERVER_PATH || path.join(__dirname, 'server');
}
util.inherits(Wrap, EventEmitter);

Wrap.prototype.stopServer=function(done) {
  this.mcServer.stdin.write("stop\n");
  var self=this;
  this.mcServer.on('exit', function() {
    self.mcServer = null;
    rimraf(self.MC_SERVER_PATH, done);
  });
};


Wrap.prototype.startServer=function(propOverrides, done) {
  var self=this;
  var props = {};
  var prop;
  for(prop in defaultServerProps) {
    if(!defaultServerProps.hasOwnProperty(prop)) continue;

    props[prop] = defaultServerProps[prop];
  }
  for(prop in propOverrides) {
    if(!propOverrides.hasOwnProperty(prop)) continue;

    props[prop] = propOverrides[prop];
  }
  var batch = new Batch();
  batch.push(function(cb) {
    mkdirp(self.MC_SERVER_PATH, cb);
  });
  batch.push(function(cb) {
    var str = "";
    for(var prop in props) {
      if(!props.hasOwnProperty(prop)) continue;

      str += prop + "=" + props[prop] + "\n";
    }
    fs.writeFile(path.join(self.MC_SERVER_PATH, "server.properties"), str, cb);
  });
  batch.push(function(cb) {
    fs.writeFile(path.join(self.MC_SERVER_PATH, "eula.txt"), "eula=true", cb);
  });
  batch.end(function(err) {
    if(err) return done(err);
    if(!fs.existsSync(self.MC_SERVER_JAR)) {
      return done(new Error("The file " + self.MC_SERVER_JAR + " doesn't exist."));
    }

    self.mcServer = spawn('java', ['-jar', self.MC_SERVER_JAR, 'nogui'], {
      stdio: 'pipe',
      cwd: self.MC_SERVER_PATH
    });
    self.mcServer.stdin.setEncoding('utf8');
    self.mcServer.stdout.setEncoding('utf8');
    self.mcServer.stderr.setEncoding('utf8');
    var buffer = "";
    self.mcServer.stdout.on('data', onData);
    self.mcServer.stderr.on('data', onData);

    function onData(data) {
      //console.log(data);
      buffer += data;
      var lines = buffer.split("\n");
      var len = lines.length - 1;
      for(var i = 0; i < len; ++i) {
        self.mcServer.emit('line', lines[i]);
      }
      buffer = lines[lines.length - 1];
    }

    self.mcServer.on('line', onLine);
    self.mcServer.on('line', function(line) {
      process.stderr.write('.');
      // uncomment this line when debugging for more insight as to what is
      // happening on the minecraft server
      //console.error("[MC]", line);
    });
    function onLine(line) {
      self.emit('line',line);
      if(/\[Server thread\/INFO\]: Done/.test(line)) {
        self.mcServer.removeListener('line', onLine);
        self.mcServer.stdin.write("op flatbot\n");
        done();
      }
      if(/FAILED TO BIND TO PORT/.test(line)) {
        done(new Error("failed to bind to port"));
      }
      //else
      //  console.log(line);
    }
  });
};