const { ApplicationCommandOptionType } = require('discord.js');

module.exports = {
  name: 'messageCreate',
  execute(message, client) {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const parseArgs = (input) => {
      const args = [];
      let current = '';
      let inQuotes = false;
      for (const char of input) {
        if (char === '"') {
          if (inQuotes) args.push(current);
          inQuotes = !inQuotes;
          current = '';
        } else if (char === ' ' && !inQuotes) {
          if (current) args.push(current);
          current = '';
        } else current += char;
      }
      return current ? [...args, current] : args;
    };

    // Type converters
    const converters = {
      [ApplicationCommandOptionType.String]: v => v,
      [ApplicationCommandOptionType.Integer]: v => parseInt(v),
      [ApplicationCommandOptionType.Number]: v => parseFloat(v),
      [ApplicationCommandOptionType.Boolean]: v => ['true', 'yes', '1'].includes(v.toLowerCase()),
      [ApplicationCommandOptionType.User]: v => v.replace(/\D/g, ''),
      [ApplicationCommandOptionType.Channel]: v => v.replace(/\D/g, ''),
      [ApplicationCommandOptionType.Role]: v => v.replace(/\D/g, '')
    };

    const [cmd, ...args] = parseArgs(message.content.slice(1));
    const command = client.commands.get(cmd?.toLowerCase());
    if (!command) return;

    const options = {};
    let subcommand = null;

    // sub
    if (command.data.options?.some(opt => opt.type === ApplicationCommandOptionType.Subcommand)) {
      const potentialSubcommand = args[0]?.toLowerCase();
      subcommand = command.data.options.find(
        opt => opt.type === ApplicationCommandOptionType.Subcommand && opt.name.toLowerCase() === potentialSubcommand
      );
      if (subcommand) {
        args.shift();
      }
    }

    const targetOptions = subcommand ? subcommand.options || [] : command.data.options || [];
    targetOptions.forEach((opt, i) => {
      if (!args[i] && opt.required) throw new Error(`Missing ${opt.name}`);
      options[opt.name] = converters[opt.type]?.(args[i]) ?? args[i];
    });

    const interaction = {
      options: {
        get: n => options[n],
        getString: n => String(options[n]),
        getInteger: n => parseInt(options[n]),
        getNumber: n => Number(options[n]),
        getBoolean: n => Boolean(options[n]),
        getUser: n => client.users.resolve(options[n]),
        getChannel: n => client.channels.resolve(options[n]),
        getRole: n => message.guild?.roles.resolve(options[n]),
        getSubcommand: () => subcommand?.name || null
      },
      reply: r => message.reply(r)
    };

    try {
      if (subcommand && command.subcommands?.[subcommand.name]) {
        command.subcommands[subcommand.name](interaction);
      } else {
        command.execute(interaction);
      }
    } catch (e) {
      message.reply(`Error: ${e.message}`);
    }
  }
};