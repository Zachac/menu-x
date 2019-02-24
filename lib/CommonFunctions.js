'use strict';

const { Config, EventUtil } = require('ranvier');

/**
 * General functions used on the ranvier-input-events bundle
 */

class CommonFunctions {

  /**
   * @param {string} name
   * @return {boolean}
   */
  static validateName(name) {
    const maxLength = Config.get('maxAccountNameLength');
    const minLength = Config.get('minAccountNameLength');

    if (!name) {
      return 'Please enter a name.';
    }
    if (name.length > maxLength) {
      return 'Too long, try a shorter name.';
    }
    if (name.length < minLength) {
      return 'Too short, try a longer name.';
    }
    if (!/^[a-z]+$/i.test(name)) {
      return 'Your name may only contain A-Z without spaces or special characters.';
    }
    return false;
  };

  static async getNextData(socket) {
    return new Promise(function (resolve) {
      socket.on('data', function (data) {
        resolve(data);
      })
    });
  }

  /**
   * Get user to select an option, run it and return
   */
  static async selectOption(socket, options) {
    const say = EventUtil.genSay(socket);

    let optionI = 0;
    options.forEach((opt) => {
      if (opt.onSelect) {
        optionI++;
        say(`| <cyan>[${optionI}]</cyan> ${opt.display}`);
      } else {
        say(`| ${opt.display}`);
      }
    });

    socket.write('|\r\n`-> ');

    let choice = await CommonFunctions.getNextData(socket);
    choice = choice.toString().trim();
    choice = parseInt(choice, 10) - 1;

    if (isNaN(choice)) {
      // drop out and return
    } else {
      const selection = options.filter(o => !!o.onSelect)[choice];

      if (selection) {
        return await selection.onSelect();
      }
    }
  }
}

module.exports = CommonFunctions;