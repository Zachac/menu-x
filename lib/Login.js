'use strict';

const { Logger, Config, Account, EventUtil } = require('ranvier');
const CommonFunctions = require('../lib/CommonFunctions');

const default_maxFailedAttempts = 3;
const default_minPasswordLength = 6;


class Login {

  /**
   * Login the user or end the socket if they fail
   * 
   * @param {state}
   * @param {socket}
   * @param {args}
   */
  static async login(state, socket, args) {
    if (!args || !args.dontwelcome) {
      socket.write('Welcome, ');
    }

    socket.write('what is your name? ')

    let name = await CommonFunctions.getNextData(socket);
    name = name.toString().trim();

    const invalid = CommonFunctions.validateName(name);

    if (invalid) {
      socket.write(invalid + '\r\n');
      Login.login(state, socket, { dontwelcome: true });
    } else {
      name = name[0].toUpperCase() + name.slice(1);
      args.name = name;

      let account = null;
      try {
        account = await state.AccountManager.loadAccount(args.name);
      } catch (e) {
        Logger.error(e.message);
      }

      if (!account) {
        Logger.error(`No account found as ${args.name}.`);
        await Login.createAccount(state, socket, args);
        Logger.log("Account: " + args.account);
      } else if (account.banned) {
        socket.write('This account has been banned.\r\n');
        await Login.login(state, socket, { dontwelcome: true });
      } else if (account.deleted) {
        socket.write('This account has been deleted.\r\n');
        await Login.login(state, socket, { dontwelcome: true });
      } else {
        args.account = account;
        await Login.password(state, socket, args);
      }
    }
  }

  static async password(state, socket, args) {
    const write = EventUtil.genWrite(socket);
    const maxFailedAttempts = state.Config.get('maxFailedAttempts', default_maxFailedAttempts);

    if (!args.passwordAttempts) {
      args.passwordAttempts = 0;
    }

    if (args.passwordAttempts >= maxFailedAttempts) {
      write("Password attempts exceeded.\r\n");
      socket.end()
    } else {
      write("Enter your password: ");
      socket.command('toggleEcho');
      const pass = await CommonFunctions.getNextData(socket);
      socket.command('toggleEcho');
      args.passwordAttempts++;

      if (!args.account.checkPassword(pass.toString().trim())) {
        write("<red>Incorrect password.</red>\r\n");
        await Login.password(state, socket, args);
      }
    }
  }

  static async createAccount(state, socket, args) {
    const write = EventUtil.genWrite(socket);
    const say = EventUtil.genSay(socket);
    const name = args.name;

    write(`<bold>Do you want your account's username to be ${name}?</bold> <cyan>[y/n]</cyan> `);

    let data = await CommonFunctions.getNextData(socket);
    data = data.toString('utf8').trim();
    data = data.toLowerCase();

    if (data === 'y' || data === 'yes') {
      say('Creating account...');
      args.account = new Account({
        username: name
      });

      Logger.log("Account: " + args.account);

      await Login.changePassword(state, socket, args);
    } else if (data && data === 'n' || data === 'no') {
      say("Let's try again!");
      await Login.login(state, socket, args);
    } else {
      await Login.createAccount(state, socket, args);
    }
  }

  static async changePassword(state, socket, args) {
    const say = EventUtil.genSay(socket);
    const write = EventUtil.genWrite(socket);
    const minPassLength = Config.get("minPasswordLength", default_minPasswordLength);

    say(`Your password must be at least ${minPassLength} characters.`);
    write('<cyan>Enter your account password:</cyan> ');

    socket.command('toggleEcho');
    let pass = await CommonFunctions.getNextData(socket);
    socket.command('toggleEcho');

    say('');

    pass = pass.toString().trim();

    if (!pass) {
      say('You must use a password.');
      await Login.changePassword(state, socket, args);
    } else if (pass.length < minPassLength) {
      say('Your password is not long enough.');
      await Login.changePassword(state, socket, args);
    } else {
      // setPassword handles hashing
      args.account.setPassword(pass);
      state.AccountManager.addAccount(args.account);
      args.account.save();
      await Login.confirmPassword(state, socket, args);
    }
  }

  static async confirmPassword(state, socket, args) {
    const write = EventUtil.genWrite(socket);
    const say = EventUtil.genSay(socket);

    write("<cyan>Confirm your password:</cyan> ");

    socket.command('toggleEcho');
    const pass = await CommonFunctions.getNextData(socket);
    socket.command('toggleEcho');

    if (!args.account.checkPassword(pass.toString().trim())) {
      say("<red>Passwords do not match.</red>");
      await Login.changePassword(state, socket, args);
    } else {
      say('');
    }
  }
}

module.exports = Login;