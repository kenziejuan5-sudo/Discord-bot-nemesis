const { EmbedBuilder } = require('discord.js');
const { ANIMALS } = require('../utils/animals');
const { getUser } = require('../utils/database');

const RARITY_COLORS = { Common:'#95a5a6', Uncommon:'#2ecc71', Rare:'#3498db', Epic:'#9b59b6', Legendary:'#e74c3c' };
const RARITY_EMOJI  = { Common:'⚪', Uncommon:'🟢', Rare:'🔵', Epic:'🟣', Legendary:'🔴' };
const RARITY_ORDER  = ['Legendary','Epic','Rare','Uncommon','Common'];

module.exports = {
  name: 'huntinfo',
  aliases: ['animalinfo','bestiary','hi'],
  description: 'Info lengkap semua hewan yang bisa diburu',
  async execute(message, args) {
    const user = getUser(message.author.id);

    // Detail satu hewan
    if (args[0]) {
      const animal = ANIMALS.find(a => a.id === args[0].toLowerCase());
      if (!animal) return message.reply(`❌ Hewan \`${args[0]}\` tidak ada! Cek \`!huntinfo\` untuk daftar.`);

      const owned = (user.animals||[]).filter(a => a.id === animal.id).length;

      const embed = new EmbedBuilder()
        .setTitle(`${animal.emoji} ${animal.name}`)
        .setColor(RARITY_COLORS[animal.rarity])
        .setImage(animal.image)
        .setDescription(`> ${animal.description}`)
        .addFields(
          { name:'⭐ Rarity',       value:`${RARITY_EMOJI[animal.rarity]} **${animal.rarity}**`,  inline:true },
          { name:'💰 Nilai Jual',   value:`**$${animal.value.toLocaleString()}**`,                 inline:true },
          { name:'🎯 Catch Rate',   value:`**${Math.round(animal.catchRate*100)}%**`,              inline:true },
          { name:'🔑 ID',           value:`\`${animal.id}\``,                                     inline:true },
          { name:'📦 Dimiliki',     value:`**${owned}x**`,                                        inline:true },
        )
        .setFooter({ text:'!hunt untuk berburu • !sell '+animal.id+' untuk jual' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // List semua hewan per rarity
    const ownedMap = {};
    for (const a of (user.animals||[])) ownedMap[a.id] = (ownedMap[a.id]||0)+1;

    const embed = new EmbedBuilder()
      .setTitle('📖 Bestiary — Semua Hewan')
      .setColor('#f39c12')
      .setImage('https://media.giphy.com/media/3oFzmkkwkFyTEkbVM4/giphy.gif')
      .setDescription(
        `Koleksimu: **${Object.keys(ownedMap).length}/${ANIMALS.length}** jenis\n` +
        `Ketik \`!huntinfo <id>\` untuk foto & detail lengkap`
      )
      .setTimestamp();

    for (const rarity of RARITY_ORDER) {
      const list = ANIMALS.filter(a => a.rarity === rarity);
      const lines = list.map(a => {
        const owned = ownedMap[a.id] ? ` *(×${ownedMap[a.id]})*` : '';
        return `${a.emoji} \`${a.id}\`${owned} — **$${a.value.toLocaleString()}** (${Math.round(a.catchRate*100)}%)`;
      }).join('\n');
      embed.addFields({ name:`${RARITY_EMOJI[rarity]} ${rarity} (${list.length} hewan)`, value:lines, inline:false });
    }

    embed.setFooter({ text:'!hunt untuk mulai berburu!' });
    message.reply({ embeds: [embed] });
  },
};
