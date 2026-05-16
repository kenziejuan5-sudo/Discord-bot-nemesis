const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser } = require('../utils/database');
const { randCD, checkCD, fmtRemaining } = require('../utils/cooldown');

const SUCCESS_RATE = 0.40;
const FINE_PCT     = 0.30;

module.exports = {
  name: 'rob',
  aliases: ['rampok', 'curi'],
  description: 'Coba merampok user lain (cd: 5–10 hari)',
  async execute(message, args) {
    const target = message.mentions.users.first();
    if (!target)           return message.reply('❌ Tag user yang mau dirampok! `!rob @user`');
    if (target.id === message.author.id) return message.reply('❌ Tidak bisa merampok diri sendiri!');
    if (target.bot)        return message.reply('❌ Tidak bisa merampok bot!');

    const robber = getUser(message.author.id);
    const victim = getUser(target.id);
    const now    = Date.now();

    const savedCD = robber.lastRobCD || randCD();
    const { onCD, remaining, resetAt } = checkCD(robber.lastRob, savedCD);

    if (onCD) {
      const embed = new EmbedBuilder()
        .setTitle('🚔 Polisi Masih Memburumu!')
        .setColor('#e74c3c')
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setImage('https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif')
        .setDescription(`Terlalu berisiko untuk merampok sekarang!\nTunggu **${fmtRemaining(remaining)}** agar jejakmu hilang.`)
        .addFields(
          { name: '📅 Bisa Rampok Lagi', value: `<t:${Math.floor(resetAt/1000)}:F>`, inline: true },
          { name: '⏳ Sisa',             value: `<t:${Math.floor(resetAt/1000)}:R>`, inline: true },
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (victim.balance < 500) {
      return message.reply({ embeds: [
        new EmbedBuilder()
          .setTitle('💸 Target Terlalu Miskin!')
          .setColor('#7f8c8d')
          .setDescription(`${target.username} hanya punya **$${victim.balance.toLocaleString()}** — tidak worth dirampok! (min $500)`)
          .setTimestamp()
      ]});
    }

    const newCD = randCD();
    robber.lastRob   = now;
    robber.lastRobCD = newCD;

    const success = Math.random() < SUCCESS_RATE;

    if (success) {
      const pct    = Math.random() * 0.3 + 0.1; // 10–40%
      const stolen = Math.floor(victim.balance * pct);
      victim.balance  -= stolen;
      robber.balance  += stolen;
      saveUser(message.author.id, robber);
      saveUser(target.id, victim);

      const embed = new EmbedBuilder()
        .setTitle('🦹 Rampok Berhasil!')
        .setColor('#2ecc71')
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setImage('https://media.giphy.com/media/l0MYEI4kHUGQPEXUA/giphy.gif')
        .setDescription(`Misi sukses! Kamu berhasil mencuri dari **${target.username}**!`)
        .addFields(
          { name: '💸 Dicuri',          value: `**$${stolen.toLocaleString()}**`,        inline: true },
          { name: '💰 Saldo Kamu',      value: `**$${robber.balance.toLocaleString()}**`, inline: true },
          { name: '💵 Sisa Korban',     value: `**$${victim.balance.toLocaleString()}**`, inline: true },
          { name: '⏳ Cooldown Baru',   value: `5 detik`,      inline: true },
          { name: '📅 Rampok Lagi',     value: `<t:${Math.floor((now+newCD)/1000)}:R>`,  inline: true },
        )
        .setFooter({ text: 'Tingkat sukses: 40%' })
        .setTimestamp();

      message.reply({ embeds: [embed] });
      target.send({ embeds: [
        new EmbedBuilder().setTitle('🚨 Kamu Dirampok!')
          .setColor('#e74c3c')
          .setDescription(`**${message.author.tag}** mencuri **$${stolen.toLocaleString()}** darimu di **${message.guild?.name}**!`)
          .setTimestamp()
      ]}).catch(() => {});
    } else {
      const fine = Math.floor(robber.balance * FINE_PCT);
      robber.balance = Math.max(0, robber.balance - fine);
      saveUser(message.author.id, robber);

      const embed = new EmbedBuilder()
        .setTitle('🚔 KETANGKAP POLISI!')
        .setColor('#e74c3c')
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setImage('https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif')
        .setDescription(`Rencanamu gagal total! Polisi menangkapmu dan mendenda **$${fine.toLocaleString()}**!`)
        .addFields(
          { name: '💸 Denda',        value: `**$${fine.toLocaleString()}**`,        inline: true },
          { name: '💰 Saldo Sisa',   value: `**$${robber.balance.toLocaleString()}**`, inline: true },
          { name: '⏳ Cooldown',     value: `5 detik`,   inline: true },
          { name: '📅 Bebas',        value: `<t:${Math.floor((now+newCD)/1000)}:R>`, inline: true },
        )
        .setFooter({ text: 'Tingkat sukses: 40% • Denda gagal: 30% saldo' })
        .setTimestamp();
      message.reply({ embeds: [embed] });
    }
  },
};
