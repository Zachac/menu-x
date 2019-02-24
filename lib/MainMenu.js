'use strict';

const { Broadcast, Config, EventUtil } = require('ranvier');
const Login = require('../lib/Login');
const CharachterCreation = require('../lib/CharachterCreation');
const Commands = require('../lib/Commands');
const CommonFunctions = require('../lib/CommonFunctions');
const CharachterInitialization = require('../lib/CharachterInitialization');

const default_maxCharachters = 3;

/**
 * Main menu to:
 *  start the game with an existing charachter
 *  add/delete charachters
 *  create new
 *  manage/delete account
 */
class MainMenu {

    /**
     * Run the main menu.
     * 
     * @param {state}
     * @param {socket}
     * @param {args}
     */
    static async doMainMenu(state, socket, args) {
        const say = EventUtil.genSay(socket);
        const pm = state.PlayerManager;
        const account = args.account;

        /*
        Player selection menu:
        * Can select existing player
        * Can create new (if less than 3 living chars)
        */
        say("\r\n------------------------------");
        say("|      Choose your fate");
        say("------------------------------");

        // This just gets their names.
        const characters = account.characters.filter(currChar => currChar.deleted === false);
        const maxCharacters = Config.get("maxCharacters", default_maxCharachters);
        const canAddCharacter = characters.length < maxCharacters;

        let options = [];

        // Configure account options menu
        options.push({
            display: 'Change Password',
            onSelect: async () => {
                await Login.changePassword(state, socket, { account });
            },
        });

        if (canAddCharacter) {
            options.push({
                display: 'Create New Character',
                onSelect: async () => {
                    await CharachterCreation.createCharachter(state, socket, args);
                },
            });
        }

        if (characters.length) {
            options.push({ display: "\n\r| Choose charachter:" });
            characters.forEach(char => {
                options.push({
                    display: char.username,
                    onSelect: async () => {
                        let currentPlayer = pm.getPlayer(char.username);

                        if (currentPlayer) {
                            // kill old connection
                            Broadcast.at(currentPlayer, 'Connection taken over by another client. Goodbye.');
                            currentPlayer.socket.end();

                            // link new socket
                            currentPlayer.socket = socket;
                            Broadcast.at(currentPlayer, 'Taking over old connection. Welcome.');
                            Broadcast.prompt(currentPlayer);

                            await Commands.doRunCommands(state, currentPlayer);
                        } else {
                            currentPlayer = await state.PlayerManager.loadPlayer(state, account, char.username);
                            currentPlayer.socket = socket;
                            await CharachterInitialization.doInitCharachter(state, socket, { player: currentPlayer });
                            await Commands.doRunCommands(state, currentPlayer);
                        }
                    },
                });
            });
        }

        options.push({ display: "" });

        if (characters.length) {
            options.push({
                display: 'Delete a Character',
                onSelect: async () => {
                    await MainMenu.deleteCharachter(state, socket, args);
                },
            });
        }

        options.push({
            display: 'Delete This Account',
            onSelect: async () => {
                await MainMenu.deleteAccount(state, socket, args);
            },
        });

        options.push({
            display: 'Quit',
            onSelect: async () => socket.end(),
        });

        await CommonFunctions.selectOption(socket, options);
        await MainMenu.doMainMenu(state, socket, args);
    }

    /**
     * Delete a charachter and return
     * 
     * @param {state}
     * @param {socket}
     * @param {args}
     */
    static async deleteCharachter(state, socket, args) {
        let account = args.account;
        const say = EventUtil.genSay(socket);
        const write = EventUtil.genWrite(socket);

        say("\r\n------------------------------");
        say("|      Delete a Character");
        say("------------------------------");

        const characters = account.characters.filter(currChar => currChar.deleted === false);

        let options = [];
        characters.forEach(char => {
            options.push({
                display: `Delete <b>${char.username}</b>`,
                onSelect: async () => {
                    write(`<bold>Are you sure you want to delete <b>${char.username}</b>?</bold> <cyan>[Y/n]</cyan> `);

                    let confirmation = await CommonFunctions.getNextData(socket);

                    say('');

                    confirmation = confirmation.toString().trim().toLowerCase();

                    if (!/[yn]/.test(confirmation)) {
                        say('<b>Invalid Option</b>');
                    } else if (confirmation === 'n') {
                        say('No one was deleted...');
                    } else {
                        say(`Deleting ${char.username}`);
                        account.deleteCharacter(char.username);
                        say('Character deleted.');
                    }
                },
            });
        });

        options.push({ display: "" });

        options.push({
            display: 'Go back to main menu',
            onSelect: async () => {
                // do nothing and drop out to previous menu
            },
        });

        await CommonFunctions.selectOption(socket, options);
    }

    /**
     * Delete account and return
     * 
     * @param {state}
     * @param {socket}
     * @param {args}
     */
    static async deleteAccount(state, socket, args) {
        const say = EventUtil.genSay(socket);
        const write = EventUtil.genWrite(socket);
        const account = args.account;

        say('<bold>By deleting this account, all the characters will be also deleted.</bold>');
        write(`<bold>Are you sure you want to delete this account? </bold> <cyan>[Y/n]</cyan> `);

        let confirmation = await CommonFunctions.getNextData(socket);
        confirmation = confirmation.toString().trim().toLowerCase();

        say('');

        if (!/[yn]/.test(confirmation)) {
            say('<b>Invalid Option</b>');
        } else if (confirmation === 'n') {
            say('No one was deleted...');
        } else {
            say(`Deleting account <b>${account.username}</b>`);
            account.deleteAccount();
            say('Account deleted, it was a pleasure doing business with you.');
            socket.end();
        }
    }
}

module.exports = MainMenu;