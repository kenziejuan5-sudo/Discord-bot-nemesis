const { EmbedBuilder } = require('discord.js');
const { loadDB, isVip } = require('../utils/database');
const { getAnimalById } = require('../utils/animals');

const OWNER_ID = '1213365471693246504';

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'top', 'ranking', 'rich'],
  description: 'Leaderboard ekonomi server',
  async execute(message, args) {
    const mode = args[0]?.toLowerCase() || 'money';
    const db   = loadDB();

    let entries, title, desc, footerNote;

    if (mode === 'zoo') {
      entries = Object.entries(db)
        .map(([id, d]) => ({ id, val: (d.animals||[]).length }))
        .filter(e => e.val > 0)
        .sort((a, b) => b.val - a.val).slice(0, 10);
      title     = '🦁 Leaderboard Zoo Terbesar';
      footerNote = 'Berburu hewan dengan !hunt';
    } else if (mode === 'net') {
      entries = Object.entries(db)
        .map(([id, d]) => {
          const zoo = (d.animals||[]).reduce((s,a)=>s+(getAnimalById(a.id)?.value||0),0);
          return { id, val: (d.balance||0)+(d.bank||0)+zoo };
        })
        .sort((a, b) => b.val - a.val).slice(0, 10);
      title     = '💎 Leaderboard Net Worth';
      footerNote = 'Net worth = kas + bank + nilai zoo';
    } else {
      entries = Object.entries(db)
        .map(([id, d]) => ({ id, val: (d.balance||0)+(d.bank||0) }))
        .sort((a, b) => b.val - a.val).slice(0, 10);
      title     = '🏆 Leaderboard Terkaya';
      footerNote = '!lb zoo • !lb net untuk kategori lain';
    }

    if (!entries.length) return message.reply('Belum ada data leaderboard!');

    const medals  = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    const lines   = entries.map((e, i) => {
      const vipTag = isVip(e.id) || e.id === OWNER_ID ? ' 👑' : '';
      const valStr = mode === 'zoo' ? `${e.val} hewan` : `$${e.val.toLocaleString()}`;
      return `${medals[i]} <@${e.id}>${vipTag}\n  ╰ **${valStr}**`;
    }).join('\n');

    // Top user banner
    const topId    = entries[0]?.id;
    let topAvatar  = null;
    try {
      const topUser = await message.client.users.fetch(topId);
      topAvatar     = topUser.displayAvatarURL({ dynamic: true });
    } catch (_) {}

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor('#f1c40f')
      .setDescription(lines)
      .setThumbnail(topAvatar || message.guild?.iconURL({ dynamic: true }))
      .setImage('https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif')
      .addFields({ name: '\u200b', value: `🖥️ Server: **${message.guild?.name}** • 👥 ${Object.keys(db).length} pemain terdaftar` })
      .setFooter({ text: footerNote })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
