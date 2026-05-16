const { EmbedBuilder } = require('discord.js');
const { getUser } = require('../utils/database');
const { getAnimalById, ANIMALS } = require('../utils/animals');

const RARITY_EMOJI = { Legendary:'🔴', Epic:'🟣', Rare:'🔵', Uncommon:'🟢', Common:'⚪' };
const RARITY_ORDER = ['Legendary','Epic','Rare','Uncommon','Common'];

module.exports = {
  name: 'zoo',
  aliases: ['koleksi', 'animals', 'z'],
  description: 'Lihat koleksi hewan di zoo',
  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const user   = getUser(target.id);

    if (!(user.animals?.length)) {
      const embed = new EmbedBuilder()
        .setTitle(`🏕️ Zoo ${target.username}`)
        .setColor('#7f8c8d')
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setImage('https://media.giphy.com/media/3oFzmkkwkFyTEkbVM4/giphy.gif')
        .setDescription(
          '## 🏜️ Zoo ini masih kosong!\n' +
          '> Gunakan `!hunt` untuk mulai berburu hewan.\n' +
          '> Ketik `!huntinfo` untuk lihat semua hewan yang bisa ditangkap.'
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // Hitung per hewan
    const counts = {};
    for (const a of user.animals) counts[a.id] = (counts[a.id]||0) + 1;

    // Kelompok per rarity
    const grouped = {};
    for (const [id, qty] of Object.entries(counts)) {
      const info = getAnimalById(id);
      if (!info) continue;
      if (!grouped[info.rarity]) grouped[info.rarity] = [];
      grouped[info.rarity].push({ info, qty });
    }

    const totalVal = user.animals.reduce((s,a)=>s+(getAnimalById(a.id)?.value||0),0);
    const totalUniq = Object.keys(counts).length;
    const totalAll  = ANIMALS.length;

    // Rarest
    let topAnimal = null;
    for (const r of RARITY_ORDER) {
      if (grouped[r]?.length) { topAnimal = grouped[r][0].info; break; }
    }

    const embed = new EmbedBuilder()
      .setTitle(`🦁 Zoo — ${target.username}`)
      .setColor('#f39c12')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `📦 **${user.animals.length} hewan** tersimpan • 🌿 **${totalUniq}/${totalAll}** jenis\n` +
        `💰 Total nilai: **$${totalVal.toLocaleString()}**`
      );

    for (const rarity of RARITY_ORDER) {
      if (!grouped[rarity]) continue;
      const lines = grouped[rarity]
        .sort((a,b) => b.info.value - a.info.value)
        .map(({info, qty}) =>
          `${info.emoji} **${info.name}** ×${qty} — $${(info.value*qty).toLocaleString()}`
        ).join('\n');
      embed.addFields({ name:`${RARITY_EMOJI[rarity]} ${rarity} (${grouped[rarity].length} jenis)`, value:lines, inline:false });
    }

    if (topAnimal) embed.setImage(topAnimal.image);
    embed
      .setFooter({ text: '!sell <id> jual 1 • !sell <id> all jual semua • !gift @user <id> hadiahkan' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
