const { EmbedBuilder } = require('discord.js');
const { getUser, loadDB, isVip, isAdmin, getVipInfo } = require('../utils/database');
const { getAnimalById } = require('../utils/animals');
const { fmtRemaining } = require('../utils/cooldown');

const OWNER_ID = '1213365471693246504';

module.exports = {
  name: 'profile',
  aliases: ['profil', 'stats', 'me', 'p'],
  description: 'Profil lengkap dengan semua stats',
  async execute(message, args) {
    const target    = message.mentions.users.first() || message.author;
    const user      = getUser(target.id);
    const now       = Date.now();

    const isOwnerBit = target.id === OWNER_ID;
    const isAdminBit = isAdmin(target.id, OWNER_ID);
    const isVipBit   = isVip(target.id);
    const vipInfo    = getVipInfo(target.id);

    const badge = isOwnerBit ? '👑 **Owner**' : isAdminBit ? '🛡️ **Admin**' : isVipBit ? '⭐ **VIP**' : '👤 **Member**';
    const color = isOwnerBit ? '#f1c40f'  : isAdminBit ? '#e74c3c' : isVipBit ? '#9b59b6' : '#3498db';

    // Rank
    const db     = loadDB();
    const sorted = Object.entries(db)
      .map(([id, d]) => ({ id, total: (d.balance||0)+(d.bank||0) }))
      .sort((a, b) => b.total - a.total);
    const rank   = sorted.findIndex(e => e.id === target.id) + 1;

    // Zoo
    const animals  = user.animals || [];
    const zooVal   = animals.reduce((s, a) => s + (getAnimalById(a.id)?.value||0), 0);
    const rarityRank = ['Legendary','Epic','Rare','Uncommon','Common'];
    let rarestAnimal = null;
    for (const r of rarityRank) {
      const found = animals.find(a => getAnimalById(a.id)?.rarity === r);
      if (found) { rarestAnimal = getAnimalById(found.id); break; }
    }

    // Count by rarity
    const rarityCounts = {};
    for (const a of animals) {
      const info = getAnimalById(a.id);
      if (info) rarityCounts[info.rarity] = (rarityCounts[info.rarity]||0) + 1;
    }

    // Net worth
    const netWorth = (user.balance||0) + (user.bank||0) + zooVal;

    // CD helper
    function fmtCD(last, savedCD, fallback) {
      if (!last) return '✅ Ready';
      const cd  = savedCD || fallback;
      const rem = cd - (now - last);
      if (rem <= 0) return '✅ Ready';
      return `⏳ <t:${Math.floor((last+cd)/1000)}:R>`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🪪 Profil — ${target.username}`)
      .setColor(color)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `> ${badge} • 🏆 Rank **#${rank}**/${sorted.length}\n` +
        (isVipBit && vipInfo ? `> 👑 VIP hingga <t:${Math.floor(vipInfo.until/1000)}:R>\n` : '') +
        `> 💎 Net Worth: **$${netWorth.toLocaleString()}**`
      )
      .addFields(
        { name: '╔══ 💰 KEUANGAN', value:
          `💵 Kas: **$${(user.balance||0).toLocaleString()}**\n` +
          `🏦 Bank: **$${(user.bank||0).toLocaleString()}**\n` +
          `🦁 Zoo: **$${zooVal.toLocaleString()}**`,
          inline: true },
        { name: '╔══ 📊 STATISTIK', value:
          `🏆 Rank: **#${rank}**\n` +
          `🔥 Streak: **${user.dailyStreak||0} minggu**\n` +
          `🎒 Items: **${(user.inventory||[]).length}**`,
          inline: true },
        { name: '╔══ 🦁 ZOO', value:
          `📦 Total: **${animals.length} hewan**\n` +
          `🔴 Legendary: **${rarityCounts['Legendary']||0}**\n` +
          `🟣 Epic: **${rarityCounts['Epic']||0}** • 🔵 Rare: **${rarityCounts['Rare']||0}**`,
          inline: false },
        { name: '╔══ ⏱️ COOLDOWNS', value:
          `🎁 Daily: ${fmtCD(user.lastDaily, null, 7*86400000)}\n` +
          `🏹 Hunt: ${fmtCD(user.lastHunt, user.lastHuntCD, 5*86400000)}\n` +
          `💼 Work: ${fmtCD(user.lastWork, user.lastWorkCooldown, 5*86400000)}\n` +
          `🎰 Slots: ${fmtCD(user.lastSlots, user.lastSlotsCD, 5*86400000)}\n` +
          `🃏 Blackjack: ${fmtCD(user.lastBJ, user.lastBJCD, 5*86400000)}\n` +
          `🏁 Race: ${fmtCD(user.lastRace, user.lastRaceCD, 5*86400000)}`,
          inline: false },
      )
      .setFooter({ text: `ID: ${target.id} • !cooldowns untuk detail semua CD` })
      .setTimestamp();

    if (rarestAnimal) {
      embed.addFields({ name: '🌟 Hewan Terlangka', value: `${rarestAnimal.emoji} **${rarestAnimal.name}** (${rarestAnimal.rarity})`, inline: false });
      embed.setImage(rarestAnimal.image);
    }

    message.reply({ embeds: [embed] });
  },
};
