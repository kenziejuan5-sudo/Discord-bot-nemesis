const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser, isVip } = require('../utils/database');
const { checkCD, fmtRemaining } = require('../utils/cooldown');

const CD_MS = 7 * 24 * 60 * 60 * 1000;

module.exports = {
  name: 'daily',
  aliases: ['claim', 'hadir'],
  description: 'Ambil reward mingguan (cooldown 7 hari)',
  async execute(message) {
    const user = getUser(message.author.id);
    const now  = Date.now();
    const { onCD, remaining, resetAt } = checkCD(user.lastDaily, CD_MS);

    if (onCD) {
      const embed = new EmbedBuilder()
        .setTitle('⏳ Reward Sudah Diambil!')
        .setColor('#e74c3c')
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `Kamu sudah ambil reward minggu ini.\n` +
          `Kembali lagi dalam **${fmtRemaining(remaining)}**`
        )
        .addFields(
          { name: '📅 Reset Pada', value: `<t:${Math.floor(resetAt / 1000)}:F>`, inline: true },
          { name: '⏳ Sisa',       value: `<t:${Math.floor(resetAt / 1000)}:R>`, inline: true },
        )
        .setImage('https://media.giphy.com/media/3o7TKRn1qXZOAQbdSo/giphy.gif')
        .setFooter({ text: 'Gunakan !hunt atau !gamble untuk penghasilan tambahan' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const vip    = isVip(message.author.id) || message.author.id === '1213365471693246504';
    const streak = (user.dailyStreak || 0) + 1;
    const base   = Math.floor(Math.random() * 3000) + 2000;
    const streakBonus = streak >= 7 ? Math.floor(base * 0.5) : streak >= 3 ? Math.floor(base * 0.2) : 0;
    const vipBonus    = vip ? Math.floor(base * 0.3) : 0;
    const total       = base + streakBonus + vipBonus;

    user.balance    += total;
    user.lastDaily   = now;
    user.dailyStreak = streak;
    saveUser(message.author.id, user);

    const filledBars = Math.min(streak, 7);
    const streakBar  = '🟩'.repeat(filledBars) + '⬛'.repeat(7 - filledBars);

    const embed = new EmbedBuilder()
      .setTitle('🎁 Weekly Reward Claimed!')
      .setColor('#f1c40f')
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setImage('https://media.giphy.com/media/xT9IgG50Lg7russbMQ/giphy.gif')
      .setDescription(`✨ Selamat **${message.author.username}**, reward mingguanmu siap!`)
      .addFields(
        { name: '💵 Reward Dasar',      value: `**$${base.toLocaleString()}**`,        inline: true },
        { name: '🔥 Bonus Streak',      value: streakBonus > 0 ? `**+$${streakBonus.toLocaleString()}**` : '`—`', inline: true },
        { name: '👑 Bonus VIP',         value: vipBonus > 0    ? `**+$${vipBonus.toLocaleString()}**`    : '`—`', inline: true },
        { name: '💰 Total Diterima',    value: `**$${total.toLocaleString()}**`,        inline: true },
        { name: '💳 Saldo Baru',        value: `**$${user.balance.toLocaleString()}**`, inline: true },
        { name: `🔥 Streak Progress (${streak}/7)`, value: streakBar, inline: false },
      )
      .setFooter({ text: streak >= 7 ? '🌟 MAX STREAK! +50% bonus aktif!' : `${7 - streak} minggu lagi untuk streak max!` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
