const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, saveUser, isVip } = require('../utils/database');

const OWNER_ID = '1213365471693246504';

const SHOP_ITEMS = [
  { id:'fishing_rod',    name:'🎣 Joran Pancing',        emoji:'🎣', type:'tool',       price:500,   description:'Wajib untuk !fish. Tahan selamanya.',    image:'https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif' },
  { id:'hunting_rifle',  name:'🔫 Senapan Berburu',       emoji:'🔫', type:'tool',       price:2000,  description:'+20% catch rate saat !hunt.',            image:'https://media.giphy.com/media/3oEjI6iBCLz1JSSMNq/giphy.gif' },
  { id:'lucky_charm',    name:'🍀 Jimat Keberuntungan',   emoji:'🍀', type:'consumable', price:1500,  description:'Boost luck di semua game. 10x pakai.',   uses:10,  image:'https://media.giphy.com/media/3oz8xZvvOZRmKay4xy/giphy.gif' },
  { id:'treasure_map',   name:'🗺️ Peta Harta Karun',     emoji:'🗺️', type:'consumable', price:800,   description:'Temukan harta $500–$5000. 1x pakai.',    uses:1,   image:'https://media.giphy.com/media/3o7TKSjyyM5M0wz7Xu/giphy.gif' },
  { id:'vip_pass',       name:'👑 VIP Pass (24 jam)',     emoji:'👑', type:'boost',      price:8000,  description:'Semua VIP benefit aktif 24 jam.',        duration:86400000, image:'https://media.giphy.com/media/l4FGFEMFEt2sCpDRK/giphy.gif' },
  { id:'bait',           name:'🪱 Umpan Ikan (10x)',      emoji:'🪱', type:'consumable', price:100,   description:'Dibutuhkan untuk !fish. 10 umpan.',      uses:10,  image:'https://media.giphy.com/media/3oFzmkkwkFyTEkbVM4/giphy.gif' },
  { id:'energy_drink',   name:'⚡ Energy Drink',          emoji:'⚡', type:'consumable', price:3000,  description:'Reset cooldown !work 1x.',               uses:1,   image:'https://media.giphy.com/media/26BGqfMnHoFmBFTCg/giphy.gif' },
  { id:'robbery_mask',   name:'🎭 Topeng Perampok',       emoji:'🎭', type:'tool',       price:2500,  description:'+20% success rate !rob.',                image:'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
];

function getItemById(id) { return SHOP_ITEMS.find(i => i.id === id); }

module.exports = {
  name: 'shop',
  aliases: ['toko', 'store', 's'],
  description: 'Toko item ekonomi',
  SHOP_ITEMS,
  getItemById,
  async execute(message, args) {
    const user = getUser(message.author.id);
    const sub  = args[0]?.toLowerCase();
    const vip  = isVip(message.author.id) || message.author.id === OWNER_ID;

    // ── BUY ──────────────────────────────────────────────────
    if (sub === 'buy' || sub === 'beli') {
      const item = getItemById(args[1]?.toLowerCase());
      if (!item) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Item Tidak Ditemukan')
          .setColor('#e74c3c')
          .setDescription(`Item \`${args[1]}\` tidak ada di toko.\nKetik \`!shop\` untuk melihat semua item.`)
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }

      const finalPrice = vip ? Math.floor(item.price * 0.9) : item.price; // VIP diskon 10%
      if (user.balance < finalPrice) {
        const embed = new EmbedBuilder()
          .setTitle('💸 Saldo Tidak Cukup!')
          .setColor('#e74c3c')
          .setImage(item.image)
          .setDescription(`Kamu butuh **$${finalPrice.toLocaleString()}** untuk beli **${item.name}**!\nSaldo kamu: **$${user.balance.toLocaleString()}**`)
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }

      user.balance -= finalPrice;
      if (!user.inventory) user.inventory = [];
      const existing = user.inventory.find(i => i.id === item.id);
      if (existing) {
        existing.quantity = (existing.quantity||1) + 1;
        if (item.uses) existing.usesLeft = (existing.usesLeft||0) + item.uses;
      } else {
        user.inventory.push({ id:item.id, quantity:1, usesLeft:item.uses||null, boughtAt:Date.now() });
      }
      saveUser(message.author.id, user);

      const embed = new EmbedBuilder()
        .setTitle(`✅ Berhasil Membeli ${item.emoji} ${item.name}!`)
        .setColor('#2ecc71')
        .setImage(item.image)
        .setDescription(`> ${item.description}`)
        .addFields(
          { name: '💸 Harga',         value: `**$${finalPrice.toLocaleString()}**${vip?' *(VIP -10%)*':''}`, inline: true },
          { name: '💳 Saldo Sisa',    value: `**$${user.balance.toLocaleString()}**`,  inline: true },
          { name: '🎒 Di Inventory',  value: `**${(user.inventory.find(i=>i.id===item.id)?.quantity||1)}x**`, inline: true },
        )
        .setFooter({ text: '!inventory untuk lihat item • !use <id> untuk pakai' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── SELL ─────────────────────────────────────────────────
    if (sub === 'sell' || sub === 'jual') {
      const item = getItemById(args[1]?.toLowerCase());
      if (!item) return message.reply('❌ Item tidak ditemukan!');
      const idx = (user.inventory||[]).findIndex(i => i.id === item.id);
      if (idx === -1) return message.reply(`❌ Kamu tidak punya **${item.name}**!`);
      const sellPrice = Math.floor(item.price * 0.5);
      user.inventory.splice(idx, 1);
      user.balance += sellPrice;
      saveUser(message.author.id, user);
      const embed = new EmbedBuilder()
        .setTitle(`💸 ${item.emoji} Dijual!`)
        .setColor('#e67e22')
        .setDescription(`**${item.name}** dijual seharga **$${sellPrice.toLocaleString()}** (50% harga beli)`)
        .addFields({ name: '💳 Saldo Baru', value: `**$${user.balance.toLocaleString()}**`, inline: true })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── INFO item ─────────────────────────────────────────────
    if (sub === 'info' && args[1]) {
      const item = getItemById(args[1].toLowerCase());
      if (!item) return message.reply('❌ Item tidak ditemukan!');
      const owned = (user.inventory||[]).find(i => i.id === item.id);
      const embed = new EmbedBuilder()
        .setTitle(`${item.emoji} ${item.name}`)
        .setColor('#3498db')
        .setImage(item.image)
        .setDescription(`> ${item.description}`)
        .addFields(
          { name: '💰 Harga Beli',  value: `**$${item.price.toLocaleString()}**`, inline: true },
          { name: '💸 Harga Jual',  value: `**$${Math.floor(item.price*0.5).toLocaleString()}**`, inline: true },
          { name: '📦 Dimiliki',    value: owned ? `**${owned.quantity}x**${owned.usesLeft?` (${owned.usesLeft} uses)`:''}` : '**0**', inline: true },
          { name: '🏷️ Tipe',        value: `**${item.type}**`, inline: true },
        )
        .setFooter({ text: vip ? '👑 VIP diskon 10% harga beli!' : 'VIP mendapat diskon 10%' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── DEFAULT tampilkan toko ────────────────────────────────
    const grouped = { tool: [], consumable: [], boost: [] };
    for (const item of SHOP_ITEMS) grouped[item.type]?.push(item);

    const typeData = {
      tool:       { label:'🔧 Alat (Permanen)', color:'#3498db' },
      consumable: { label:'🧪 Consumable',      color:'#2ecc71' },
      boost:      { label:'⚡ Boost',            color:'#f1c40f' },
    };

    const embed = new EmbedBuilder()
      .setTitle('🛍️ Toko Item Economy')
      .setColor('#9b59b6')
      .setImage('https://media.giphy.com/media/3oEjI6iBCLz1JSSMNq/giphy.gif')
      .setDescription(
        `💳 Saldo kamu: **$${user.balance.toLocaleString()}**\n` +
        (vip ? `👑 **VIP Diskon 10%** aktif di semua item!\n` : '') +
        `\n\`!shop buy <id>\` — Beli • \`!shop sell <id>\` — Jual • \`!shop info <id>\` — Detail`
      )
      .setTimestamp();

    for (const [type, items] of Object.entries(grouped)) {
      if (!items.length) continue;
      const finalItems = items.map(i => {
        const fp = vip ? Math.floor(i.price * 0.9) : i.price;
        const owned = (user.inventory||[]).find(inv => inv.id === i.id);
        const ownedStr = owned ? ` *(punya ${owned.quantity}x)*` : '';
        return `${i.emoji} \`${i.id}\` **${i.name}**${ownedStr}\n  └ **$${fp.toLocaleString()}**${vip?` ~~$${i.price.toLocaleString()}~~`:''} • ${i.description}`;
      }).join('\n\n');
      embed.addFields({ name: typeData[type].label, value: finalItems, inline: false });
    }

    message.reply({ embeds: [embed] });
  },
};
