const { EmbedBuilder } = require('discord.js');
const { addMoney, getUser } = require('../utils/database');

const OWNER_ID = '1213365471693246504';

module.exports = {
  name: 'givemoney',
  aliases: ['addmoney','kasih','gm'],
  description: '[OWNER] Beri uang ke user',
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
      return message.reply('Format: `!givemoney @user <jumlah>`');

    const updated = addMoney(target.id, amount);
    const embed   = new EmbedBuilder()
      .setTitle('💸 Owner Memberi Uang!')
      .setColor('#2ecc71')
      .setThumbnail(target.displayAvatarURL({dynamic:true}))
      .setImage('https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif')
      .addFields(
        { name:'👤 Penerima',   value:`${target}`,                               inline:true },
        { name:'💵 Jumlah',     value:`**$${amount.toLocaleString()}**`,          inline:true },
        { name:'💰 Saldo Baru', value:`**$${updated.balance.toLocaleString()}**`, inline:true },
      )
      .setFooter({text:'Dilakukan oleh Owner'})
      .setTimestamp();
    message.reply({ embeds:[embed] });
  },
};
