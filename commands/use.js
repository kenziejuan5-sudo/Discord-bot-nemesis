const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser, addVip } = require('../utils/database');

const OWNER_ID = '1213365471693246504';

const TREASURES = [
  { name:'🪙 Koin Emas Kuno',  reward:800,   img:'https://media.giphy.com/media/3o7TKSjyyM5M0wz7Xu/giphy.gif' },
  { name:'💎 Berlian Merah',   reward:2000,  img:'https://media.giphy.com/media/l4FGFEMFEt2sCpDRK/giphy.gif' },
  { name:'🏴‍☠️ Peti Bajak Laut', reward:5000,  img:'https://media.giphy.com/media/26BGqfMnHoFmBFTCg/giphy.gif' },
  { name:'🏺 Harta Firaun',    reward:10000, img:'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = {
  name: 'use',
  aliases: ['pakai','gunakan','u'],
  description: 'Gunakan item dari inventory',
  async execute(message, args) {
    const user   = getUser(message.author.id);
    const itemId = args[0]?.toLowerCase();

    if (!itemId) return message.reply('❌ Format: `!use <item_id>`\nKetik `!inventory` untuk lihat item kamu.');

    const hasItem = (user.inventory||[]).find(i => i.id === itemId);
    if (!hasItem) return message.reply(`❌ Kamu tidak punya \`${itemId}\`! Ketik \`!inventory\``);

    // ── TREASURE MAP ──────────────────────────────────────────
    if (itemId === 'treasure_map') {
      const searching = await message.reply({ embeds:[
        new EmbedBuilder().setTitle('🗺️ Mencari Harta...').setColor('#f39c12')
          .setImage('https://media.giphy.com/media/3o7TKuylMTETn1tMGQ/giphy.gif')
          .setDescription('⛏️ Kamu mengikuti peta harta...\n🔍 Menggali di lokasi rahasia...')
          .setTimestamp()
      ]});
      await sleep(2500);

      const t       = TREASURES[Math.floor(Math.random() * TREASURES.length)];
      const bonus   = Math.floor(Math.random() * t.reward * 0.5);
      const total   = t.reward + bonus;
      user.balance += total;
      const inv = user.inventory.find(i => i.id === 'treasure_map');
      inv.usesLeft = (inv.usesLeft||1) - 1;
      if (inv.usesLeft <= 0) user.inventory = user.inventory.filter(i => i.id !== 'treasure_map');
      saveUser(message.author.id, user);

      await searching.edit({ embeds:[
        new EmbedBuilder().setTitle(`🎉 Harta Ditemukan: ${t.name}!`)
          .setColor('#f1c40f').setImage(t.img)
          .addFields(
            { name:'💰 Nilai Harta',   value:`**$${t.reward.toLocaleString()}**`,  inline:true },
            { name:'✨ Bonus Luck',    value:`**+$${bonus.toLocaleString()}**`,    inline:true },
            { name:'💎 Total',         value:`**$${total.toLocaleString()}**`,     inline:true },
            { name:'💳 Saldo Baru',    value:`**$${user.balance.toLocaleString()}**`, inline:true },
          ).setTimestamp()
      ]});
      return;
    }

    // ── VIP PASS ──────────────────────────────────────────────
    if (itemId === 'vip_pass') {
      user.inventory = (user.inventory||[]).filter(i => i.id !== 'vip_pass');
      const until = addVip(message.author.id, 86400000);
      saveUser(message.author.id, user);

      const embed = new EmbedBuilder()
        .setTitle('👑 VIP Pass Aktif!')
        .setColor('#f1c40f')
        .setImage('https://media.giphy.com/media/l4FGFEMFEt2sCpDRK/giphy.gif')
        .setDescription('🌟 Semua benefit VIP aktif selama **24 jam**!\n\n• Transfer 0% pajak (`!pay`)\n• Hunt +20% catch rate\n• Slots taruhan +20%\n• Coinflip win rate 52%\n• Race speed boost\n• Boost Daily ekstra')
        .addFields(
          { name:'⏳ Berakhir', value:`<t:${Math.floor(until/1000)}:R>`, inline:true },
          { name:'📅 Tanggal',  value:`<t:${Math.floor(until/1000)}:F>`, inline:true },
        ).setTimestamp();
      return message.reply({ embeds:[embed] });
    }

    // ── LUCKY CHARM ───────────────────────────────────────────
    if (itemId === 'lucky_charm') {
      const inv = (user.inventory||[]).find(i => i.id === 'lucky_charm');
      if (!inv?.usesLeft) return message.reply('❌ Jimat kamu sudah habis! Beli lagi di `!shop`');
      inv.usesLeft--;
      if (inv.usesLeft <= 0) user.inventory = user.inventory.filter(i => i.id !== 'lucky_charm');
      user.luckyCharmActive = (user.luckyCharmActive||0) + 1;
      saveUser(message.author.id, user);

      const embed = new EmbedBuilder()
        .setTitle('🍀 Jimat Keberuntungan Aktif!')
        .setColor('#2ecc71')
        .setImage('https://media.giphy.com/media/3oz8xZvvOZRmKay4xy/giphy.gif')
        .setDescription('✨ Luck-mu meningkat untuk aksi berikutnya!\n> Bonus luck aktif di `!hunt`, `!slots`, `!coinflip`')
        .addFields({ name:'🪄 Sisa Penggunaan', value:`**${inv.usesLeft}x**`, inline:true })
        .setTimestamp();
      return message.reply({ embeds:[embed] });
    }

    // ── ENERGY DRINK ──────────────────────────────────────────
    if (itemId === 'energy_drink') {
      user.inventory = (user.inventory||[]).filter(i => i.id !== 'energy_drink');
      user.lastWork  = null;
      user.lastWorkCooldown = null;
      saveUser(message.author.id, user);

      const embed = new EmbedBuilder()
        .setTitle('⚡ Energy Drink Dikonsumsi!')
        .setColor('#f39c12')
        .setImage('https://media.giphy.com/media/26BGqfMnHoFmBFTCg/giphy.gif')
        .setDescription('💪 Kamu langsung segar! Cooldown `!work` di-reset!\n> Gunakan `!work` sekarang!')
        .setTimestamp();
      return message.reply({ embeds:[embed] });
    }

    // ── ROBBERY MASK ──────────────────────────────────────────
    if (itemId === 'robbery_mask') {
      const inv = (user.inventory||[]).find(i => i.id === 'robbery_mask');
      if (!inv) return message.reply('❌ Kamu tidak punya Topeng Perampok!');
      user.hasMask = true;
      saveUser(message.author.id, user);

      const embed = new EmbedBuilder()
        .setTitle('🎭 Topeng Perampok Dipakai!')
        .setColor('#e74c3c')
        .setDescription('😈 Kamu siap merampok! Chance sukses +20% aktif untuk `!rob` berikutnya!')
        .setTimestamp();
      return message.reply({ embeds:[embed] });
    }

    message.reply(`❌ Item \`${itemId}\` tidak bisa dipakai manual. Beberapa item aktif otomatis saat digunakan.`);
  },
};
