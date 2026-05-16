// new_commands.js — 15 Command Baru
// 1.  !mine       — Tambang mineral (cd 5-10 hari)
// 2.  !lottery    — Beli tiket lotre harian
// 3.  !market     — Pasar hewan (jual/beli antar user)
// 4.  !quest      — Ambil & selesaikan quest harian
// 5.  !crime      — Lakukan kejahatan kecil (berisiko)
// 6.  !deposit    — Alias bank deposit (shortcut)
// 7.  !withdraw   — Alias bank withdraw (shortcut)
// 8.  !tax        — Bayar pajak (5% dari kas) untuk buff
// 9.  !heist      — Merampok bank bersama (multiplayer)
// 10. !beg        — Mengemis uang kecil (cd 1 hari)
// 11. !trade @user — Tukar hewan antar user
// 12. !richest    — Tampilkan user terkaya dengan detail
// 13. !stats      — Statistik gambling pribadi
// 14. !give @user — Beri uang ke user (alias transfer)
// 15. !scratch    — Gosok kartu lucky (cd 5-10 hari)

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, saveUser, loadDB, isVip, isAdmin } = require('../utils/database');
const { getAnimalById, ANIMALS } = require('../utils/animals');
const { randCD, checkCD, fmtRemaining } = require('../utils/cooldown');

const OWNER_ID = '1213365471693246504';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════════════════════
// 1. !mine — Tambang mineral, jual hasilnya
// ═══════════════════════════════════════════════════════════════
const MINERALS = [
  { id: 'coal',     name: '🪨 Batu Bara',    value: 200,   rarity: 'Common',    chance: 40 },
  { id: 'iron',     name: '⚙️ Besi',          value: 500,   rarity: 'Common',    chance: 30 },
  { id: 'gold',     name: '🥇 Emas',          value: 1500,  rarity: 'Uncommon',  chance: 15 },
  { id: 'diamond',  name: '💎 Berlian',       value: 5000,  rarity: 'Rare',      chance: 8  },
  { id: 'ruby',     name: '❤️ Ruby',          value: 10000, rarity: 'Epic',      chance: 4  },
  { id: 'crystal',  name: '🔮 Kristal Kuno',  value: 25000, rarity: 'Legendary', chance: 2  },
  { id: 'nothing',  name: '💨 Tidak Ada',     value: 0,     rarity: 'Miss',      chance: 1  },
];

const MINE_IMAGES = {
  Common:    'https://media.giphy.com/media/3oEjI6iBCLz1JSSMNq/giphy.gif',
  Uncommon:  'https://media.giphy.com/media/26BGqfMnHoFmBFTCg/giphy.gif',
  Rare:      'https://media.giphy.com/media/l4FGFEMFEt2sCpDRK/giphy.gif',
  Epic:      'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
  Legendary: 'https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif',
  Miss:      'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
};

const RARITY_COLORS_MINE = {
  Common: '#95a5a6', Uncommon: '#2ecc71', Rare: '#3498db',
  Epic: '#9b59b6', Legendary: '#f1c40f', Miss: '#636e72',
};

function pickMineral() {
  const rand = Math.random() * 100;
  let acc = 0;
  for (const m of MINERALS) {
    acc += m.chance;
    if (rand < acc) return m;
  }
  return MINERALS[0];
}

const mineCmd = {
  name: 'mine',
  aliases: ['tambang', 'mining', 'gali'],
  description: '⛏️ Tambang mineral berharga! (cd 5-10 hari)',
  async execute(message) {
    const user = getUser(message.author.id);
    const now  = Date.now();
    const savedCD = user.lastMineCD || randCD();
    const { onCD, remaining, resetAt } = checkCD(user.lastMine, savedCD);

    if (onCD) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('⛏️ Tambang Sedang Digali Orang Lain!')
        .setColor('#e74c3c')
        .setImage('https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif')
        .setDescription(`Tambang butuh waktu untuk diisi ulang!\nKembali dalam **${fmtRemaining(remaining)}**`)
        .addFields(
          { name: '📅 Bisa Tambang', value: `<t:${Math.floor(resetAt/1000)}:F>`, inline: true },
          { name: '⏳ Sisa',         value: `<t:${Math.floor(resetAt/1000)}:R>`, inline: true },
        ).setTimestamp()
      ]});
    }

    // Animasi menggali
    const digMsg = await message.reply({ embeds: [new EmbedBuilder()
      .setTitle('⛏️ Sedang Menggali...')
      .setColor('#e67e22')
      .setDescription('```\n⛏️ Kamu masuk ke dalam tambang...\n🕯️ Menyalakan obor...\n💥 Mulai menggali dinding batu...\n```')
      .setTimestamp()
    ]});

    await sleep(2000);

    const vip     = isVip(message.author.id) || message.author.id === OWNER_ID;
    // VIP punya 10% extra chance untuk mineral lebih baik
    const mineral = vip && Math.random() < 0.1
      ? MINERALS[Math.floor(Math.random() * 3) + 2] // langsung Rare+
      : pickMineral();

    const earned  = mineral.value;
    const newCD   = randCD();
    user.balance  = (user.balance || 0) + earned;
    user.lastMine   = now;
// Simpan statistik mining
    if (!user.mineStats) user.mineStats = { total: 0, best: 0, count: 0 };
    user.mineStats.total += earned;
    user.mineStats.count += 1;
    if (earned > user.mineStats.best) user.mineStats.best = earned;
    saveUser(message.author.id, user);

    const isMiss = mineral.rarity === 'Miss';

    await digMsg.edit({ embeds: [new EmbedBuilder()
      .setTitle(isMiss ? '💨 Tambang Kosong!' : `⛏️ Menemukan ${mineral.name}!`)
      .setColor(RARITY_COLORS_MINE[mineral.rarity])
      .setImage(MINE_IMAGES[mineral.rarity])
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setDescription(isMiss
        ? '> Kamu menggali tapi tidak menemukan apapun hari ini!'
        : `> Kamu berhasil menemukan **${mineral.name}** di dalam tambang!`
      )
      .addFields(
        { name: '💎 Mineral',      value: `**${mineral.name}**`,                          inline: true },
        { name: '⭐ Rarity',       value: `**${mineral.rarity}**`,                        inline: true },
        { name: '💰 Nilai',        value: `**$${earned.toLocaleString()}**`,               inline: true },
        { name: '💳 Saldo',        value: `**$${user.balance.toLocaleString()}**`,         inline: true },
        { name: '⏳ Cooldown',     value: `**5 detik**`,        inline: true },
        { name: '📅 Tambang Lagi', value: `<t:${Math.floor((now+newCD)/1000)}:R>`,        inline: true },
        { name: '📊 Total Mining', value: `${user.mineStats.count}x • Best: **$${user.mineStats.best.toLocaleString()}**`, inline: false },
      )
      .setFooter({ text: vip ? '👑 VIP: Chance mineral rare +10%!' : 'VIP mendapat chance mineral rare lebih tinggi' })
      .setTimestamp()
    ]});
  },
};

// ═══════════════════════════════════════════════════════════════
// 2. !lottery — Beli tiket lotre, pengundian setiap 24 jam
// ═══════════════════════════════════════════════════════════════
const TICKET_PRICE = 500;

