const { EmbedBuilder } = require('discord.js');
const { removeMoney, getUser } = require('../utils/database');

const OWNER_ID = '1213365471693246504';

module.exports = {
  name: 'takemoney',
  aliases: ['removemoney','ambil','tm'],
  description: '[OWNER] Ambil uang dari user',
  async execute(message, args) {
    if (message.author.id !== OWNER_ID) {
      return message.reply({ embeds:[
        new EmbedBuilder().setTitle('🚫 Akses Ditolak').setColor('#e74c3c')
          .setDescription('Command ini hanya untuk **Owner** bot!').setTimestamp()
      ]});
    }
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target || isNaN(amount) || amount <= 0)
      return message.reply('Format: `!takemoney @user <jumlah>`');

    const result = removeMoney(target.id, amount);
    if (!result) {
      const u = getUser(target.id);
      return message.reply({ embeds:[
        new EmbedBuilder().setTitle('❌ Saldo Tidak Cukup').setColor('#e74c3c')
          .setDescription(`**${target.username}** hanya punya **$${u.balance.toLocaleString()}**`).setTimestamp()
      ]});
    }

    const embed = new EmbedBuilder()
      .setTitle('💰 Uang Diambil Owner')
      .setColor('#e67e22')
      .setThumbnail(target.displayAvatarURL({dynamic:true}))
      .addFields(
        { name:'👤 Target',    value:`${target}`,                              inline:true },
        { name:'💸 Diambil',   value:`**$${amount.toLocaleString()}**`,        inline:true },
        { name:'💰 Sisa',      value:`**$${result.balance.toLocaleString()}**`, inline:true },
      )
      .setTimestamp();
    message.reply({ embeds:[embed] });
  },
};
