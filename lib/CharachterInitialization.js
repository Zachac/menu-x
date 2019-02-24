'use strict';


const { Logger, Config, Player } = require('ranvier');

class CharachterInitialization {
    /**
     * Initialize the charachter and return
     * 
     * @param {state}
     * @param {socket}
     * @param {args}
     */
    static async doInitCharachter(state, socket, args) {
        let player = args.player;
        player.hydrate(state);
        player.save();
        player._lastCommandTime = Date.now();
    };

    /**
     * Initialize the properties of a charachter and return
     * 
     * @param {state}
     * @param {socket}
     * @param {args}
     */
    static async initCharachterProperties(state, socket, args) {
        const startingRoomRef = Config.get('startingRoom');

        if (!startingRoomRef) {
            Logger.error('No startingRoom defined in ranvier.json');
        }

        let player = new Player({
            name: args.name,
            account: args.account,
        });

        player.prompt = '>';

        // TIP:DefaultAttributes: This is where you can change the default attributes for players
        const defaultAttributes = CharachterInitialization.getDefaultPlayerAttributes();

        for (const attr in defaultAttributes) {
            player.addAttribute(state.AttributeFactory.create(attr, defaultAttributes[attr]));
        }

        player.room = state.RoomManager.getRoom(startingRoomRef)

        args.account.addCharacter(args.name);
        args.account.save();

        await state.PlayerManager.save(player);
    }

    static getDefaultPlayerAttributes() {
        return {
            health: 100,
            strength: 20,
            agility: 20,
            intellect: 20,
            stamina: 20,
            armor: 0,
            critical: 0
        };
    }
}

module.exports = CharachterInitialization;