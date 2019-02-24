'use strict';

const { EventUtil } = require('ranvier');

const CharachterInitialization = require('../lib/CharachterInitialization');
const CommonFunctions = require('../lib/CommonFunctions');

class CharachterCreation {

    /**
     * Create new charachter and return.
     * 
     * @param {state}
     * @param {socket}
     * @param {args}
     */
    static async createCharachter(state, socket, args) {
        args.name = await CharachterCreation.chooseName(state, socket, args);
        CharachterInitialization.initCharachterProperties(state, socket, args);
    }

    /**
     * Choose a name for the player and return
     * 
     * @param {state}
     * @param {socket}
     * @param {args}
     * @return {string} the name the player chose
     */
    static async chooseName(state, socket, args) {
        const say = EventUtil.genSay(socket);
        const write = EventUtil.genWrite(socket);

        write("<bold>What would you like to name your character?</bold> ");

        let name = await CommonFunctions.getNextData(socket);
        name = name.toString().trim();

        say('');

        const invalid = CommonFunctions.validateName(name);

        if (invalid) {
            say(invalid);
            return await CharachterCreation.chooseName(state, socket, args);
        } else {
            name = name[0].toUpperCase() + name.slice(1);
            const exists = state.PlayerManager.exists(name);

            if (exists) {
                say(`That name is already taken.`);
                return await CharachterCreation.chooseName(state, socket, args);
            } else {
                const confirmation = await CharachterCreation.confirmName(state, socket, name);

                if (confirmation) {
                    return name;
                } else {
                    return await CharachterCreation.chooseName(state, socket, args);
                }
            }
        }
    }

    /**
     * Checks if the player want's to confirm the name they chose.
     * 
     * @param {state}
     * @param {socket}
     * @param {args}
     * @return {boolean} if the player confirms
     */
    static async confirmName(state, socket, name) {
        const say = EventUtil.genSay(socket);
        const write = EventUtil.genWrite(socket);
        write(`<bold>${name} doesn't exist, would you like to create it?</bold> <cyan>[y/n]</cyan> `);

        let confirmation = await CommonFunctions.getNextData(socket);
        confirmation = confirmation.toString().trim().toLowerCase();

        say('');

        if (!/[yn]/.test(confirmation)) {
            return await CharachterCreation.confirmName(state, socket, name);
        } else {
            return confirmation === 'y';
        }
    }
}

module.exports = CharachterCreation;
