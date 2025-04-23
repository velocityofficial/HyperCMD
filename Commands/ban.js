const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban command')
    .addUserOption(o => o.setName('user').setRequired(true))
    .addStringOption(o => o.setName('reason')),
    
  execute: async ({ options, reply }) => {
    const user = options.getUser('user');
    const reason = options.getString('reason') || 'no reason given';
    await reply(`Banned ${user.username} (Reason: ${reason})`);
  }
};
