require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

// ── Load commands (single export & array export) ─────────────
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

let loadedCount = 0;
for (const file of commandFiles) {
  try {
    const exported = require(path.join(commandsPath, file));
    const cmds     = Array.isArray(exported) ? exported : [exported];
    for (const cmd of cmds) {
      if (!cmd?.name) continue;
      client.commands.set(cmd.name, cmd);
      if (cmd.aliases) for (const alias of cmd.aliases) client.commands.set(alias, cmd);
      loadedCount++;
    }
  } catch (err) {
    console.error(`[LOAD ERROR] ${file}:`, err.message);
  }
}

console.log(`📦 ${loadedCount} commands dimuat dari ${commandFiles.length} file`);

// ── Status cycling ────────────────────────────────────────────
const STATUSES = [
  { text: '💰 Economy Bot | nighthelp',    type: ActivityType.Playing  },
  { text: '🎰 nightslots nightblackjack', type: ActivityType.Playing  },
  { text: '🦁 nighthunt untuk hewan rare!', type: ActivityType.Watching },
  { text: '👑 nightvipinfo untuk cek VIP',  type: ActivityType.Playing  },
  { text: '📊 nightleaderboard top server', type: ActivityType.Watching },
];
let statusIdx = 0;

client.once('ready', () => {
  console.log(`\n✅ Bot online: ${client.user.tag}`);
  console.log(`🌐 ${client.guilds.cache.size} server\n`);

  // Rotate status setiap 30 detik
  setInterval(() => {
    const s = STATUSES[statusIdx % STATUSES.length];
    client.user.setActivity(s.text, { type: s.type });
    statusIdx++;
  }, 30000);
  client.user.setActivity(STATUSES[0].text, { type: STATUSES[0].type });
});

// ── Message handler ───────────────────────────────────────────
const PREFIX     = process.env.PREFIX || 'night';
const COOLDOWN_MAP = new Map(); // anti-spam: 1 command per 1.5 detik per user

client.on('messageCreate', async (message) => {
  if (message.author.bot)                    return;
  if (!message.content.startsWith(PREFIX))   return;

  // Anti-spam sederhana
  const key = `${message.author.id}`;
  if (COOLDOWN_MAP.has(key)) return;
  COOLDOWN_MAP.set(key, true);
  setTimeout(() => COOLDOWN_MAP.delete(key), 1500);

  const args        = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command     = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(`[CMD ERROR] ${commandName}:`, error);
    try {
      await message.reply({
        embeds: [{
          title: '❌ Terjadi Error',
          description: `Command \`!${commandName}\` mengalami error!\n\`\`\`${error.message?.slice(0,200)}\`\`\``,
          color: 0xe74c3c,
          timestamp: new Date().toISOString(),
        }]
      });
    } catch (_) {}
  }
});

// ── Anti-crash ────────────────────────────────────────────────
process.on('unhandledRejection', err => console.error('[UNHANDLED]', err));
process.on('uncaughtException',  err => console.error('[UNCAUGHT]', err));

client.login(process.env.TOKEN);
