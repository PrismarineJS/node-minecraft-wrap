const EventEmitter = require('events').EventEmitter;
const robot = require('robotjs');
const debug = require('debug')('minecraft-wrap');

class ClientControl extends EventEmitter {
  constructor(wrapClient) {
    super();
    this.wrap=wrapClient;
  }

  login(hostname) {

// Speed up the mouse.
    robot.setMouseDelay(500);

    const screenSize = robot.getScreenSize();
    const height = screenSize.height;
    const width = screenSize.width;
    // fix keyboard layout
    robot.keyToggle("space","down");
    robot.keyToggle("space","up");

    robot.moveMouse(width/2,height*0.56);
    robot.mouseClick();

    robot.moveMouse(width/2,height*0.68);
    robot.mouseClick();

    robot.keyToggle("a","down","control");
    setTimeout(() => {
      robot.keyToggle("a","up","control");
      setTimeout(() => {
        robot.typeString(hostname);
        robot.keyTap("enter");
      },100)
    },100);

    // 160f0a
    // 4d362b
    return new Promise((resolve,reject) => {
      this.wrap.on('line',line => {
        if(/Connecting to/.test(line)) {
          const t=setInterval(() => {
            debug(robot.getPixelColor(width/2,height/2));
            if(robot.getPixelColor(width/2,height/2)!=="160f0a") {
              clearInterval(t);
              resolve();
            }
          },200);
          setTimeout(() => {
            clearInterval(t);
            reject(new Error("timeout"));
          },5000)
        }
        if(/Couldn't connect to server/.test(line)) {
          reject(new Error("failed"));
        }
      })
    });
  }

  jump() {
    robot.keyToggle("space","down");
    return new Promise(resolve => {
      setTimeout(() => {
        robot.keyToggle("space","up");
        setTimeout(resolve,500);
      },200)
    });
  }

  chat(message) {
    robot.setKeyboardDelay(500);
    robot.keyTap("t");
    robot.typeString(message);
    robot.keyTap("enter");
    return Promise.resolve();
  }
}

module.exports=ClientControl;