const lotteryCmd = {
  name: 'lottery',
  aliases: ['lotre', 'lotto', 'tiket'],
  description: '🎟️ Beli tiket lotre! Pengundian setiap hari',
  async execute(message, args) {
    const user = getUser(message.author.id);
    const sub  = args[0]?.toLowerCase();

    // Lihat status lotre
    if (!sub || sub === 'info' || sub === 'status') {
      const tickets = user.lotteryTickets || 0;
      const db      = loadDB();
      const totalTickets = Object.values(db).reduce((s, u) => s + (u.lotteryTickets || 0), 0);
      const jackpot = totalTickets * TICKET_PRICE * 0.8; // 80% dari total tiket terjual

      const embed = new EmbedBuilder()
        .setTitle('🎟️ Sistem Lotre')
        .setColor('#f1c40f')
        .setImage('https://media.giphy.com/media/l4FGFEMFEt2sCpDRK/giphy.gif')
        .setDescription(
          `**Harga tiket:** $${TICKET_PRICE.toLocaleString()}\n` +
          `**Jackpot saat ini:** 💰 **$${jackpot.toLocaleString()}**\n` +
          `**Total tiket terjual:** ${totalTickets}\n\n` +
          `Tiketmu: **${tickets} tiket**\n` +
          `Chance menang: **${totalTickets > 0 ? ((tickets/totalTickets)*100).toFixed(2) : 0}%**`
        )
        .addFields(
          { name: '💡 Cara Main',  value: '`!lottery buy` — beli 1 tiket ($500)\n`!lottery buy 5` — beli 5 tiket\n`!lottery draw` — cek pemenang (Owner)', inline: false },
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // Beli tiket
    if (sub === 'buy' || sub === 'beli') {
      const qty    = parseInt(args[1]) || 1;
      const cost   = TICKET_PRICE * qty;
      const vip    = isVip(message.author.id) || message.author.id === OWNER_ID;
      const finalCost = vip ? Math.floor(cost * 0.9) : cost; // VIP diskon 10%

      if ((user.balance || 0) < finalCost)
        return message.reply(`❌ Butuh **$${finalCost.toLocaleString()}** untuk ${qty} tiket! Saldo: **$${(user.balance||0).toLocaleString()}**`);

      user.balance = (user.balance || 0) - finalCost;
      user.lotteryTickets = (user.lotteryTickets || 0) + qty;
      saveUser(message.author.id, user);

      const embed = new EmbedBuilder()
        .setTitle('🎟️ Tiket Lotre Dibeli!')
        .setColor('#2ecc71')
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setDescription(`Kamu membeli **${qty} tiket lotre**!${vip ? '\n👑 VIP diskon 10% aktif!' : ''}`)
        .addFields(
          { name: '🎟️ Tiket Dibeli',   value: `**${qty}x**`,                              inline: true },
          { name: '💸 Total Bayar',    value: `**$${finalCost.toLocaleString()}**`,         inline: true },
          { name: '🎟️ Total Tiket',    value: `**${user.lotteryTickets}x**`,               inline: true },
          { name: '💳 Saldo Sisa',     value: `**$${user.balance.toLocaleString()}**`,      inline: true },
        )
        .setFooter({ text: 'Semakin banyak tiket = semakin besar chance menang!' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // Undian — hanya owner
    if (sub === 'draw' || sub === 'undian') {
      if (message.author.id !== OWNER_ID)
        return message.reply('❌ Hanya **Owner** yang bisa melakukan pengundian!');

      const db    = loadDB();
      const pool  = [];
      for (const [id, u] of Object.entries(db)) {
        for (let i = 0; i < (u.lotteryTickets || 0); i++) pool.push(id);
      }

      if (pool.length === 0) return message.reply('❌ Belum ada yang beli tiket!');

      const winnerId = pool[Math.floor(Math.random() * pool.length)];
      const jackpot  = pool.length * TICKET_PRICE * 0.8;

      // Reset semua tiket
      for (const [id, u] of Object.entries(db)) { u.lotteryTickets = 0; }

      // Beri hadiah pemenang
      db[winnerId].balance = (db[winnerId].balance || 0) + jackpot;
      require('../utils/database').saveDB(db);

      const embed = new EmbedBuilder()
        .setTitle('🎊 PEMENANG LOTRE DIUMUMKAN!')
        .setColor('#f1c40f')
        .setImage('https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif')
        .setDescription(`## 🎉 <@${winnerId}> MENANG JACKPOT!\n\n💰 **$${jackpot.toLocaleString()}**\n\nTiket direset. Beli tiket baru untuk ronde berikutnya!`)
        .setTimestamp();
      return message.channel.send({ content: '@everyone 🎟️ **PENGUMUMAN LOTRE!**', embeds: [embed] });
    }

    message.reply('Gunakan: `!lottery` / `!lottery buy <qty>` / `!lottery draw` (Owner)');
  },
};

// ═══════════════════════════════════════════════════════════════
// 3. !quest — Quest harian, selesaikan untuk reward
// ═══════════════════════════════════════════════════════════════
const QUESTS = [
  { id: 'q1', name: '🏹 Pemburu Pemula',  desc: 'Lakukan !hunt hari ini',                    reward: 1000,  field: 'lastHunt'  },
  { id: 'q2', name: '🎣 Nelayan Handal',  desc: 'Pergi memancing (!fish) hari ini',           reward: 800,   field: 'lastFish'  },
  { id: 'q3', name: '⛏️ Penambang Rajin', desc: 'Tambang mineral (!mine) hari ini',           reward: 1200,  field: 'lastMine'  },
  { id: 'q4', name: '💼 Pekerja Keras',   desc: 'Selesaikan pekerjaan (!work) hari ini',      reward: 1500,  field: 'lastWork'  },
  { id: 'q5', name: '🎰 Penjudi Beruntung', desc: 'Main slot atau gamble apapun hari ini',     reward: 2000,  field: 'lastSlots' },
];

const questCmd = {
  name: 'quest',
  aliases: ['misi', 'task'],
  description: '📋 Lihat dan klaim quest harian',
  async execute(message, args) {
    const user = getUser(message.author.id);
    const now  = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);

    // Claim reward quest
    if (args[0]?.toLowerCase() === 'claim') {
      const qId = args[1];
      const q   = QUESTS.find(q => q.id === qId);
      if (!q) return message.reply(`❌ Quest \`${qId}\` tidak ada!`);

      const completed  = user[q.field] && user[q.field] > todayStart;
      const alreadyClaimed = (user.claimedQuests || []).includes(`${qId}_${new Date().toDateString()}`);

      if (!completed) return message.reply(`❌ Quest **${q.name}** belum selesai! ${q.desc}`);
      if (alreadyClaimed) return message.reply(`❌ Quest **${q.name}** sudah diklaim hari ini!`);

      user.balance = (user.balance || 0) + q.reward;
      if (!user.claimedQuests) user.claimedQuests = [];
      user.claimedQuests.push(`${qId}_${new Date().toDateString()}`);
      // Bersihkan quest lama
      user.claimedQuests = user.claimedQuests.filter(c => c.includes(new Date().toDateString()));
      saveUser(message.author.id, user);

      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle(`✅ Quest "${q.name}" Selesai!`)
        .setColor('#2ecc71')
        .setDescription(`🎉 Kamu menyelesaikan quest dan mendapat reward!`)
        .addFields(
          { name: '📋 Quest',       value: `**${q.name}**`,                          inline: true },
          { name: '💰 Reward',      value: `**$${q.reward.toLocaleString()}**`,       inline: true },
          { name: '💳 Saldo Baru',  value: `**$${user.balance.toLocaleString()}**`,   inline: true },
        )
        .setTimestamp()
      ]});
    }

    // List quest
    const claimed = user.claimedQuests || [];
    const todayStr = new Date().toDateString();

    const lines = QUESTS.map(q => {
      const done        = user[q.field] && user[q.field] > todayStart;
      const wasClaimed  = claimed.includes(`${q.id}_${todayStr}`);
      const status      = wasClaimed ? '✅ Diklaim' : done ? '🟡 Selesai, belum diklaim' : '🔴 Belum';
      return `**${q.name}**\n  > ${q.desc}\n  > Reward: **$${q.reward.toLocaleString()}** • Status: ${status}\n  > Claim: \`!quest claim ${q.id}\``;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle('📋 Quest Harian')
      .setColor('#3498db')
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setDescription(lines)
      .setFooter({ text: 'Quest reset setiap hari tengah malam' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 4. !crime — Lakukan kejahatan kecil (berisiko, cd 5-10 hari)
// ═══════════════════════════════════════════════════════════════
const CRIMES = [
  { name: '🎭 Penipuan Online',    success: 0.50, reward: [2000, 5000],  fine: 0.20, img: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { name: '🚗 Curanmor',          success: 0.40, reward: [5000, 12000], fine: 0.30, img: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif' },
  { name: '💊 Jual Barang Palsu', success: 0.60, reward: [1000, 3000],  fine: 0.15, img: 'https://media.giphy.com/media/26BGqfMnHoFmBFTCg/giphy.gif' },
  { name: '🏦 Pemalsuan Cek',     success: 0.35, reward: [8000, 20000], fine: 0.40, img: 'https://media.giphy.com/media/l4FGrYKtP0pBGpBAY/giphy.gif' },
  { name: '💻 Hacking',           success: 0.45, reward: [3000, 10000], fine: 0.25, img: 'https://media.giphy.com/media/3oEjI6iBCLz1JSSMNq/giphy.gif' },
];

const crimeCmd = {
  name: 'crime',
  aliases: ['jahat', 'kriminal', 'cr'],
  description: '🎭 Lakukan kejahatan! Berisiko tapi menguntungkan (cd 5-10 hari)',
  async execute(message) {
    const user = getUser(message.author.id);
    const now  = Date.now();
    const savedCD = user.lastCrimeCD || randCD();
    const { onCD, remaining, resetAt } = checkCD(user.lastCrime, savedCD);

    if (onCD) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('🚔 Polisi Masih Mengintai!')
        .setColor('#e74c3c')
        .setImage('https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif')
        .setDescription(`Terlalu berbahaya untuk beraksi sekarang!\nTunggu **${fmtRemaining(remaining)}**`)
        .addFields(
          { name: '📅 Bisa Beraksi Lagi', value: `<t:${Math.floor(resetAt/1000)}:F>`, inline: true },
          { name: '⏳ Sisa',              value: `<t:${Math.floor(resetAt/1000)}:R>`, inline: true },
        ).setTimestamp()
      ]});
    }

    const crime   = CRIMES[Math.floor(Math.random() * CRIMES.length)];
    const success = Math.random() < crime.success;
    const newCD   = randCD();
    user.lastCrime   = now;
// Animasi
    const crimeMsg = await message.reply({ embeds: [new EmbedBuilder()
      .setTitle('🎭 Sedang Beraksi...')
      .setColor('#2c3e50')
      .setDescription(`> Kamu melakukan **${crime.name}**...\n> Semoga tidak ketahuan...`)
      .setTimestamp()
    ]});
    await sleep(2000);

    if (success) {
      const [mn, mx] = crime.reward;
      const earned   = Math.floor(Math.random() * (mx - mn + 1)) + mn;
      user.balance   = (user.balance || 0) + earned;
      saveUser(message.author.id, user);

      await crimeMsg.edit({ embeds: [new EmbedBuilder()
        .setTitle(`🦹 ${crime.name} — BERHASIL!`)
        .setColor('#2ecc71')
        .setImage(crime.img)
        .setDescription(`Misi kejahatan sukses! Kamu lolos tanpa tertangkap!`)
        .addFields(
          { name: '🎭 Kejahatan',    value: `**${crime.name}**`,                          inline: true },
          { name: '💰 Hasil Rampasan',value: `**$${earned.toLocaleString()}**`,            inline: true },
          { name: '💳 Saldo Baru',   value: `**$${user.balance.toLocaleString()}**`,       inline: true },
          { name: '⏳ Cooldown',     value: `5 detik`,          inline: true },
          { name: '📅 Beraksi Lagi', value: `<t:${Math.floor((now+newCD)/1000)}:R>`,      inline: true },
        )
        .setFooter({ text: `Tingkat sukses: ${Math.round(crime.success*100)}%` })
        .setTimestamp()
      ]});
    } else {
      const fine = Math.floor((user.balance || 0) * crime.fine);
      user.balance = Math.max(0, (user.balance || 0) - fine);
      saveUser(message.author.id, user);

      await crimeMsg.edit({ embeds: [new EmbedBuilder()
        .setTitle(`🚔 ${crime.name} — KETANGKAP!`)
        .setColor('#e74c3c')
        .setImage('https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif')
        .setDescription(`Polisi menangkapmu! Kamu membayar denda besar!`)
        .addFields(
          { name: '🎭 Kejahatan',   value: `**${crime.name}**`,                             inline: true },
          { name: '💸 Denda',       value: `**$${fine.toLocaleString()}** (${Math.round(crime.fine*100)}%)`, inline: true },
          { name: '💳 Saldo Sisa',  value: `**$${user.balance.toLocaleString()}**`,          inline: true },
          { name: '⏳ Cooldown',    value: `5 detik`,             inline: true },
          { name: '📅 Beraksi Lagi',value: `<t:${Math.floor((now+newCD)/1000)}:R>`,         inline: true },
        )
        .setTimestamp()
      ]});
    }
  },
};

// ═══════════════════════════════════════════════════════════════
// 5. !heist — Merampok bank bersama (multiplayer, cd 5-10 hari)
// ═══════════════════════════════════════════════════════════════
const ACTIVE_HEISTS = new Map();

const heistCmd = {
  name: 'heist',
  aliases: ['bankrob', 'rampokbank', 'hr'],
  description: '🏦 Rampok bank bersama! Butuh 2-5 orang (cd 5-10 hari)',
  async execute(message, args) {
    const user  = getUser(message.author.id);
    const now   = Date.now();
    const savedCD = user.lastHeistCD || randCD();
    const { onCD, remaining, resetAt } = checkCD(user.lastHeist, savedCD);

    if (onCD) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('🏦 Keamanan Bank Masih Tinggi!')
        .setColor('#e74c3c')
        .setDescription(`Tunggu sampai keamanan bank melemah!\nBisa beraksi dalam **${fmtRemaining(remaining)}**`)
        .addFields({ name: '⏳ Bisa Heist', value: `<t:${Math.floor(resetAt/1000)}:R>`, inline: true })
        .setTimestamp()
      ]});
    }

    if (ACTIVE_HEISTS.has(message.guild?.id)) {
      const heist = ACTIVE_HEISTS.get(message.guild.id);
      // Join heist
      if (heist.members.includes(message.author.id))
        return message.reply('❌ Kamu sudah bergabung dalam heist ini!');
      if (heist.members.length >= 5)
        return message.reply('❌ Tim heist sudah penuh (maks 5 orang)!');

      heist.members.push(message.author.id);
      return message.reply(`✅ <@${message.author.id}> bergabung! Tim heist: **${heist.members.length}/5** orang`);
    }

    // Mulai heist baru
    const embed = new EmbedBuilder()
      .setTitle('🏦 HEIST DIMULAI!')
      .setColor('#e74c3c')
      .setImage('https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif')
      .setDescription(
        `**${message.author.username}** memulai rencana perampokan bank!\n\n` +
        `Ketik \`!heist\` untuk bergabung! (maks 5 orang)\n` +
        `Tim mulai beraksi dalam **60 detik**!\n\n` +
        `> 💡 Semakin banyak anggota = jackpot lebih besar!`
      )
      .setTimestamp();

    const heistMsg = await message.channel.send({ embeds: [embed] });

    ACTIVE_HEISTS.set(message.guild.id, {
      leader: message.author.id,
      members: [message.author.id],
      msgId: heistMsg.id,
    });

    setTimeout(async () => {
      const heist = ACTIVE_HEISTS.get(message.guild?.id);
      if (!heist) return;
      ACTIVE_HEISTS.delete(message.guild.id);

      const memberCount = heist.members.length;
      // Chance sukses tergantung jumlah anggota
      const successChance = Math.min(0.3 + memberCount * 0.1, 0.8);
      const jackpot       = memberCount * 10000 + Math.floor(Math.random() * 20000);
      const success       = Math.random() < successChance;

      const newCD = randCD();
      for (const memberId of heist.members) {
        const mu = getUser(memberId);
        mu.lastHeist   = Date.now();
        mu.lastHeistCD = newCD;
        if (success) {
          const share = Math.floor(jackpot / memberCount);
          mu.balance = (mu.balance || 0) + share;
        } else {
          const fine = Math.floor((mu.balance || 0) * 0.25);
          mu.balance = Math.max(0, (mu.balance || 0) - fine);
        }
        saveUser(memberId, mu);
      }

      const memberMentions = heist.members.map(id => `<@${id}>`).join(', ');
      const resultEmbed = new EmbedBuilder()
        .setTitle(success ? '🎊 HEIST SUKSES!' : '🚨 HEIST GAGAL — SEMUA DITANGKAP!')
        .setColor(success ? '#2ecc71' : '#e74c3c')
        .setImage(success
          ? 'https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif'
          : 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif'
        )
        .setDescription(success
          ? `💰 Tim berhasil merampok **$${jackpot.toLocaleString()}**!\nSetiap anggota dapat **$${Math.floor(jackpot/memberCount).toLocaleString()}**!`
          : `😭 Polisi berhasil menangkap semua anggota!\nSetiap anggota kehilangan **25% saldo**!`
        )
        .addFields(
          { name: '👥 Tim',         value: memberMentions,                            inline: false },
          { name: '🎯 Anggota',     value: `**${memberCount} orang**`,                inline: true  },
          { name: '📊 Chance Sukses',value: `**${Math.round(successChance*100)}%**`,  inline: true  },
          { name: '⏳ CD Berikutnya',value: `5 detik`,     inline: true  },
        )
        .setTimestamp();

      await heistMsg.edit({ embeds: [resultEmbed] });
    }, 60000);
  },
};

// ═══════════════════════════════════════════════════════════════
// 6. !beg — Mengemis uang kecil (cd 1 hari)
// ═══════════════════════════════════════════════════════════════
const BEG_RESPONSES = [
  { text: 'Seseorang merasa kasihan dan memberikanmu uang receh...', img: 'https://media.giphy.com/media/3oFzmkkwkFyTEkbVM4/giphy.gif' },
  { text: 'Kamu berdiri di pinggir jalan dan orang-orang melempar koin...', img: 'https://media.giphy.com/media/26BGqfMnHoFmBFTCg/giphy.gif' },
  { text: 'Kamu berhasil meyakinkan seorang dermawan untuk membantumu...', img: 'https://media.giphy.com/media/l4FGrYKtP0pBGpBAY/giphy.gif' },
];

const begCmd = {
  name: 'beg',
  aliases: ['minta', 'mengemis', 'ngemis'],
  description: '🙏 Mengemis uang kecil (cd 1 hari)',
  async execute(message) {
    const user = getUser(message.author.id);
    const now  = Date.now();
    const CD = 5000; // 5 detik
    const { onCD, remaining, resetAt } = checkCD(user.lastBeg, CD);

    if (onCD) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('🙏 Sudah Mengemis Hari Ini!')
        .setColor('#7f8c8d')
        .setDescription(`Malu rasanya mengemis lagi!\nTunggu **${fmtRemaining(remaining)}**`)
        .addFields({ name: '⏳ Reset', value: `<t:${Math.floor(resetAt/1000)}:R>`, inline: true })
        .setTimestamp()
      ]});
    }

    const earned  = Math.floor(Math.random() * 150) + 50; // 50-200
    const resp    = BEG_RESPONSES[Math.floor(Math.random() * BEG_RESPONSES.length)];
    user.balance  = (user.balance || 0) + earned;
    user.lastBeg  = now;
    saveUser(message.author.id, user);

    const embed = new EmbedBuilder()
      .setTitle('🙏 Mengemis...')
      .setColor('#95a5a6')
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setImage(resp.img)
      .setDescription(`> ${resp.text}`)
      .addFields(
        { name: '🪙 Dapat',      value: `**$${earned.toLocaleString()}**`,          inline: true },
        { name: '💳 Saldo',      value: `**$${user.balance.toLocaleString()}**`,     inline: true },
        { name: '⏳ CD Besok',   value: `<t:${Math.floor((now+CD)/1000)}:R>`,       inline: true },
      )
      .setFooter({ text: 'Lebih baik kerja dengan !work untuk penghasilan lebih besar!' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 7. !trade @user <animalId> <harga> — Perdagangan hewan antar user
// ═══════════════════════════════════════════════════════════════
const ACTIVE_TRADES = new Map();

const tradeCmd = {
  name: 'trade',
  aliases: ['dagang', 'jualke', 'tr'],
  description: '🤝 Jual hewan ke user lain dengan harga custom',
  async execute(message, args) {
    const target   = message.mentions.users.first();
    const animalId = args[1]?.toLowerCase();
    const price    = parseInt(args[2]);

    if (!target || !animalId || !price || price <= 0) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('🤝 Cara Trade Hewan')
        .setColor('#3498db')
        .setDescription(
          '**Format:** `!trade @user <animal_id> <harga>`\n\n' +
          '**Contoh:** `!trade @Bernie lion 5000`\n\n' +
          'User yang dituju harus ketik `!accept` dalam 60 detik untuk menerima.'
        )
        .setTimestamp()
      ]});
    }

    if (target.id === message.author.id) return message.reply('❌ Tidak bisa trade ke diri sendiri!');
    if (target.bot) return message.reply('❌ Tidak bisa trade dengan bot!');

    const seller = getUser(message.author.id);
    const animal = getAnimalById(animalId);

    if (!animal) return message.reply(`❌ Hewan \`${animalId}\` tidak ada!`);
    const hasAnimal = (seller.animals || []).find(a => a.id === animalId);
    if (!hasAnimal) return message.reply(`❌ Kamu tidak punya **${animal.name}** di zoo!`);

    const buyer = getUser(target.id);
    if ((buyer.balance || 0) < price)
      return message.reply(`❌ ${target.username} tidak punya cukup uang! (punya $${(buyer.balance||0).toLocaleString()}, butuh $${price.toLocaleString()})`);

    if (ACTIVE_TRADES.has(message.author.id)) return message.reply('❌ Kamu sedang dalam trade lain!');
    ACTIVE_TRADES.set(message.author.id, true);

    const embed = new EmbedBuilder()
      .setTitle('🤝 PENAWARAN TRADE!')
      .setColor('#f39c12')
      .setImage(animal.image)
      .setDescription(
        `**${message.author.username}** menjual ke ${target}:\n\n` +
        `${animal.emoji} **${animal.name}** (${animal.rarity})\n` +
        `Harga: **$${price.toLocaleString()}**\n\n` +
        `${target}, ketik \`!accept\` dalam 60 detik untuk membeli!`
      )
      .setTimestamp();

    const tradeMsg = await message.channel.send({ embeds: [embed] });

    const collector = message.channel.createMessageCollector({
      filter: m => m.author.id === target.id && m.content.toLowerCase() === '!accept',
      time: 60000, max: 1,
    });

    collector.on('collect', async () => {
      ACTIVE_TRADES.delete(message.author.id);
      // Re-check saldo
      const freshBuyer  = getUser(target.id);
      const freshSeller = getUser(message.author.id);
      if ((freshBuyer.balance || 0) < price) {
        return tradeMsg.edit({ embeds: [new EmbedBuilder()
          .setTitle('❌ Trade Gagal — Saldo Tidak Cukup')
          .setColor('#e74c3c').setDescription(`${target.username} tidak punya cukup uang saat ini!`).setTimestamp()
        ]});
      }

      // Transfer hewan
      const idx = (freshSeller.animals || []).findIndex(a => a.id === animalId);
      if (idx === -1) {
        return tradeMsg.edit({ embeds: [new EmbedBuilder()
          .setTitle('❌ Trade Gagal').setColor('#e74c3c')
          .setDescription(`${message.author.username} tidak lagi punya hewan ini!`).setTimestamp()
        ]});
      }

      freshSeller.animals.splice(idx, 1);
      freshSeller.balance = (freshSeller.balance || 0) + price;
      freshBuyer.balance  = (freshBuyer.balance || 0) - price;
      if (!freshBuyer.animals) freshBuyer.animals = [];
      freshBuyer.animals.push({ id: animalId, caughtAt: Date.now(), boughtFrom: message.author.id });
      saveUser(message.author.id, freshSeller);
      saveUser(target.id, freshBuyer);

      await tradeMsg.edit({ embeds: [new EmbedBuilder()
        .setTitle('✅ TRADE BERHASIL!')
        .setColor('#2ecc71')
        .setImage(animal.image)
        .setDescription(`🎊 Transaksi selesai!`)
        .addFields(
          { name: '🦁 Hewan',     value: `${animal.emoji} **${animal.name}**`,              inline: true },
          { name: '💰 Harga',     value: `**$${price.toLocaleString()}**`,                   inline: true },
          { name: '📤 Penjual',   value: `${message.author}`,                               inline: true },
          { name: '📥 Pembeli',   value: `${target}`,                                       inline: true },
        )
        .setTimestamp()
      ]});
    });

    collector.on('end', (col) => {
      ACTIVE_TRADES.delete(message.author.id);
      if (col.size === 0) {
        tradeMsg.edit({ embeds: [new EmbedBuilder()
          .setTitle('❌ Trade Kedaluwarsa')
          .setColor('#7f8c8d')
          .setDescription(`${target.username} tidak menerima penawaran dalam 60 detik.`)
          .setTimestamp()
        ]});
      }
    });
  },
};

