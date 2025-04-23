const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./Config.json');

console.log('[Main] Starting bot...');

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});
client.commands = new Collection();

console.log('[Main] Loading commands...');
// Function to recursively get all .js files from a directory and its subdirectories
function getJsFiles(dir) {
  const jsFiles = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      jsFiles.push(...getJsFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.js')) {
      jsFiles.push(fullPath);
    }
  }
  return jsFiles;
}

// Load commands from Commands folder and subfolders
const commandFolder = path.join(__dirname, 'Commands');
if (!fs.existsSync(commandFolder)) {
  console.error('[Main] Error: Commands directory does not exist:', commandFolder);
  process.exit(1);
}
const commandFiles = getJsFiles(commandFolder);
console.log('[Main] Found command files:', commandFiles.map(f => path.relative(__dirname, f)));

for (const file of commandFiles) {
  try {
    const command = require(file);

    if (!command || typeof command !== 'object') {
      console.warn(`[Main] Skipped ${file}: Invalid export (not an object)`);
      continue;
    }

    const commandName = command.data?.name || command.name;
    if (!commandName) {
      console.warn(`[Main] Skipped ${file}: Missing command name`);
      continue;
    }

    // Normalize .data if it's a SlashCommandBuilder
    if (command.data?.toJSON) {
      command.data = command.data.toJSON();
    }

    client.commands.set(commandName, command);
    console.log(`[Main] Loaded command: ${commandName} from ${path.relative(__dirname, file)}`);
  } catch (error) {
    console.error(`[Main] Error loading command ${file}:`, error);
  }
}

// Load events from Events folder and subfolders
console.log('[Main] Loading events...');
const eventFolder = path.join(__dirname, 'Events');
if (!fs.existsSync(eventFolder)) {
  console.error('[Main] Error: Events directory does not exist:', eventFolder);
  process.exit(1);
}
const eventFiles = getJsFiles(eventFolder); // Use recursive getJsFiles
console.log('[Main] Found event files:', eventFiles.map(f => path.relative(__dirname, f)));

for (const file of eventFiles) {
  try {
    const event = require(file);
    if (event.name) {
      if (event.once) {
        client.once(event.name, (...args) => {
          console.log(`[Main] Executing once event: ${event.name}`);
          event.execute(...args, client);
        });
      } else {
        client.on(event.name, (...args) => {
          console.log(`[Main] Executing on event: ${event.name}`);
          event.execute(...args, client);
        });
      }
      console.log(`[Main] Loaded event: ${event.name} from ${path.relative(__dirname, file)}`);
    } else {
      console.warn(`[Main] Skipped ${file}: Missing event name`);
    }
  } catch (error) {
    console.error(`[Main] Error loading event ${file}:`, error);
  }
}

// Register slash commands
console.log('[Main] Preparing to register slash commands...');
const rest = new REST({ version: '10' }).setToken(config.login);

client.once('ready', async () => {
  try {
    console.log(`[Main] Bot logged in as: ${client.user.tag}`);
    console.log('[Main] Refreshing application commands...');

    const slashCommands = Array.from(client.commands.values())
      .filter(cmd => cmd.data && typeof cmd.data.name === 'string') // Only valid slash commands
      .map(cmd => cmd.data);

    await rest.put(Routes.applicationCommands(config.id), { body: slashCommands });
    console.log('[Main] Successfully registered application commands');
  } catch (error) {
    console.error('[Main] Error registering commands:', error);
  }
});

console.log('[Main] Attempting to log in...');
client.login(config.login)
  .then(() => console.log('[Main] Login request sent'))
  .catch(error => console.error('[Main] Login failed:', error));
