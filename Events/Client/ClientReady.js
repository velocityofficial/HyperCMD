const { REST, Routes, Events } = require('discord.js');
const config = require('../../Config.json')

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Logged in as: ${client.user.tag}`);

    const commands = Array.from(client.commands.values()).map(command => command.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(config.login);

    try {
      console.log('> Commands Refreshed');
      await rest.put(Routes.applicationCommands(config.id), { body: commands });
      console.log('>> Commands Loaded');
    } catch (error) {
      console.error(error);
    }
  },
};