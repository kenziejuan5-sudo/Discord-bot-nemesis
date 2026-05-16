const { EmbedBuilder } = require('discord.js');
const { getUser, loadDB, isVip, isAdmin } = require('../utils/database');
const { getAnimalById } = require('../utils/animals');

const OWNER_ID = '1213365471693246504';

module.exports = {
  name: 'balance',
  aliases: ['bal', 'wallet', 'dompet', 'saldo'],
  description: 'Lihat saldo kamu atau user lain',
  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const user   = getUser(target.id);
    const now    = Date.now();

    // Hitung rank
    const db     = loadDB();
    const sorted = Object.entries(db)
      .map(([id, d]) => ({ id, total: (d.balance||0) + (d.bank||0) }))
      .sort((a, b) => b.total - a.total);
    const rank   = sorted.findIndex(e => e.id === target.id) + 1;
    const total  = (user.balance||0) + (user.bank||0);

    // Role badge
    const isOwnerBit = target.id === OWNER_ID;
    const isAdminBit = isAdmin(target.id, OWNER_ID);
    const isVipBit   = isVip(target.id);
    const badge = isOwnerBit ? '👑 Owner' : isAdminBit ? '🛡️ Admin' : isVipBit ? '⭐ VIP' : '👤 Member';
    const color = isOwnerBit ? '#f1c40f' : isAdminBit ? '#e74c3c' : isVipBit ? '#9b59b6' : '#3498db';

    // Hitung zoo value
    const zooVal = (user.animals||[]).reduce((s, a) => s + (getAnimalById(a.id)?.value||0), 0);

    // Progress bar saldo (vs #1)
    const top = sorted[0]?.total || 1;
    const pct = Math.min(Math.round((total / top) * 20), 20);
    const bar = '█'.repeat(pct) + '░'.repeat(20 - pct);

    const embed = new EmbedBuilder()
      .setTitle(`💳 Dompet — ${target.username}`)
      .setColor(color)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `> ${badge} • 🏆 Rank **#${rank}** dari **${sorted.length}** pemain\n` +
        `> \`${bar}\` ${Math.round((total/top)*100)}% dari #1`
      )
      .addFields(
        { name: '💵 Kas',          value: `**$${(user.balance||0).toLocaleString()}**`,  inline: true },
        { name: '🏦 Bank',         value: `**$${(user.bank||0).toLocaleString()}**`,     inline: true },
        { name: '💎 Total',        value: `**$${total.toLocaleString()}**`,              inline: true },
        { name: '🦁 Nilai Zoo',    value: `**$${zooVal.toLocaleString()}**`,             inline: true },
        { name: '🎒 Items',        value: `**${(user.inventory||[]).length} item**`,     inline: true },
        { name: '🔥 Streak',       value: `**${user.dailyStreak||0} minggu**`,          inline: true },
      )
      .setFooter({ text: `ID: ${target.id} • !profile untuk info lengkap` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
