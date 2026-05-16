const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser, loadDB, isAdmin } = require('../utils/database');

const OWNER_ID = '1213365471693246504';

function guard(message) {
  if (!isAdmin(message.author.id, OWNER_ID)) {
    message.reply({ embeds:[
      new EmbedBuilder().setTitle('🚫 Akses Ditolak').setColor('#e74c3c')
        .setDescription('Command ini hanya untuk **Owner** atau **Admin** bot!').setTimestamp()
    ]});
    return false;
  }
  return true;
}

module.exports = {
  name: 'admin',
  aliases: ['op'],
  description: '[ADMIN] Panel admin bot',
  async execute(message, args) {
    if (!guard(message)) return;
    const sub = args[0]?.toLowerCase();

    if (sub === 'setbal' || sub === 'setbalance') {
      const target = message.mentions.users.first();
      const amount = parseInt(args[2]);
      if (!target || isNaN(amount)) return message.reply('Format: `!admin setbal @user <jumlah>`');
      const user = getUser(target.id); user.balance = amount; saveUser(target.id, user);
      return message.reply({ embeds:[
        new EmbedBuilder().setTitle('✅ Saldo Diset').setColor('#2ecc71')
          .setThumbnail(target.displayAvatarURL({dynamic:true}))
          .setDescription(`Saldo **${target.username}** diset menjadi **$${amount.toLocaleString()}**`)
          .setTimestamp()
      ]});
    }

    if (sub === 'setbank') {
      const target = message.mentions.users.first();
      const amount = parseInt(args[2]);
      if (!target || isNaN(amount)) return message.reply('Format: `!admin setbank @user <jumlah>`');
      const user = getUser(target.id); user.bank = amount; saveUser(target.id, user);
      return message.reply({ embeds:[
        new EmbedBuilder().setTitle('✅ Bank Diset').setColor('#2ecc71')
          .setDescription(`Bank **${target.username}** diset ke **$${amount.toLocaleString()}**`).setTimestamp()
      ]});
    }

    if (sub === 'reset') {
      const target = message.mentions.users.first();
      if (!target) return message.reply('Format: `!admin reset @user`');
      saveUser(target.id, { balance:0, bank:0, animals:[], lastDaily:null, lastHunt:null, lastWork:null });
      return message.reply({ embeds:[
        new EmbedBuilder().setTitle('♻️ Data Direset').setColor('#e67e22')
          .setDescription(`Semua data ekonomi **${target.username}** direset ke nol.`).setTimestamp()
      ]});
    }

    if (sub === 'giveitem') {
      const target = message.mentions.users.first();
      const itemId = args[2]?.toLowerCase();
      if (!target || !itemId) return message.reply('Format: `!admin giveitem @user <item_id>`');
      const user = getUser(target.id);
      if (!user.inventory) user.inventory = [];
      user.inventory.push({ id:itemId, quantity:1, usesLeft:null, boughtAt:Date.now() });
      saveUser(target.id, user);
      return message.reply({ embeds:[
        new EmbedBuilder().setTitle('✅ Item Diberikan').setColor('#2ecc71')
          .setDescription(`\`${itemId}\` berhasil diberikan ke **${target.username}**`).setTimestamp()
      ]});
    }

    if (sub === 'giveanimal') {
      const target   = message.mentions.users.first();
      const animalId = args[2]?.toLowerCase();
      if (!target || !animalId) return message.reply('Format: `!admin giveanimal @user <animal_id>`');
      const user = getUser(target.id);
      if (!user.animals) user.animals = [];
      user.animals.push({ id:animalId, caughtAt:Date.now() });
      saveUser(target.id, user);
      return message.reply({ embeds:[
        new EmbedBuilder().setTitle('✅ Hewan Diberikan').setColor('#2ecc71')
          .setDescription(`Hewan \`${animalId}\` diberikan ke **${target.username}**`).setTimestamp()
      ]});
    }

    if (sub === 'resetcd') {
      const target = message.mentions.users.first();
      const cdType = args[2]?.toLowerCase() || 'all';
      if (!target) return message.reply('Format: `!admin resetcd @user [all/hunt/work/daily/slots/race/bj/cf]`');
      const user = getUser(target.id);
      if (cdType === 'all' || cdType === 'hunt')  { user.lastHunt = null; user.lastHuntCD = null; }
      if (cdType === 'all' || cdType === 'work')  { user.lastWork = null; user.lastWorkCooldown = null; }
      if (cdType === 'all' || cdType === 'daily') { user.lastDaily = null; }
      if (cdType === 'all' || cdType === 'slots') { user.lastSlots = null; user.lastSlotsCD = null; }
      if (cdType === 'all' || cdType === 'race')  { user.lastRace = null; user.lastRaceCD = null; }
      if (cdType === 'all' || cdType === 'bj')    { user.lastBJ = null; user.lastBJCD = null; }
      if (cdType === 'all' || cdType === 'cf')    { user.lastCF = null; user.lastCFCD = null; }
      if (cdType === 'all' || cdType === 'fish')  { user.lastFish = null; user.lastFishCD = null; }
      if (cdType === 'all' || cdType === 'rob')   { user.lastRob = null; user.lastRobCD = null; }
      saveUser(target.id, user);
      return message.reply({ embeds:[
        new EmbedBuilder().setTitle('⏱️ Cooldown Direset').setColor('#2ecc71')
          .setDescription(`Cooldown **${cdType}** milik **${target.username}** berhasil direset!`).setTimestamp()
      ]});
    }

    if (sub === 'stats') {
      const db      = loadDB();
      const users   = Object.values(db);
      const total   = users.length;
      const money   = users.reduce((s,u) => s+(u.balance||0)+(u.bank||0), 0);
      const animals = users.reduce((s,u) => s+(u.animals?.length||0), 0);
      const items   = users.reduce((s,u) => s+(u.inventory?.length||0), 0);
      const vips    = users.filter(u => u.vipUntil && u.vipUntil > Date.now()).length;

      return message.reply({ embeds:[
        new EmbedBuilder().setTitle('📊 Server Economy Stats').setColor('#9b59b6')
          .setThumbnail(message.guild?.iconURL({dynamic:true}))
          .addFields(
            { name:'👥 Total Pemain',   value:`**${total}**`,                        inline:true },
            { name:'💰 Uang Beredar',   value:`**$${money.toLocaleString()}**`,       inline:true },
            { name:'📈 Rata-rata',      value:`**$${Math.floor(money/(total||1)).toLocaleString()}**`, inline:true },
            { name:'🦁 Total Hewan',    value:`**${animals}**`,                      inline:true },
            { name:'🎒 Total Item',     value:`**${items}**`,                        inline:true },
            { name:'👑 VIP Aktif',      value:`**${vips}**`,                         inline:true },
          ).setFooter({text:'Data realtime'}).setTimestamp()
      ]});
    }

    // DEFAULT: tampilkan panel
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Admin Panel')
      .setColor('#e74c3c')
      .setDescription([
        '`!admin setbal @user <jml>` — Set saldo kas',
        '`!admin setbank @user <jml>` — Set saldo bank',
        '`!admin reset @user` — Reset semua data',
        '`!admin giveitem @user <id>` — Beri item gratis',
        '`!admin giveanimal @user <id>` — Beri hewan gratis',
        '`!admin resetcd @user [all/hunt/work/daily/...]` — Reset cooldown',
        '`!admin stats` — Statistik server',
      ].join('\n')).setTimestamp();
    message.reply({ embeds:[embed] });
  },
};
