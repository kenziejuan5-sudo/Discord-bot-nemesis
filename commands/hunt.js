const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser, isVip } = require('../utils/database');
const { getRandomAnimal } = require('../utils/animals');
const { randCD, checkCD, fmtRemaining } = require('../utils/cooldown');

const RARITY_COLORS = {
  Common:    '#95a5a6',
  Uncommon:  '#2ecc71',
  Rare:      '#3498db',
  Epic:      '#9b59b6',
  Legendary: '#e74c3c',
};

const RARITY_BANNER = {
  Common:    'https://media.giphy.com/media/3oFzmkkwkFyTEkbVM4/giphy.gif',
  Uncommon:  'https://media.giphy.com/media/l0HlTy9x8FZo0XO1i/giphy.gif',
  Rare:      'https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif',
  Epic:      'https://media.giphy.com/media/l4FGFEMFEt2sCpDRK/giphy.gif',
  Legendary: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
};

module.exports = {
  name: 'hunt',
  aliases: ['berburu', 'buru', 'h'],
  description: 'Berburu hewan liar (cd: 5–10 hari)',
  async execute(message) {
    const user = getUser(message.author.id);
    const now  = Date.now();

    const savedCD = randCD();
    const { onCD, remaining, resetAt } = checkCD(user.lastHunt, savedCD);

    if (onCD) {
      const embed = new EmbedBuilder()
        .setTitle('🏕️ Masih Istirahat dari Berburu')
        .setColor('#e67e22')
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setImage('https://media.giphy.com/media/3o7TKuylMTETn1tMGQ/giphy.gif')
        .setDescription(`Tubuhmu masih lelah setelah perjalanan berburu!\nIstirahatlah **${fmtRemaining(remaining)}** lagi.`)
        .addFields(
          { name: '📅 Bisa Hunt Lagi', value: `<t:${Math.floor(resetAt / 1000)}:F>`, inline: true },
          { name: '⏳ Sisa Waktu',     value: `<t:${Math.floor(resetAt / 1000)}:R>`, inline: true },
        )
        .setFooter({ text: '💡 Tip: Gunakan !daily untuk reward tanpa nunggu lama' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const animal  = getRandomAnimal();
    const vip     = isVip(message.author.id) || message.author.id === '1213365471693246504';
    const catchMult = vip ? 1.2 : 1.0;
    const caught  = Math.random() < (animal.catchRate * catchMult);

    
    const newCD = randCD();
    user.lastHunt   = now;
    user.lastHuntCD = newCD;
    
    saveUser(message.author.id, user);

    if (!caught) {
      const embed = new EmbedBuilder()
        .setTitle('💨 Hewan Berhasil Kabur!')
        .setColor('#7f8c8d')
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setImage(animal.image)
        .setDescription(`Kamu hampir menangkap **${animal.name}** tapi dia kabur dengan cepat!`)
        .addFields(
          { name: '🎯 Target',       value: `${animal.emoji} **${animal.name}**`,  inline: true },
          { name: '⭐ Rarity',        value: `**${animal.rarity}**`,               inline: true },
          { name: '❌ Status',        value: '**Gagal Ditangkap**',                 inline: true },
          { name: '⏳ Cooldown Baru', value: `5 detik`,  inline: true },
          { name: '📅 Hunt Lagi',    value: `<t:${Math.floor((now + newCD)/1000)}:R>`, inline: true },
        )
        .setFooter({ text: '🔫 Beli Senapan di !shop untuk tingkatkan catch rate!' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (!user.animals) user.animals = [];
    user.animals.push({ id: animal.id, caughtAt: now });
    saveUser(message.author.id, user);

    const rarityStars = { Common: '⚪', Uncommon: '🟢', Rare: '🔵', Epic: '🟣', Legendary: '🔴' };

    const embed = new EmbedBuilder()
      .setTitle(`🎯 ${animal.name} Berhasil Ditangkap!`)
      .setColor(RARITY_COLORS[animal.rarity])
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setImage(animal.image)
      .setDescription(`> ${animal.description}`)
      .addFields(
        { name: '⭐ Rarity',         value: `${rarityStars[animal.rarity]} **${animal.rarity}**`, inline: true },
        { name: '💰 Nilai Jual',     value: `**$${animal.value.toLocaleString()}**`,               inline: true },
        { name: '🎒 Total Koleksi',  value: `**${user.animals.length} hewan**`,                    inline: true },
        { name: '⏳ Cooldown',       value: `5 detik`,                  inline: true },
        { name: '📅 Hunt Lagi',      value: `<t:${Math.floor((now + newCD)/1000)}:R>`,             inline: true },
      )
      .setFooter({ text: '🦁 !zoo untuk lihat koleksi • !sell <id> untuk jual' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
