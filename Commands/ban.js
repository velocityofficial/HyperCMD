const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban command')
    .addUserOption(option =>
      option.setName('user').setDescription('User to ban').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for the ban')
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'no reason given';
    
    await interaction.reply(`Banned ${user.username} (Reason: ${reason})`);
  }
};