// ═══════════════════════════════════════════════════════════════
// 8. !stats — Statistik gambling & aktivitas pribadi
// ═══════════════════════════════════════════════════════════════
const statsCmd = {
  name: 'stats',
  aliases: ['mystats', 'statistik', 'st'],
  description: '📊 Statistik lengkap aktivitas kamu',
  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const user   = getUser(target.id);

    const animals  = user.animals || [];
    const rarities = { Legendary: 0, Epic: 0, Rare: 0, Uncommon: 0, Common: 0 };
    for (const a of animals) {
      const info = getAnimalById(a.id);
      if (info) rarities[info.rarity] = (rarities[info.rarity] || 0) + 1;
    }

    const mine    = user.mineStats || { count: 0, total: 0, best: 0 };
    const netWorth = (user.balance||0) + (user.bank||0) +
      animals.reduce((s,a) => s + (getAnimalById(a.id)?.value||0), 0);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Statistik — ${target.username}`)
      .setColor('#9b59b6')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '╔═ 💰 KEUANGAN', value:
          `💵 Kas: **$${(user.balance||0).toLocaleString()}**\n` +
          `🏦 Bank: **$${(user.bank||0).toLocaleString()}**\n` +
          `💎 Net Worth: **$${netWorth.toLocaleString()}**\n` +
          `🔥 Daily Streak: **${user.dailyStreak||0} minggu**`,
          inline: true },
        { name: '╔═ 🦁 ZOO', value:
          `📦 Total: **${animals.length}**\n` +
          `🔴 Legendary: **${rarities.Legendary}**\n` +
          `🟣 Epic: **${rarities.Epic}**\n` +
          `🔵 Rare: **${rarities.Rare}**`,
          inline: true },
        { name: '╔═ ⛏️ MINING', value:
          `🔨 Total Tambang: **${mine.count}x**\n` +
          `💰 Total Hasil: **$${mine.total.toLocaleString()}**\n` +
          `🏆 Terbaik: **$${mine.best.toLocaleString()}**`,
          inline: true },
        { name: '╔═ 🎟️ LOTRE', value:
          `🎟️ Tiket Aktif: **${user.lotteryTickets||0}**`,
          inline: true },
        { name: '╔═ 🎒 INVENTORY', value:
          `📦 Items: **${(user.inventory||[]).length}**\n` +
          `🎯 VIP: **${isVip(target.id)||target.id===OWNER_ID?'✅ Aktif':'❌ Tidak aktif'}**`,
          inline: true },
      )
      .setFooter({ text: 'Terus bermain untuk meningkatkan statistikmu!' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 9. !give @user <jumlah> — Transfer cepat (alias !bank transfer)
// ═══════════════════════════════════════════════════════════════
const giveCmd = {
  name: 'give',
  aliases: ['send', 'tf', 'transfer'],
  description: '💸 Transfer uang ke user lain (5% pajak, VIP 0%)',
  async execute(message, args) {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!target || !amount || amount <= 0)
      return message.reply('❌ Format: `!give @user <jumlah>`');
    if (target.id === message.author.id) return message.reply('❌ Tidak bisa transfer ke diri sendiri!');
    if (target.bot) return message.reply('❌ Tidak bisa transfer ke bot!');

    const sender = getUser(message.author.id);
    if ((sender.balance||0) < amount)
      return message.reply(`❌ Saldo kamu hanya **$${(sender.balance||0).toLocaleString()}**!`);

    const vip     = isVip(message.author.id) || message.author.id === OWNER_ID;
    const tax     = vip ? 0 : Math.floor(amount * 0.05);
    const received = amount - tax;

    sender.balance = (sender.balance||0) - amount;
    saveUser(message.author.id, sender);

    const recv = getUser(target.id);
    recv.balance = (recv.balance||0) + received;
    saveUser(target.id, recv);

    const embed = new EmbedBuilder()
      .setTitle('💸 Transfer Berhasil!')
      .setColor('#2ecc71')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Dari',       value: `${message.author}`,                              inline: true },
        { name: '👤 Ke',         value: `${target}`,                                      inline: true },
        { name: '💵 Dikirim',    value: `**$${amount.toLocaleString()}**`,                 inline: true },
        { name: '🏛️ Pajak',      value: vip ? '**$0** 👑 VIP' : `**$${tax.toLocaleString()}**`, inline: true },
        { name: '✅ Diterima',   value: `**$${received.toLocaleString()}**`,               inline: true },
        { name: '💳 Sisa Kamu',  value: `**$${sender.balance.toLocaleString()}**`,         inline: true },
      )
      .setFooter({ text: vip ? '👑 VIP: 0% pajak!' : 'VIP mendapat transfer 0% pajak — !vipinfo' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 10. !scratch — Gosok kartu lucky (cd 5-10 hari)
// ═══════════════════════════════════════════════════════════════
const SCRATCH_CARDS = [
  ['💎','💎','💎', 50000, 'JACKPOT!!!'],
  ['⭐','⭐','⭐', 10000, 'Bintang Tiga!'],
  ['🍀','🍀','🍀',  5000, 'Triple Lucky!'],
  ['💰','💰','💰',  3000, 'Uang Uang Uang!'],
  ['💎','💎','⭐',  2000, 'Dua Berlian!'],
  ['⭐','⭐','🍀',  1000, 'Dua Bintang!'],
  ['💰','⭐','🍀',   500, 'Berbeda...'],
  ['💸','💸','💸',     0, 'Zonk! Tiga Minus!'],
  ['💸','⭐','💰',     0, 'Zonk!'],
];

const scratchCmd = {
  name: 'scratch',
  aliases: ['gosok', 'kartu', 'sc'],
  description: '🎫 Gosok kartu lucky! (cd 5-10 hari)',
  async execute(message) {
    const user = getUser(message.author.id);
    const now  = Date.now();
    const savedCD = user.lastScratchCD || randCD();
    const { onCD, remaining, resetAt } = checkCD(user.lastScratch, savedCD);

    if (onCD) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('🎫 Kartu Belum Tersedia!')
        .setColor('#7f8c8d')
        .setDescription(`Kartu baru akan tersedia dalam **${fmtRemaining(remaining)}**`)
        .addFields({ name: '⏳ Kartu Baru', value: `<t:${Math.floor(resetAt/1000)}:R>`, inline: true })
        .setTimestamp()
      ]});
    }

    // Animasi gosok
    const scratchMsg = await message.reply({ embeds: [new EmbedBuilder()
      .setTitle('🎫 Menggosok Kartu...')
      .setColor('#f39c12')
      .setDescription('```\n[ ▓▓▓ ] [ ▓▓▓ ] [ ▓▓▓ ]\n   Menggosok...          \n```')
      .setTimestamp()
    ]});

    await sleep(500);
    await scratchMsg.edit({ embeds: [new EmbedBuilder()
      .setTitle('🎫 Menggosok...')
      .setColor('#e67e22')
      .setDescription('```\n[  ?  ] [ ▓▓▓ ] [ ▓▓▓ ]\n   Hampir...             \n```')
      .setTimestamp()
    ]});
    await sleep(500);
    await scratchMsg.edit({ embeds: [new EmbedBuilder()
      .setTitle('🎫 Menggosok...')
      .setColor('#e67e22')
      .setDescription('```\n[  ?  ] [  ?  ] [ ▓▓▓ ]\n   Sebentar lagi...      \n```')
      .setTimestamp()
    ]});
    await sleep(600);

    // Hasil
    const card    = SCRATCH_CARDS[Math.floor(Math.random() * SCRATCH_CARDS.length)];
    const [s1, s2, s3, prize, desc] = card;
    const vip     = isVip(message.author.id) || message.author.id === OWNER_ID;
    const earned  = vip && prize > 0 ? Math.floor(prize * 1.2) : prize;

    user.balance      = (user.balance||0) + earned;
    user.lastScratch  = now;
    const newCD = randCD();
    saveUser(message.author.id, user);

    const won = earned > 0;
    await scratchMsg.edit({ embeds: [new EmbedBuilder()
      .setTitle(won ? `🎉 ${desc}` : `😭 ${desc}`)
      .setColor(won ? (earned >= 10000 ? '#f1c40f' : '#2ecc71') : '#e74c3c')
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `\`\`\`\n[ ${s1} ] [ ${s2} ] [ ${s3} ]\n\`\`\`\n` +
        (won ? `🎊 Kamu menang **$${earned.toLocaleString()}**!` : '😢 Tidak ada hadiah kali ini!')
      )
      .addFields(
        { name: '💰 Hadiah',    value: `**$${earned.toLocaleString()}**`,          inline: true },
        { name: '💳 Saldo',     value: `**$${user.balance.toLocaleString()}**`,    inline: true },
        { name: '⏳ Cooldown',  value: `5 detik`,       inline: true },
        { name: '📅 Kartu Lagi',value: `<t:${Math.floor((now+newCD)/1000)}:R>`,   inline: true },
      )
      .setFooter({ text: vip && prize > 0 ? '👑 VIP: Hadiah +20%!' : 'Jackpot 💎💎💎 = $50,000!' })
      .setTimestamp()
    ]});
  },
};

