'use strict';

const fs = require('fs');

const { EventUtil } = require('ranvier');
const Login = require('../lib/Login');
const MainMenu = require('../lib/MainMenu');

/**
 * Main Loop
 */
module.exports = {
  event: state => async function (socket) {
    const motd = fs.readFileSync(__dirname + '/../resources/motd').toString('utf8');
    if (motd) {
      EventUtil.genSay(socket)(motd);
    }

    let args = {};

    await Login.login(state, socket, args);
    await MainMenu.doMainMenu(state, socket, args);

    socket.end();
  }
};
