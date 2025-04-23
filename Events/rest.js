const { REST, Routes } = require('discord.js');
const config = require('../Config.json');

async function loadRestAPI(client) {
    if (!client.commands || client.commands.size === 0) {
        //console.error("0 Commands found");
        return;
    }

    const rest = new REST({ version: '10' }).setToken(config.login);

    const commands = Array.from(client.commands.values()).map(command => {
        if (command.data) {
            return command.data.toJSON(); 
        } else {
            return {
                name: command.name,
                type: command.type,
                description: command.description || 'No description available.',
            }; 
        }
    });

    try {
        await rest.put(Routes.applicationCommands(config.id), { body: commands });

        console.log('RestAPI: ✅');
    } catch (error) {
        console.error('RestAPI Error:', error);
    }
}

module.exports = { loadRestAPI };
