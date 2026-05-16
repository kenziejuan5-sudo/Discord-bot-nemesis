const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser, isVip } = require('../utils/database');
const { randCD, checkCD, fmtRemaining } = require('../utils/cooldown');

const FISH_LIST = [
  { name: '🐟 Ikan Mas',      value: 200,   rarity: 'Common',    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Freshwater_fish.jpg/640px-Freshwater_fish.jpg' },
  { name: '🐠 Ikan Nemo',     value: 500,   rarity: 'Uncommon',  image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Amphiprioninae_clownfish.jpg/640px-Amphiprioninae_clownfish.jpg' },
  { name: '🐡 Ikan Buntal',   value: 700,   rarity: 'Uncommon',  image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Arothron_meleagris2.jpg/640px-Arothron_meleagris2.jpg' },
  { name: '🦈 Hiu Mini',      value: 3000,  rarity: 'Rare',      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/White_shark.jpg/640px-White_shark.jpg' },
  { name: '🐙 Gurita',        value: 2500,  rarity: 'Rare',      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Octopus2.jpg/640px-Octopus2.jpg' },
  { name: '🦞 Lobster Emas',  value: 8000,  rarity: 'Epic',      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Lobster_NSRW.png/640px-Lobster_NSRW.png' },
  { name: '🐋 Paus Kerdil',   value: 20000, rarity: 'Legendary', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Sperm_whale_pod.jpg/640px-Sperm_whale_pod.jpg' },
  { name: '🥾 Sepatu Usang',  value: 10,    rarity: 'Junk',      image: null },
  { name: '🗑️ Sampah Plastik',value: 0,     rarity: 'Junk',      image: null },
];

const RARITY_COLORS = { Common: '#95a5a6', Uncommon: '#2ecc71', Rare: '#3498db', Epic: '#9b59b6', Legendary: '#e74c3c', Junk: '#636e72' };

module.exports = {
  name: 'fish',
  aliases: ['pancing', 'mancing'],
  description: 'Pergi memancing (cd: 5–10 hari)',
  async execute(message) {
    const user = getUser(message.author.id);
    const now  = Date.now();

    const hasRod  = user.inventory?.some(i => i.id === 'fishing_rod');
    const baitInv = user.inventory?.find(i => i.id === 'bait' && (i.usesLeft || 0) > 0);

    if (!hasRod) {
      const embed = new EmbedBuilder()
        .setTitle('🎣 Butuh Joran Pancing!')
        .setColor('#e74c3c')
        .setImage('https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif')
        .setDescription('Kamu tidak bisa memancing tanpa joran!\nBeli **🎣 Joran Pancing** di `!shop buy fishing_rod` — **$500**')
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }
    if (!baitInv) {
      const embed = new EmbedBuilder()
        .setTitle('🪱 Butuh Umpan!')
        .setColor('#e74c3c')
        .setImage('https://media.giphy.com/media/3oFzm1FKRmHxhPTnXq/giphy.gif')
        .setDescription('Umpanmu habis! Beli **🪱 Umpan Ikan** di `!shop buy bait` — **$100** (10 umpan)')
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const savedCD = user.lastFishCD || randCD();
    const { onCD, remaining, resetAt } = checkCD(user.lastFish, savedCD);

    if (onCD) {
      const embed = new EmbedBuilder()
        .setTitle('🎣 Menunggu Ikan Kembali...')
        .setColor('#3498db')
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setImage('https://media.giphy.com/media/l4FGrYKtP0pBGpBAY/giphy.gif')
        .setDescription(`Ikan di area ini perlu waktu untuk kembali!\nMancing lagi dalam **${fmtRemaining(remaining)}**`)
        .addFields(
          { name: '📅 Bisa Mancing Lagi', value: `<t:${Math.floor(resetAt/1000)}:F>`, inline: true },
          { name: '⏳ Sisa',              value: `<t:${Math.floor(resetAt/1000)}:R>`, inline: true },
          { name: '🪱 Umpan Tersisa',     value: `**${baitInv.usesLeft}x**`,          inline: true },
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // Kurangi umpan
    baitInv.usesLeft--;
    if (baitInv.usesLeft <= 0) user.inventory = user.inventory.filter(i => i.id !== 'bait');

    const rand = Math.random() * 100;
    let fish;
    if      (rand < 2)  fish = FISH_LIST[6];
    else if (rand < 7)  fish = FISH_LIST[5];
    else if (rand < 20) fish = FISH_LIST[Math.random() < 0.5 ? 3 : 4];
    else if (rand < 45) fish = FISH_LIST[Math.random() < 0.5 ? 1 : 2];
    else if (rand < 80) fish = FISH_LIST[0];
    else                fish = FISH_LIST[Math.random() < 0.5 ? 7 : 8];

    const vip = isVip(message.author.id) || message.author.id === '1213365471693246504';
    const earned = vip ? Math.floor(fish.value * 1.25) : fish.value;

    user.balance += earned;
    const newCD = randCD();
    user.lastFish   = now;
    user.lastFishCD = newCD;
    saveUser(message.author.id, user);

    const isJunk = fish.rarity === 'Junk';
    const embed = new EmbedBuilder()
      .setTitle(isJunk ? `🤦 Dapat ${fish.name}...` : `🎣 Dapat ${fish.name}!`)
      .setColor(RARITY_COLORS[fish.rarity])
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '⭐ Rarity',        value: `**${fish.rarity}**`,                   inline: true },
        { name: '💰 Dijual Seharga',value: `**$${earned.toLocaleString()}**`,       inline: true },
        { name: '💳 Saldo',         value: `**$${user.balance.toLocaleString()}**`, inline: true },
        { name: '🪱 Sisa Umpan',    value: `**${baitInv ? baitInv.usesLeft : 0}x**`, inline: true },
        { name: '⏳ Cooldown',      value: `5 detik`,    inline: true },
        { name: '📅 Mancing Lagi',  value: `<t:${Math.floor((now+newCD)/1000)}:R>`,inline: true },
      )
      .setFooter({ text: vip ? '👑 VIP: +25% nilai ikan!' : 'Beli VIP untuk +25% nilai ikan' })
      .setTimestamp();

    if (fish.image) embed.setImage(fish.image);

    message.reply({ embeds: [embed] });
  },
};
