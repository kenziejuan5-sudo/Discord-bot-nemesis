const { EmbedBuilder } = require('discord.js');
const { getUser } = require('../utils/database');
const { SHOP_ITEMS } = require('./shop');

function getItemMeta(id) { return SHOP_ITEMS.find(i => i.id === id); }

module.exports = {
  name: 'inventory',
  aliases: ['inv','bag','tas','i'],
  description: 'Lihat inventory kamu',
  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const user   = getUser(target.id);

    if (!(user.inventory?.length)) {
      const embed = new EmbedBuilder()
        .setTitle(`🎒 Inventory — ${target.username}`)
        .setColor('#7f8c8d')
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setImage('https://media.giphy.com/media/3o7TKuylMTETn1tMGQ/giphy.gif')
        .setDescription('## 🛒 Inventory kosong!\n> Beli item di `!shop`')
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const TYPE_ICON = { tool:'🔧', consumable:'🧪', boost:'⚡', unknown:'📦' };

    let totalValue = 0;
    const lines = user.inventory.map(inv => {
      const meta = getItemMeta(inv.id);
      const name  = meta ? `${meta.emoji} **${meta.name}**` : `📦 **${inv.id}**`;
      const uses  = inv.usesLeft != null ? ` *(${inv.usesLeft} uses left)*` : '';
      const qty   = inv.quantity > 1 ? ` ×${inv.quantity}` : '';
      const val   = meta ? meta.price * (inv.quantity||1) * 0.5 : 0;
      totalValue += val;
      return `${name}${qty}${uses}\n  └ Tipe: **${meta?.type||'?'}** • Nilai jual: **$${val.toLocaleString()}**`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle(`🎒 Inventory — ${target.username}`)
      .setColor('#3498db')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setDescription(lines)
      .addFields({
        name: '💰 Nilai Inventory',
        value: `**$${totalValue.toLocaleString()}** (harga jual 50%)`,
        inline: false,
      })
      .setFooter({ text: '!use <id> untuk pakai • !shop sell <id> untuk jual' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