// ═══════════════════════════════════════════════════════════════
// 11. !richest — Top 5 terkaya dengan detail lengkap
// ═══════════════════════════════════════════════════════════════
const richestCmd = {
  name: 'richest',
  aliases: ['kaya', 'sultan', 'moneytop'],
  description: '👑 Top 5 user terkaya server dengan detail',
  async execute(message) {
    const db = loadDB();
    const entries = Object.entries(db)
      .map(([id, d]) => {
        const zoo = (d.animals||[]).reduce((s,a)=>s+(getAnimalById(a.id)?.value||0),0);
        return { id, cash: d.balance||0, bank: d.bank||0, zoo, net: (d.balance||0)+(d.bank||0)+zoo };
      })
      .sort((a,b) => b.net - a.net)
      .slice(0, 5);

    if (!entries.length) return message.reply('Belum ada data ekonomi!');

    const embed = new EmbedBuilder()
      .setTitle('👑 Top 5 Terkaya — Detail Lengkap')
      .setColor('#f1c40f')
      .setImage('https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif')
      .setTimestamp();

    const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
    for (let i = 0; i < entries.length; i++) {
      const e    = entries[i];
      const vipTag = isVip(e.id)||e.id===OWNER_ID ? ' 👑' : '';
      embed.addFields({
        name: `${medals[i]} <@${e.id}>${vipTag}`,
        value:
          `💵 Kas: **$${e.cash.toLocaleString()}** | ` +
          `🏦 Bank: **$${e.bank.toLocaleString()}** | ` +
          `🦁 Zoo: **$${e.zoo.toLocaleString()}**\n` +
          `💎 **Net Worth: $${e.net.toLocaleString()}**`,
        inline: false,
      });
    }

    embed.setFooter({ text: `Server: ${message.guild?.name} • !leaderboard untuk top 10` });
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 12. !deposit & !withdraw — Shortcut bank
// ═══════════════════════════════════════════════════════════════
const depositCmd = {
  name: 'deposit',
  aliases: ['dep', 'setor'],
  description: '🏦 Setor uang ke bank (shortcut)',
  async execute(message, args) {
    // Redirect ke bank command
    const bankCmd = require('./bank');
    args.unshift('deposit');
    return bankCmd.execute(message, args);
  },
};

const withdrawCmd = {
  name: 'withdraw',
  aliases: ['wd', 'tarik'],
  description: '💵 Tarik uang dari bank (shortcut)',
  async execute(message, args) {
    const bankCmd = require('./bank');
    args.unshift('withdraw');
    return bankCmd.execute(message, args);
  },
};

// ═══════════════════════════════════════════════════════════════
// 13. !tax — Bayar pajak sukarela untuk dapat buff ekonomi
// ═══════════════════════════════════════════════════════════════
const taxCmd = {
  name: 'tax',
  aliases: ['pajak', 'bayarpajak'],
  description: '🏛️ Bayar pajak sukarela untuk dapat buff! (cd 1 minggu)',
  async execute(message, args) {
    const user = getUser(message.author.id);
    const now  = Date.now();
    const CD = 5000; // 5 detik
    const { onCD, remaining, resetAt } = checkCD(user.lastTax, CD);

    if (!args[0] || args[0] === 'info') {
      const embed = new EmbedBuilder()
        .setTitle('🏛️ Sistem Pajak')
        .setColor('#3498db')
        .setDescription(
          'Bayar pajak sukarela untuk mendapat **buff ekonomi selama 7 hari**!\n\n' +
          '**Buff yang didapat:**\n' +
          '• 🏹 Hunt catch rate **+10%**\n' +
          '• 💰 Daily reward **+15%**\n' +
          '• ⛏️ Mining nilai **+10%**\n\n' +
          '**Format:** `!tax <jumlah>`\n' +
          '**Minimal pajak:** $1,000\n\n' +
          (onCD ? `Status: ✅ **Buff Aktif** — reset <t:${Math.floor(resetAt/1000)}:R>` : 'Status: ❌ Buff tidak aktif')
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (onCD) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('✅ Pajak Sudah Dibayar Minggu Ini!')
        .setColor('#2ecc71')
        .setDescription(`Buff pajak masih aktif!\nBisa bayar lagi <t:${Math.floor(resetAt/1000)}:R>`)
        .setTimestamp()
      ]});
    }

    const amount = parseInt(args[0]);
    if (!amount || amount < 1000) return message.reply('❌ Minimal pajak **$1,000**!');
    if ((user.balance||0) < amount) return message.reply(`❌ Saldo tidak cukup! Punya **$${(user.balance||0).toLocaleString()}**`);

    user.balance = (user.balance||0) - amount;
    user.lastTax = now;
    user.taxBuff = true;
    saveUser(message.author.id, user);

    const embed = new EmbedBuilder()
      .setTitle('🏛️ Pajak Dibayar — Buff Aktif!')
      .setColor('#2ecc71')
      .setImage('https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif')
      .setDescription('Terima kasih telah membayar pajak! Buff ekonomi aktif selama **7 hari**!')
      .addFields(
        { name: '💸 Pajak Dibayar', value: `**$${amount.toLocaleString()}**`,           inline: true },
        { name: '💳 Saldo Sisa',    value: `**$${user.balance.toLocaleString()}**`,      inline: true },
        { name: '⏳ Buff Hingga',   value: `<t:${Math.floor((now+CD)/1000)}:R>`,         inline: true },
        { name: '🎁 Buff Aktif',    value: '🏹 Hunt +10% • 💰 Daily +15% • ⛏️ Mine +10%', inline: false },
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 14. !market — Pasar hewan publik (list & beli)
// ═══════════════════════════════════════════════════════════════
const marketCmd = {
  name: 'market',
  aliases: ['pasar', 'marketplace', 'mk'],
  description: '🏪 Pasar hewan publik — jual & beli dari user lain',
  async execute(message, args) {
    const sub = args[0]?.toLowerCase();
    const db  = loadDB();

    // Inisialisasi market di DB
    if (!db.__market__) { db.__market__ = []; require('../utils/database').saveDB(db); }
    const market = db.__market__;

    // LIST
    if (!sub || sub === 'list') {
      const active = market.filter(l => l.active);
      if (!active.length) {
        const embed = new EmbedBuilder()
          .setTitle('🏪 Pasar Hewan')
          .setColor('#3498db')
          .setImage('https://media.giphy.com/media/3oFzmkkwkFyTEkbVM4/giphy.gif')
          .setDescription('Pasar sedang kosong!\n\nJual hewanmu: `!market sell <animal_id> <harga>`')
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }

      const lines = active.slice(0, 10).map((l, i) => {
        const animal = getAnimalById(l.animalId);
        return `**${i+1}.** ${animal?.emoji||'❓'} **${animal?.name||l.animalId}** — **$${l.price.toLocaleString()}** (oleh <@${l.sellerId}>)\n  ID: \`${l.id}\``;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setTitle('🏪 Pasar Hewan Publik')
        .setColor('#f39c12')
        .setDescription(lines + '\n\nBeli: `!market buy <id_listing>`\nJual: `!market sell <animal_id> <harga>`')
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // SELL
    if (sub === 'sell' || sub === 'jual') {
      const animalId = args[1]?.toLowerCase();
      const price    = parseInt(args[2]);
      if (!animalId || !price || price <= 0) return message.reply('Format: `!market sell <animal_id> <harga>`');

      const user   = getUser(message.author.id);
      const animal = getAnimalById(animalId);
      if (!animal) return message.reply(`❌ Hewan \`${animalId}\` tidak ada!`);
      const hasIt  = (user.animals||[]).findIndex(a => a.id === animalId);
      if (hasIt === -1) return message.reply(`❌ Kamu tidak punya **${animal.name}**!`);

      // Remove dari zoo, masuk market
      user.animals.splice(hasIt, 1);
      saveUser(message.author.id, user);

      const listingId = `${Date.now()}_${message.author.id}`;
      db.__market__.push({ id: listingId, animalId, price, sellerId: message.author.id, active: true, listedAt: Date.now() });
      require('../utils/database').saveDB(db);

      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle(`🏪 ${animal.emoji} ${animal.name} Dijual ke Pasar!`)
        .setColor('#2ecc71')
        .setImage(animal.image)
        .addFields(
          { name: '💰 Harga',   value: `**$${price.toLocaleString()}**`, inline: true },
          { name: '🔑 ID',      value: `\`${listingId}\``,               inline: true },
        )
        .setFooter({ text: 'Pembeli ketik !market buy <id>' })
        .setTimestamp()
      ]});
    }

    // BUY
    if (sub === 'buy' || sub === 'beli') {
      const listingId = args[1];
      if (!listingId) return message.reply('Format: `!market buy <id_listing>`');

      const freshDB  = require('../utils/database').loadDB();
      const idx      = (freshDB.__market__||[]).findIndex(l => l.id === listingId && l.active);
      if (idx === -1) return message.reply('❌ Listing tidak ditemukan atau sudah terjual!');

      const listing = freshDB.__market__[idx];
      if (listing.sellerId === message.author.id) return message.reply('❌ Tidak bisa membeli listing sendiri!');

      const buyer  = getUser(message.author.id);
      const animal = getAnimalById(listing.animalId);
      if ((buyer.balance||0) < listing.price)
        return message.reply(`❌ Saldo kamu **$${(buyer.balance||0).toLocaleString()}** — butuh **$${listing.price.toLocaleString()}**!`);

      // Transfer uang ke penjual
      buyer.balance = (buyer.balance||0) - listing.price;
      if (!buyer.animals) buyer.animals = [];
      buyer.animals.push({ id: listing.animalId, caughtAt: Date.now(), boughtFromMarket: true });
      saveUser(message.author.id, buyer);

      const seller = getUser(listing.sellerId);
      seller.balance = (seller.balance||0) + listing.price;
      saveUser(listing.sellerId, seller);

      // Hapus listing
      freshDB.__market__[idx].active = false;
      require('../utils/database').saveDB(freshDB);

      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle(`✅ Membeli ${animal?.emoji||'❓'} ${animal?.name||listing.animalId}!`)
        .setColor('#2ecc71')
        .setImage(animal?.image||null)
        .addFields(
          { name: '💸 Dibayar',   value: `**$${listing.price.toLocaleString()}**`,       inline: true },
          { name: '💳 Saldo Sisa',value: `**$${buyer.balance.toLocaleString()}**`,        inline: true },
          { name: '📦 Zoo',       value: `**${buyer.animals.length} hewan**`,             inline: true },
        )
        .setTimestamp()
      ]});
    }

    // CANCEL
    if (sub === 'cancel') {
      const listingId = args[1];
      const freshDB   = require('../utils/database').loadDB();
      const idx       = (freshDB.__market__||[]).findIndex(l => l.id === listingId && l.sellerId === message.author.id && l.active);
      if (idx === -1) return message.reply('❌ Listing tidak ditemukan atau bukan milikmu!');

      const listing = freshDB.__market__[idx];
      const animal  = getAnimalById(listing.animalId);

      // Kembalikan hewan ke penjual
      const user = getUser(message.author.id);
      if (!user.animals) user.animals = [];
      user.animals.push({ id: listing.animalId, caughtAt: Date.now() });
      saveUser(message.author.id, user);

      freshDB.__market__[idx].active = false;
      require('../utils/database').saveDB(freshDB);

      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('✅ Listing Dibatalkan')
        .setColor('#e67e22')
        .setDescription(`${animal?.emoji||'❓'} **${animal?.name||listing.animalId}** dikembalikan ke zoo kamu.`)
        .setTimestamp()
      ]});
    }

    message.reply('Gunakan: `!market` / `!market sell <id> <harga>` / `!market buy <listing_id>` / `!market cancel <id>`');
  },
};

