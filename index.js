const { Client, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: ['Guilds'] });
client.commands = new Collection();
const config = require('./Config.json')

// Load commands
const commandFolder = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandFolder).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandFolder, file));
  client.commands.set(command.data.name, command);
}

// Load events
const eventFolder = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventFolder).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventFolder, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Login to Discord
client.login(config.login);