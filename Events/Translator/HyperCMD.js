const { Events, ApplicationCommandOptionType: OptionType } = require('discord.js');
const config = require('../Config.json')

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot || !message.content.startsWith(config.prefix)) return;

    const [cmd, ...args] = parseCommand(message.content);
    const command = client.commands.get(cmd.toLowerCase());
    if (!command) return;

    try {
      const ctx = buildExecutionContext(command, args, message, client);
      await command.execute(ctx);
    } catch (error) {
      handleCommandError(message, cmd, error);
    }
  }
};

function parseCommand(content) {
  const args = [];
  let current = '';
  let inQuotes = false;
  
  for (const char of content.slice(1).trim()) {
    if (char === '"') {
      if (inQuotes) args.push(current);
      inQuotes = !inQuotes;
      current = '';
    } else if (char === ' ' && !inQuotes) {
      if (current) args.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  return current ? [...args, current] : args;
}

function buildExecutionContext(command, args, message, client) {
  if (!command.data.options?.length) {
    return {
      options: createEmptyOptions(),
      reply: (r) => message.reply(r),
      deferReply: () => message.channel.sendTyping(),
      ...getBaseContext(message, client)
    };
  }

  // Process command structure
  const { subcommand, options } = processCommandStructure(command.data.options, args);

  return {
    options: {
      ...createOptionResolver(options, message, client),
      getSubcommand: () => subcommand?.name
    },
    reply: (r) => message.reply(r),
    deferReply: () => message.channel.sendTyping(),
    ...getBaseContext(message, client)
  };
}

function processCommandStructure(optionDefs, args) {
  let subcommand = null;
  const options = {};
  let argIndex = 0;

  const firstOpt = optionDefs[0];
  if (firstOpt?.type === OptionType.Subcommand && args[0]) {
    // Verify the argument matches a defined subcommand
    const matchedSubcommand = optionDefs.find(
      opt => opt.type === OptionType.Subcommand && opt.name === args[0]
    );
    
    if (matchedSubcommand) {
      subcommand = {
        name: args[0],
        type: OptionType.Subcommand
      };
      argIndex = 1; 
    }
  }

  for (const opt of optionDefs) {
    if (argIndex >= args.length) break;
    
    if (opt.type === OptionType.Subcommand && opt.name === subcommand?.name) continue;
    
    if (!args[argIndex] && opt.required) {
      throw new Error(`Missing required argument: ${opt.name}`);
    }
      
    if (args[argIndex]) {
      options[opt.name] = convertOptionValue(opt.type, args[argIndex]);
      argIndex++;
    }
  }

  return { subcommand, options };
}

function convertOptionValue(type, value) {
  const converters = {
    [OptionType.String]: v => v,
    [OptionType.Integer]: v => isNaN(parseInt(v)) ? null : parseInt(v),
    [OptionType.Number]: v => isNaN(parseFloat(v)) ? null : parseFloat(v),
    [OptionType.Boolean]: v => ['true','yes','1'].includes(v.toLowerCase()),
    [OptionType.User]: v => v.match(/<@!?(\d+)>/)?.at(1) || v,
    [OptionType.Channel]: v => v.match(/<#(\d+)>/)?.at(1) || v,
    [OptionType.Role]: v => v.match(/<@&(\d+)>/)?.at(1) || v,
    [OptionType.Mentionable]: v => v.replace(/\D/g, ''),
    [OptionType.Attachment]: () => null
  };
  
  return converters[type]?.(value) ?? value;
}

function createOptionResolver(values, message, client) {
  return {
    get: (name) => values[name],
    getString: (name) => String(values[name] || ''),
    getInteger: (name) => Number.isSafeInteger(values[name]) ? values[name] : null,
    getNumber: (name) => typeof values[name] === 'number' ? values[name] : null,
    getBoolean: (name) => Boolean(values[name]),
    getUser: (name) => client.users.resolve(values[name]),
    getMember: (name) => message.guild?.members.resolve(values[name]),
    getChannel: (name) => client.channels.resolve(values[name]),
    getRole: (name) => message.guild?.roles.resolve(values[name]),
    getMentionable: (name) => 
      client.users.resolve(values[name]) || 
      message.guild?.roles.resolve(values[name]),
    getAttachment: () => message.attachments.first()?.url
  };
}

function createEmptyOptions() {
  return {
    get: () => null,
    getString: () => '',
    getInteger: () => null,
    getNumber: () => null,
    getBoolean: () => false,
    getUser: () => null,
    getMember: () => null,
    getChannel: () => null,
    getRole: () => null,
    getMentionable: () => null,
    getAttachment: () => null,
    getSubcommand: () => null
  };
}

function getBaseContext(message, client) {
  return {
    user: message.author,
    member: message.member,
    channel: message.channel,
    guild: message.guild,
    client
  };
}

function handleCommandError(message, cmd, error) {
  console.error(`[CMD] ${cmd}:`, error.stack || error);
  message.reply({
    content: `Error: ${error.message}`,
    allowedMentions: { repliedUser: false }
  }).catch(() => {});
}