// ═══════════════════════════════════════════════════════════════
// 15. !prestige — Reset ekonomi untuk badge prestige & bonus
// ═══════════════════════════════════════════════════════════════
const PRESTIGE_REQ = 1000000; // $1 juta net worth

const prestigeCmd = {
  name: 'prestige',
  aliases: ['reset', 'newgame', 'pg'],
  description: '🌟 Reset ekonomi untuk badge Prestige (butuh $1 juta net worth)',
  async execute(message, args) {
    const user = getUser(message.author.id);
    const animals = user.animals || [];
    const zooVal  = animals.reduce((s,a) => s+(getAnimalById(a.id)?.value||0), 0);
    const netWorth = (user.balance||0) + (user.bank||0) + zooVal;

    const currentPrestige = user.prestige || 0;

    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setTitle('🌟 Sistem Prestige')
        .setColor('#f1c40f')
        .setImage('https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif')
        .setDescription(
          `**Prestige** mereset semua uang & hewan kamu, tapi memberikan badge permanen dan bonus!\n\n` +
          `**Syarat:** Net worth **$1,000,000** (kamu: **$${netWorth.toLocaleString()}**)\n\n` +
          `**Prestige kamu saat ini:** ${currentPrestige > 0 ? `⭐`.repeat(currentPrestige) + ` (${currentPrestige}x)` : 'Belum prestige'}\n\n` +
          `**Bonus per prestige level:**\n` +
          `• 🔥 Daily reward **+10% per level**\n` +
          `• 💰 Starting bonus **$${(currentPrestige+1)*5000} setelah prestige**\n` +
          `• 🌟 Badge prestige di profile\n\n` +
          `Ketik \`!prestige confirm\` untuk lanjut.`
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (args[0].toLowerCase() === 'confirm') {
      if (netWorth < PRESTIGE_REQ) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setTitle('❌ Net Worth Belum Cukup!')
          .setColor('#e74c3c')
          .setDescription(`Butuh **$1,000,000** net worth!\nKamu baru punya **$${netWorth.toLocaleString()}**\nKurang **$${(PRESTIGE_REQ-netWorth).toLocaleString()}** lagi!`)
          .setTimestamp()
        ]});
      }

      const newPrestige = currentPrestige + 1;
      const startBonus  = newPrestige * 5000;

      // Reset tapi pertahankan prestige data
      saveUser(message.author.id, {
        balance: startBonus,
        bank: 0,
        animals: [],
        inventory: [],
        lastDaily: null, lastHunt: null, lastWork: null,
        lastMine: null, lastCrime: null, lastBeg: null,
        prestige: newPrestige,
        prestigedAt: Date.now(),
        dailyStreak: 0,
      });

      const embed = new EmbedBuilder()
        .setTitle(`🌟 PRESTIGE ${newPrestige} DICAPAI!`)
        .setColor('#f1c40f')
        .setImage('https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif')
        .setDescription(`🎊 Selamat! Kamu mencapai **Prestige ${newPrestige}**!\n${'⭐'.repeat(newPrestige)}`)
        .addFields(
          { name: '💰 Bonus Awal',      value: `**$${startBonus.toLocaleString()}**`,       inline: true },
          { name: '🌟 Level Prestige',   value: `**${newPrestige}**`,                        inline: true },
          { name: '📈 Daily Bonus',      value: `**+${newPrestige*10}%**`,                   inline: true },
        )
        .setFooter({ text: 'Semangat membangun kerajaan ekonomi baru!' })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }
  },
};

// ═══════════════════════════════════════════════════════════════
// Export semua 15 command
// ═══════════════════════════════════════════════════════════════
module.exports = [
  mineCmd,       // 1
  lotteryCmd,    // 2
  questCmd,      // 3
  crimeCmd,      // 4
  heistCmd,      // 5
  begCmd,        // 6
  tradeCmd,      // 7
  statsCmd,      // 8
  giveCmd,       // 9
  scratchCmd,    // 10
  richestCmd,    // 11
  depositCmd,    // 12
  withdrawCmd,   // 13
  taxCmd,        // 14
  marketCmd,     // 15
  prestigeCmd,   // BONUS
];
