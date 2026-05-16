const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser, isVip } = require('../utils/database');

const OWNER_ID = '1213365471693246504';

module.exports = {
  name: 'bank',
  aliases: ['b'],
  description: 'Kelola bank kamu',
  async execute(message, args) {
    const user = getUser(message.author.id);
    const sub  = args[0]?.toLowerCase();
    const vip  = isVip(message.author.id) || message.author.id === OWNER_ID;

    if (!sub) {
      const total = (user.balance||0) + (user.bank||0);
      const bankPct = total > 0 ? Math.round(((user.bank||0)/total)*100) : 0;
      const cashPct = 100 - bankPct;
      const embed = new EmbedBuilder()
        .setTitle(`🏦 Bank — ${message.author.username}`)
        .setColor('#2980b9')
        .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
        .setImage('https://media.giphy.com/media/xT9IgG50Lg7russbMQ/giphy.gif')
        .addFields(
          { name:'💵 Kas',     value:`**$${(user.balance||0).toLocaleString()}** (${cashPct}%)`, inline:true },
          { name:'🏦 Bank',    value:`**$${(user.bank||0).toLocaleString()}** (${bankPct}%)`,    inline:true },
          { name:'💎 Total',   value:`**$${total.toLocaleString()}**`,                           inline:true },
        )
        .setDescription(
          '**Commands:**\n' +
          '`!bank deposit <jml|all>` — Setor ke bank\n' +
          '`!bank withdraw <jml|all>` — Tarik dari bank\n' +
          `\`!bank transfer @user <jml>\` — Transfer${vip?' **(VIP: 0% pajak)**':' (pajak 5%)'}`
        )
        .setFooter({ text: vip ? '👑 VIP: transfer tanpa pajak! Gunakan !pay' : 'VIP: transfer 0% pajak — !addvip' })
        .setTimestamp();
      return message.reply({ embeds:[embed] });
    }

    if (['deposit','setor','dep'].includes(sub)) {
      const dep = args[1]?.toLowerCase() === 'all' ? user.balance : parseInt(args[1]);
      if (!dep || dep <= 0 || isNaN(dep)) return message.reply('❌ Format: `!bank deposit <jumlah|all>`');
      if ((user.balance||0) < dep) return message.reply(`❌ Kas kamu hanya **$${(user.balance||0).toLocaleString()}**!`);
      user.balance -= dep; user.bank = (user.bank||0) + dep;
      saveUser(message.author.id, user);
      return message.reply({ embeds:[
        new EmbedBuilder().setTitle('🏦 Setor ke Bank Berhasil!').setColor('#2ecc71')
          .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
          .addFields(
            { name:'💸 Disetor',  value:`**$${dep.toLocaleString()}**`,               inline:true },
            { name:'💵 Kas',      value:`**$${(user.balance||0).toLocaleString()}**`, inline:true },
            { name:'🏦 Bank',     value:`**$${(user.bank||0).toLocaleString()}**`,    inline:true },
          ).setTimestamp()
      ]});
    }

    if (['withdraw','tarik','wd','ambil'].includes(sub)) {
      const wd = args[1]?.toLowerCase() === 'all' ? user.bank : parseInt(args[1]);
      if (!wd || wd <= 0 || isNaN(wd)) return message.reply('❌ Format: `!bank withdraw <jumlah|all>`');
      if ((user.bank||0) < wd) return message.reply(`❌ Bank kamu hanya **$${(user.bank||0).toLocaleString()}**!`);
      user.bank -= wd; user.balance = (user.balance||0) + wd;
      saveUser(message.author.id, user);
      return message.reply({ embeds:[
        new EmbedBuilder().setTitle('💵 Tarik dari Bank Berhasil!').setColor('#2ecc71')
          .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
          .addFields(
            { name:'💸 Ditarik', value:`**$${wd.toLocaleString()}**`,                inline:true },
            { name:'💵 Kas',     value:`**$${(user.balance||0).toLocaleString()}**`, inline:true },
            { name:'🏦 Bank',    value:`**$${(user.bank||0).toLocaleString()}**`,    inline:true },
          ).setTimestamp()
      ]});
    }

    if (['transfer','kirim'].includes(sub)) {
      const target = message.mentions.users.first();
      const tf     = parseInt(args[2]);
      if (!target || !tf || tf <= 0) return message.reply('❌ Format: `!bank transfer @user <jumlah>`');
      if (target.id === message.author.id) return message.reply('❌ Tidak bisa transfer ke diri sendiri!');
      if ((user.balance||0) < tf) return message.reply(`❌ Kas kamu hanya **$${(user.balance||0).toLocaleString()}**!`);

      const tax      = vip ? 0 : Math.floor(tf * 0.05);
      const received = tf - tax;

      user.balance -= tf;
      saveUser(message.author.id, user);
      const recv = getUser(target.id);
      recv.balance = (recv.balance||0) + received;
      saveUser(target.id, recv);

      return message.reply({ embeds:[
        new EmbedBuilder().setTitle('💸 Transfer Berhasil!').setColor('#3498db')
          .setThumbnail(target.displayAvatarURL({dynamic:true}))
          .addFields(
            { name:'👤 Penerima',   value:`${target}`,                              inline:true },
            { name:'💵 Dikirim',    value:`**$${tf.toLocaleString()}**`,             inline:true },
            { name:'🏛️ Pajak',      value:vip?'**$0** 👑 VIP!':`**$${tax.toLocaleString()}**`, inline:true },
            { name:'✅ Diterima',   value:`**$${received.toLocaleString()}**`,        inline:true },
            { name:'💳 Sisa Kas',   value:`**$${(user.balance||0).toLocaleString()}**`, inline:true },
          ).setFooter({text: vip?'👑 VIP: 0% pajak!':'Gunakan !pay (VIP) untuk 0% pajak'}).setTimestamp()
      ]});
    }

    message.reply('❌ Sub-command tidak dikenal. Ketik `!bank` untuk bantuan.');
  },
};
