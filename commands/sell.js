const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser } = require('../utils/database');
const { getAnimalById, ANIMALS } = require('../utils/animals');

const RARITY_COLORS = { Common:'#95a5a6', Uncommon:'#2ecc71', Rare:'#3498db', Epic:'#9b59b6', Legendary:'#e74c3c' };

module.exports = {
  name: 'sell',
  aliases: ['jual','s'],
  description: 'Jual hewan dari zoo',
  async execute(message, args) {
    const user = getUser(message.author.id);

    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setTitle('💸 Cara Jual Hewan')
        .setColor('#3498db')
        .setDescription(
          '`!sell <id>` — jual 1 hewan\n`!sell <id> all` — jual semua\n\n' +
          '**Daftar ID hewan:**\n' +
          ANIMALS.map(a=>`${a.emoji} \`${a.id}\` — **$${a.value.toLocaleString()}**`).join('\n')
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const animalId = args[0].toLowerCase();
    const sellAll  = ['all','semua'].includes(args[1]?.toLowerCase());
    const animal   = getAnimalById(animalId);

    if (!animal) {
      return message.reply({ embeds: [
        new EmbedBuilder().setTitle('❌ Hewan Tidak Ditemukan').setColor('#e74c3c')
          .setDescription(`Hewan \`${animalId}\` tidak ada. Ketik \`!sell\` untuk daftar.`).setTimestamp()
      ]});
    }

    const owned = (user.animals||[]).filter(a => a.id === animalId);
    if (!owned.length) {
      return message.reply({ embeds: [
        new EmbedBuilder().setTitle(`❌ Tidak Punya ${animal.name}`).setColor('#e74c3c')
          .setImage(animal.image).setDescription(`Kamu tidak punya **${animal.name}** di zoo!`).setTimestamp()
      ]});
    }

    const qty    = sellAll ? owned.length : 1;
    const earned = animal.value * qty;
    let removed  = 0;
    user.animals = (user.animals||[]).filter(a => {
      if (a.id === animalId && removed < qty) { removed++; return false; }
      return true;
    });
    user.balance += earned;
    saveUser(message.author.id, user);

    const remaining = (user.animals||[]).filter(a => a.id === animalId).length;

    const embed = new EmbedBuilder()
      .setTitle(`💸 ${animal.emoji} ${animal.name} Terjual!`)
      .setColor(RARITY_COLORS[animal.rarity])
      .setImage(animal.image)
      .setDescription(`Berhasil menjual **${qty}x ${animal.name}**!`)
      .addFields(
        { name:'📦 Dijual',       value:`**${qty}x**`,                           inline:true },
        { name:'💵 Pendapatan',   value:`**$${earned.toLocaleString()}**`,        inline:true },
        { name:'💳 Saldo Baru',   value:`**$${user.balance.toLocaleString()}**`,  inline:true },
        { name:'📦 Sisa di Zoo',  value:`**${remaining}x**`,                     inline:true },
        { name:'⭐ Rarity',       value:`**${animal.rarity}**`,                   inline:true },
      )
      .setFooter({ text:'!zoo untuk lihat sisa koleksi' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
