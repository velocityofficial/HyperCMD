const { ApplicationCommandOptionType: OptType } = require('discord.js');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const [cmd, ...args] = message.content.slice(1).trim().split(/\s+/);
    const command = client.commands.get(cmd.toLowerCase());
    if (!command) return;

    try {
      if (!command.data.options?.length) {
        return await command.execute({
          options: createEmptyOptions(),
          reply: (r) => message.reply(r),
          ...getContext(message, client)
        });
      }

      const options = {};
      for (let i = 0; i < command.data.options.length; i++) {
        const opt = command.data.options[i];
        if (!args[i] && opt.required) throw new Error(`Missing ${opt.name}`);
        if (!args[i]) continue;

        options[opt.name] = convertArg(opt.type, args[i]);
      }
      await command.execute({
        options: createOptionResolver(options, message, client),
        reply: (r) => message.reply(r),
        ...getContext(message, client)
      });

    } catch (err) {
      handleExecutionError(message, cmd, err);
    }
  }
};

function convertArg(type, value) {
  const conversions = {
    [OptType.String]: v => v,
    [OptType.Integer]: v => parseInt(v, 10),
    [OptType.Number]: v => parseFloat(v),
    [OptType.Boolean]: v => ['true','yes','1'].includes(v.toLowerCase()),
    [OptType.User]: v => v.match(/<@!?(\d+)>/)?.at(1) || v,
    [OptType.Channel]: v => v.match(/<#(\d+)>/)?.at(1) || v,
    [OptType.Role]: v => v.match(/<@&(\d+)>/)?.at(1) || v
  };
  return (conversions[type] || (v => v))(value);
}

function createEmptyOptions() {
  return {
    get: () => null,
    getString: () => '',
    getInteger: () => null,
    getNumber: () => null,
    getBoolean: () => false,
    getUser: () => null,
    getChannel: () => null,
    getRole: () => null
  };
}

function createOptionResolver(options, message, client) {
  return {
    get: (name) => options[name],
    getString: (name) => String(options[name] || ''),
    getInteger: (name) => Number.isSafeInteger(options[name]) ? options[name] : null,
    getNumber: (name) => !isNaN(options[name]) ? options[name] : null,
    getBoolean: (name) => Boolean(options[name]),
    getUser: (name) => client.users.resolve(options[name]),
    getChannel: (name) => client.channels.resolve(options[name]),
    getRole: (name) => message.guild?.roles.resolve(options[name])
  };
}

function getContext(message, client) {
  return {
    user: message.author,
    channel: message.channel,
    guild: message.guild,
    client
  };
}

function handleExecutionError(message, cmd, error) {
  console.error(`[CMD] ${cmd} Error:`, error);
  message.reply(`Error: ${error.message}`).catch(() => {});
}
