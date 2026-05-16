// vipuser.js — 10 command baru untuk VIP & User
// 1.  !cooldowns   — Lihat semua cooldown aktif
// 2.  !pay @user   — Transfer cepat tanpa pajak (VIP only)
// 3.  !gift @user  — Kirim hewan ke user lain
// 4.  !top zoo     — Leaderboard koleksi hewan terbanyak
// 5.  !achievements— Lihat pencapaian
// 6.  !net         — Net worth lengkap
// 7.  !rename      — Beri nama panggilan bot (VIP only)
// 8.  !boostdaily  — VIP boost daily sekali (VIP only)
// 9.  !spin        — Spin roda keberuntungan free (cd 5-10 hari)
// 10. !duel @user  — Tantang user duel ekonomi

const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser, loadDB, isVip, getVipInfo } = require('../utils/database');
const { getAnimalById } = require('../utils/animals');
const { randCD, checkCD, fmtRemaining } = require('../utils/cooldown');

const OWNER_ID = '1213365471693246504';

// ════════════════════════════════════════════════════════════════
// 1. !cooldowns — Lihat semua CD aktif milik user
// ════════════════════════════════════════════════════════════════
const cooldownsCmd = {
  name: 'cooldowns',
  aliases: ['cd', 'cds', 'waktu'],
  description: 'Lihat semua cooldown kamu',
  async execute(message) {
    const user = getUser(message.author.id);
    const now  = Date.now();

    function fmt(last, savedCD, fallback) {
      if (!last) return '✅ **Ready!**';
      const cd = savedCD || fallback;
      const rem = cd - (now - last);
      if (rem <= 0) return '✅ **Ready!**';
      return `⏳ ${fmtRemaining(rem)} (<t:${Math.floor((last+cd)/1000)}:R>)`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`⏱️ Cooldown — ${message.author.username}`)
      .setColor('#3498db')
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setDescription('Status semua command dengan cooldown milikmu:')
      .addFields(
        { name: '🎁 Daily',      value: fmt(user.lastDaily,  null,            7*24*3600*1000), inline: false },
        { name: '🏹 Hunt',       value: fmt(user.lastHunt,   user.lastHuntCD, 5*24*3600*1000), inline: false },
        { name: '🎣 Fish',       value: fmt(user.lastFish,   user.lastFishCD, 5*24*3600*1000), inline: false },
        { name: '💼 Work',       value: fmt(user.lastWork,   user.lastWorkCooldown, 5*24*3600*1000), inline: false },
        { name: '🦹 Rob',        value: fmt(user.lastRob,    user.lastRobCD,  5*24*3600*1000), inline: false },
        { name: '🎰 Slots',      value: fmt(user.lastSlots,  user.lastSlotsCD,5*24*3600*1000), inline: false },
        { name: '🪙 Coinflip',   value: fmt(user.lastCF,     user.lastCFCD,   5*24*3600*1000), inline: false },
        { name: '🃏 Blackjack',  value: fmt(user.lastBJ,     user.lastBJCD,   5*24*3600*1000), inline: false },
        { name: '🏁 Race',       value: fmt(user.lastRace,   user.lastRaceCD, 5*24*3600*1000), inline: false },
        { name: '🌀 Spin',       value: fmt(user.lastSpin,   user.lastSpinCD, 5*24*3600*1000), inline: false },
      )
      .setFooter({ text: 'VIP mendapat cooldown yang lebih ringan' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};

// ════════════════════════════════════════════════════════════════
// 2. !pay @user <jumlah> — Transfer TANPA pajak (VIP only)
// ════════════════════════════════════════════════════════════════
const payCmd = {
  name: 'pay',
  aliases: ['bayar', 'kirim'],
  description: 'Transfer tanpa pajak (VIP only)',
  async execute(message, args) {
    const vip = isVip(message.author.id) || message.author.id === OWNER_ID;
    if (!vip) {
      return message.reply({ embeds: [
        new EmbedBuilder()
          .setTitle('👑 Fitur VIP!')
          .setColor('#f1c40f')
          .setDescription('`!pay` adalah fitur **VIP** — transfer tanpa pajak 5%!\nGunakan `!bank transfer @user <jumlah>` untuk transfer biasa (kena pajak 5%).')
          .setTimestamp()
      ]});
    }

    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target || !amount || amount <= 0) return message.reply('Format: `!pay @user <jumlah>`');
    if (target.id === message.author.id)   return message.reply('❌ Tidak bisa transfer ke diri sendiri!');

    const sender = getUser(message.author.id);
    if (sender.balance < amount) return message.reply(`❌ Saldo kamu hanya **$${sender.balance.toLocaleString()}**!`);

    sender.balance -= amount;
    saveUser(message.author.id, sender);
    const recv = getUser(target.id);
    recv.balance += amount;
    saveUser(target.id, recv);

    const embed = new EmbedBuilder()
      .setTitle('👑 Transfer VIP (0% Pajak)!')
      .setColor('#f1c40f')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '💸 Dikirim',    value: `**$${amount.toLocaleString()}**`,        inline: true },
        { name: '🏛️ Pajak',      value: '**$0** (VIP benefit!)',                   inline: true },
        { name: '✅ Diterima',   value: `**$${amount.toLocaleString()}**`,         inline: true },
        { name: '👤 Pengirim',   value: `${message.author}`,                      inline: true },
        { name: '👤 Penerima',   value: `${target}`,                              inline: true },
        { name: '💳 Sisa Saldo', value: `**$${sender.balance.toLocaleString()}**`, inline: true },
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};

// ════════════════════════════════════════════════════════════════
// 3. !gift @user <animal_id> — Hadiahkan hewan ke user lain
// ════════════════════════════════════════════════════════════════
const giftCmd = {
  name: 'gift',
  aliases: ['hadiah', 'beri'],
  description: 'Hadiahkan hewan ke user lain',
  async execute(message, args) {
    const target   = message.mentions.users.first();
    const animalId = args[1]?.toLowerCase();
    if (!target || !animalId) return message.reply('Format: `!gift @user <animal_id>`\nContoh: `!gift @Bernie rabbit`');
    if (target.id === message.author.id) return message.reply('❌ Tidak bisa hadiahkan ke diri sendiri!');
    if (target.bot) return message.reply('❌ Bot tidak bisa menerima hadiah!');

    const sender = getUser(message.author.id);
    const animal = getAnimalById(animalId);
    if (!animal) return message.reply(`❌ Hewan \`${animalId}\` tidak ada! Cek \`!huntinfo\``);

    const idx = (sender.animals || []).findIndex(a => a.id === animalId);
    if (idx === -1) return message.reply(`❌ Kamu tidak punya **${animal.name}** di zoo!`);

    sender.animals.splice(idx, 1);
    saveUser(message.author.id, sender);

    const recv = getUser(target.id);
    if (!recv.animals) recv.animals = [];
    recv.animals.push({ id: animalId, caughtAt: Date.now(), giftFrom: message.author.id });
    saveUser(target.id, recv);

    const embed = new EmbedBuilder()
      .setTitle(`🎁 Hadiah Dikirim!`)
      .setColor('#2ecc71')
      .setImage(animal.image)
      .setDescription(`${message.author} menghadiahkan ${animal.emoji} **${animal.name}** kepada ${target}!`)
      .addFields(
        { name: '🎁 Hewan',     value: `${animal.emoji} **${animal.name}**`,  inline: true },
        { name: '⭐ Rarity',    value: `**${animal.rarity}**`,                 inline: true },
        { name: '💰 Nilai',     value: `**$${animal.value.toLocaleString()}**`,inline: true },
        { name: '📦 Sisa Zoo',  value: `**${sender.animals.length} hewan**`,  inline: true },
      )
      .setFooter({ text: '💝 Berbagi itu indah!' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
    target.send({ embeds: [
      new EmbedBuilder()
        .setTitle('🎁 Kamu Dapat Hadiah!')
        .setColor('#f1c40f')
        .setImage(animal.image)
        .setDescription(`**${message.author.tag}** menghadiahkan ${animal.emoji} **${animal.name}** kepadamu di **${message.guild?.name}**!`)
        .setTimestamp()
    ]}).catch(() => {});
  },
};

// ════════════════════════════════════════════════════════════════
// 4. !topzoo — Leaderboard koleksi hewan
// ════════════════════════════════════════════════════════════════
const topZooCmd = {
  name: 'topzoo',
  aliases: ['zoorankings', 'zootop'],
  description: 'Leaderboard koleksi hewan terbanyak',
  async execute(message) {
    const db = loadDB();
    const entries = Object.entries(db)
      .map(([id, d]) => ({ id, count: (d.animals || []).length }))
      .filter(e => e.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    if (!entries.length) return message.reply('Belum ada yang berburu hewan!');

    const medals = ['🥇','🥈','🥉'];
    const lines  = entries.map((e, i) =>
      `${medals[i] || `**#${i+1}**`} <@${e.id}> — **${e.count} hewan**`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🦁 Top Zoo — Kolektor Terbaik')
      .setColor('#f39c12')
      .setThumbnail(message.guild?.iconURL({ dynamic: true }))
      .setDescription(lines)
      .setFooter({ text: `Server: ${message.guild?.name} • !hunt untuk berburu hewan` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};

// ════════════════════════════════════════════════════════════════
// 5. !achievements — Lihat pencapaian user
// ════════════════════════════════════════════════════════════════
const ACHIEVEMENTS = [
  { id: 'first_blood',  name: '🩸 First Blood',    desc: 'Pertama kali kerja',          check: u => (u.lastWork != null) },
  { id: 'rich',         name: '💰 Tajir Melintir',  desc: 'Punya $50,000+',              check: u => (u.balance + u.bank) >= 50000 },
  { id: 'hunter',       name: '🏹 Pemburu Handal',  desc: 'Koleksi 10+ hewan',           check: u => (u.animals?.length || 0) >= 10 },
  { id: 'zoo_lord',     name: '🦁 Zoo Lord',        desc: 'Koleksi 50+ hewan',           check: u => (u.animals?.length || 0) >= 50 },
  { id: 'legendary',    name: '🔴 Legenda!',        desc: 'Tangkap hewan Legendary',     check: u => (u.animals || []).some(a => { const inf = getAnimalById(a.id); return inf?.rarity === 'Legendary'; }) },
  { id: 'weekly_7',     name: '🔥 Streak Master',   desc: 'Daily streak 7 minggu',       check: u => (u.dailyStreak || 0) >= 7 },
  { id: 'millionaire',  name: '🤑 Miliarder',       desc: 'Punya $1,000,000+',           check: u => (u.balance + u.bank) >= 1000000 },
  { id: 'gambler',      name: '🎲 Penjudi Sejati',  desc: 'Main blackjack minimal 1x',   check: u => u.lastBJ != null },
  { id: 'racer',        name: '🏁 Pembalap Pro',    desc: 'Menang balapan (gunakan !race)', check: u => u.lastRace != null },
  { id: 'robber',       name: '🦹 Penjahat Kelas',  desc: 'Pernah merampok',             check: u => u.lastRob != null },
];

const achievementsCmd = {
  name: 'achievements',
  aliases: ['achieve', 'badges', 'pencapaian'],
  description: 'Lihat pencapaian kamu',
  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const user   = getUser(target.id);

    const lines = ACHIEVEMENTS.map(ach => {
      const unlocked = ach.check(user);
      return `${unlocked ? '✅' : '🔒'} **${ach.name}** — ${ach.desc}`;
    });

    const unlocked = ACHIEVEMENTS.filter(a => a.check(user)).length;

    const embed = new EmbedBuilder()
      .setTitle(`🏅 Pencapaian — ${target.username}`)
      .setColor('#f1c40f')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setDescription(lines.join('\n'))
      .addFields({
        name: '📊 Progress',
        value: `**${unlocked}/${ACHIEVEMENTS.length}** pencapaian terbuka`,
        inline: false,
      })
      .setFooter({ text: 'Terus main untuk buka semua badge!' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};

// ════════════════════════════════════════════════════════════════
// 6. !net — Net worth lengkap
// ════════════════════════════════════════════════════════════════
const netCmd = {
  name: 'net',
  aliases: ['networth', 'kekayaan'],
  description: 'Lihat total kekayaan kamu',
  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const user   = getUser(target.id);

    const cash    = user.balance || 0;
    const bank    = user.bank    || 0;
    const zooVal  = (user.animals || []).reduce((s, a) => s + (getAnimalById(a.id)?.value || 0), 0);
    const invVal  = (user.inventory || []).reduce((s, i) => {
      const prices = { fishing_rod:500, hunting_rifle:2000, lucky_charm:1500, treasure_map:800, vip_pass:5000, bait:100 };
      return s + (prices[i.id] || 0) * (i.quantity || 1) * 0.5; // 50% buyback
    }, 0);
    const total   = cash + bank + zooVal + invVal;

    const db      = loadDB();
    const sorted  = Object.entries(db).map(([id, d]) => ({
      id, net: (d.balance||0) + (d.bank||0) +
        (d.animals||[]).reduce((s,a) => s+(getAnimalById(a.id)?.value||0), 0)
    })).sort((a, b) => b.net - a.net);
    const rank    = sorted.findIndex(e => e.id === target.id) + 1;

    const pct = n => total > 0 ? ((n/total)*100).toFixed(1)+'%' : '0%';

    const embed = new EmbedBuilder()
      .setTitle(`💎 Net Worth — ${target.username}`)
      .setColor('#9b59b6')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '💵 Kas',          value: `**$${cash.toLocaleString()}**  (${pct(cash)})`,   inline: true },
        { name: '🏦 Bank',         value: `**$${bank.toLocaleString()}**  (${pct(bank)})`,   inline: true },
        { name: '🦁 Zoo',          value: `**$${zooVal.toLocaleString()}**  (${pct(zooVal)})`, inline: true },
        { name: '🎒 Inventory',    value: `**$${invVal.toLocaleString()}**  (${pct(invVal)})`, inline: true },
        { name: '💎 TOTAL',        value: `**$${total.toLocaleString()}**`,                   inline: true },
        { name: '🏆 Rank Server',  value: `**#${rank}**`,                                    inline: true },
      )
      .setFooter({ text: 'Net worth = kas + bank + nilai zoo + nilai item' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};

// ════════════════════════════════════════════════════════════════
// 7. !boostdaily — VIP: gandakan daily sekali per minggu
// ════════════════════════════════════════════════════════════════
const boostDailyCmd = {
  name: 'boostdaily',
  aliases: ['bdaily', 'doubleclaim'],
  description: '[VIP] Double reward daily sekali per minggu',
  async execute(message) {
    const vip = isVip(message.author.id) || message.author.id === OWNER_ID;
    if (!vip) {
      return message.reply({ embeds: [
        new EmbedBuilder()
          .setTitle('👑 Fitur VIP!')
          .setColor('#f1c40f')
          .setDescription('`!boostdaily` hanya tersedia untuk **VIP**!\nHubungi admin untuk mendapatkan VIP.')
          .setTimestamp()
      ]});
    }

    const user = getUser(message.author.id);
    const now  = Date.now();
    const CD = 5000; // 5 detik

    if (user.lastBoostDaily && now - user.lastBoostDaily < CD) {
      const rem = CD - (now - user.lastBoostDaily);
      return message.reply({ embeds: [
        new EmbedBuilder()
          .setTitle('⏳ Boost Sudah Dipakai!')
          .setColor('#e74c3c')
          .setDescription(`Boost daily kamu baru bisa dipakai lagi dalam **${fmtRemaining(rem)}**`)
          .addFields({ name: '⏳ Reset', value: `<t:${Math.floor((user.lastBoostDaily+CD)/1000)}:R>`, inline: true })
          .setTimestamp()
      ]});
    }

    const boost = Math.floor(Math.random() * 5000) + 3000;
    user.balance += boost;
    user.lastBoostDaily = now;
    saveUser(message.author.id, user);

    const embed = new EmbedBuilder()
      .setTitle('👑 VIP Boost Daily Aktif!')
      .setColor('#f1c40f')
      .setImage('https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif')
      .setDescription(`Kamu mengklaim **VIP Boost Daily** eksklusif!`)
      .addFields(
        { name: '💰 Bonus',   value: `**$${boost.toLocaleString()}**`,         inline: true },
        { name: '💳 Saldo',   value: `**$${user.balance.toLocaleString()}**`,   inline: true },
        { name: '⏳ Reset',   value: `<t:${Math.floor((now+CD)/1000)}:R>`,      inline: true },
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};

// ════════════════════════════════════════════════════════════════
// 8. !spin — Putar roda keberuntungan (cd 5–10 hari)
// ════════════════════════════════════════════════════════════════
const WHEEL = [
  { label: '💸 Rugi 20%',   type: 'lose',  value: 0.20 },
  { label: '💵 +$500',      type: 'money', value: 500  },
  { label: '💵 +$1,500',    type: 'money', value: 1500 },
  { label: '💵 +$3,000',    type: 'money', value: 3000 },
  { label: '💵 +$10,000',   type: 'money', value: 10000},
  { label: '🎁 Free Daily', type: 'reset', value: 'daily'},
  { label: '💵 +$500',      type: 'money', value: 500  },
  { label: '💸 Rugi 10%',   type: 'lose',  value: 0.10 },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const spinCmd = {
  name: 'spin',
  aliases: ['roda', 'wheel'],
  description: 'Putar roda keberuntungan (cd: 5–10 hari)',
  async execute(message) {
    const user = getUser(message.author.id);
    const now  = Date.now();

    const savedCD = user.lastSpinCD || randCD();
    const { onCD, remaining, resetAt } = checkCD(user.lastSpin, savedCD);

    if (onCD) {
      const embed = new EmbedBuilder()
        .setTitle('🎡 Roda Sedang Berputar...')
        .setColor('#9b59b6')
        .setDescription(`Roda perlu waktu berhenti!\nSpin lagi dalam **${fmtRemaining(remaining)}**`)
        .addFields(
          { name: '⏳ Bisa Spin', value: `<t:${Math.floor(resetAt/1000)}:R>`, inline: true },
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const spinMsg = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎡 Memutar Roda...')
          .setColor('#9b59b6')
          .setDescription('🌀 Roda sedang berputar...\n\n```\n' + WHEEL.map(w => `[ ${w.label} ]`).join('\n') + '\n```')
          .setTimestamp()
      ]
    });

    // Animate
    for (let i = 0; i < 5; i++) {
      await sleep(400);
      const randSlice = WHEEL[Math.floor(Math.random() * WHEEL.length)];
      try {
        await spinMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle('🎡 Memutar...')
              .setColor('#e67e22')
              .setDescription(`🌀 Sedang memutar...\n\n▶️ **${randSlice.label}** ◀️`)
              .setTimestamp()
          ]
        });
      } catch (_) {}
    }

    await sleep(600);

    const result = WHEEL[Math.floor(Math.random() * WHEEL.length)];
    let desc = '', color = '#9b59b6';

    if (result.type === 'money') {
      user.balance += result.value;
      desc = `🎉 Dapat **$${result.value.toLocaleString()}**!`;
      color = '#2ecc71';
    } else if (result.type === 'lose') {
      const lost = Math.floor(user.balance * result.value);
      user.balance = Math.max(0, user.balance - lost);
      desc = `😭 Kehilangan **$${lost.toLocaleString()}** (${result.value * 100}% saldo)`;
      color = '#e74c3c';
    } else if (result.type === 'reset') {
      user.lastDaily = null;
      desc = '🎁 Daily reward di-reset! Langsung klaim `!daily`!';
      color = '#f1c40f';
    }

    const newCD = randCD();
    user.lastSpin   = now;
    user.lastSpinCD = newCD;
    saveUser(message.author.id, user);

    try {
      await spinMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle(`🎡 Roda Berhenti di: ${result.label}`)
            .setColor(color)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setDescription(desc)
            .addFields(
              { name: '💳 Saldo',     value: `**$${user.balance.toLocaleString()}**`,  inline: true },
              { name: '⏳ Cooldown',  value: `5 detik`,     inline: true },
              { name: '📅 Spin Lagi', value: `<t:${Math.floor((now+newCD)/1000)}:R>`, inline: true },
            )
            .setTimestamp()
        ]
      });
    } catch (_) {}
  },
};

// ════════════════════════════════════════════════════════════════
// 9. !duel @user <jumlah> — Tantang duel ekonomi
// ════════════════════════════════════════════════════════════════
const ACTIVE_DUELS = new Map();

const duelCmd = {
  name: 'duel',
  aliases: ['challenge', 'lawan', 'tarung'],
  description: 'Tantang user duel ekonomi!',
  async execute(message, args) {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!target || !amount || amount <= 0) {
      return message.reply({ embeds: [
        new EmbedBuilder()
          .setTitle('⚔️ Cara Duel')
          .setColor('#e74c3c')
          .setDescription('`!duel @user <jumlah>`\n\nContoh: `!duel @Bernie 1000`\n\nDuel = adu keberuntungan (dice roll)!\nPemenang ambil semua taruhan.')
          .setTimestamp()
      ]});
    }

    if (target.id === message.author.id) return message.reply('❌ Tidak bisa duel diri sendiri!');
    if (target.bot) return message.reply('❌ Tidak bisa duel bot!');
    if (ACTIVE_DUELS.has(message.author.id)) return message.reply('⚔️ Kamu sedang dalam duel!');

    const challenger = getUser(message.author.id);
    const opponent   = getUser(target.id);

    if (challenger.balance < amount) return message.reply(`❌ Saldo kamu hanya **$${challenger.balance.toLocaleString()}**!`);
    if (opponent.balance < amount)   return message.reply(`❌ ${target.username} hanya punya **$${opponent.balance.toLocaleString()}**!`);

    ACTIVE_DUELS.set(message.author.id, true);

    const embed = new EmbedBuilder()
      .setTitle('⚔️ TANTANGAN DUEL!')
      .setColor('#e74c3c')
      .setImage('https://media.giphy.com/media/3o7TKSjyyM5M0wz7Xu/giphy.gif')
      .setDescription(
        `${message.author} menantang ${target} untuk duel!\n` +
        `💵 Taruhan: **$${amount.toLocaleString()}**\n\n` +
        `${target}, reply \`!accept\` dalam 60 detik untuk menerima!`
      )
      .setTimestamp();

    const challengeMsg = await message.channel.send({ embeds: [embed] });

    const collector = message.channel.createMessageCollector({
      filter: m => m.author.id === target.id && m.content.toLowerCase() === '!accept',
      time: 60000,
      max: 1,
    });

    collector.on('collect', async () => {
      ACTIVE_DUELS.delete(message.author.id);

      const roll1 = Math.floor(Math.random() * 100) + 1;
      const roll2 = Math.floor(Math.random() * 100) + 1;
      const winner = roll1 >= roll2 ? message.author : target;
      const loser  = roll1 >= roll2 ? target : message.author;

      const winUser  = getUser(winner.id);
      const loseUser = getUser(loser.id);
      winUser.balance  += amount;
      loseUser.balance -= amount;
      saveUser(winner.id, winUser);
      saveUser(loser.id, loseUser);

      const resultEmbed = new EmbedBuilder()
        .setTitle('⚔️ DUEL SELESAI!')
        .setColor('#f1c40f')
        .setDescription(`🎲 ${message.author}: **${roll1}** vs ${target}: **${roll2}**\n\n🏆 **${winner.username}** menang duel!`)
        .addFields(
          { name: '🏆 Pemenang',    value: `${winner}`,                              inline: true },
          { name: '💰 Kemenangan',  value: `**$${amount.toLocaleString()}**`,         inline: true },
          { name: '💳 Saldo Menang',value: `**$${winUser.balance.toLocaleString()}**`, inline: true },
        )
        .setTimestamp();

      await challengeMsg.edit({ embeds: [resultEmbed] });
    });

    collector.on('end', (collected) => {
      ACTIVE_DUELS.delete(message.author.id);
      if (collected.size === 0) {
        challengeMsg.edit({ embeds: [
          new EmbedBuilder()
            .setTitle('⚔️ Tantangan Kedaluwarsa')
            .setColor('#7f8c8d')
            .setDescription(`${target.username} tidak menerima tantangan dalam 60 detik.`)
            .setTimestamp()
        ]});
      }
    });
  },
};

// ════════════════════════════════════════════════════════════════
// 10. !serverinfo — Info ekonomi server
// ════════════════════════════════════════════════════════════════
const serverInfoCmd = {
  name: 'serverinfo',
  aliases: ['sinfo', 'server', 'ekonomiserver'],
  description: 'Statistik ekonomi server',
  async execute(message) {
    const db      = loadDB();
    const users   = Object.values(db);
    const total   = users.length;
    const totalMoney = users.reduce((s, u) => s + (u.balance||0) + (u.bank||0), 0);
    const totalAnimals = users.reduce((s, u) => s + (u.animals?.length||0), 0);
    const richest = Object.entries(db).sort((a,b) => ((b[1].balance||0)+(b[1].bank||0)) - ((a[1].balance||0)+(a[1].bank||0)))[0];
    const avgBalance = total > 0 ? Math.floor(totalMoney / total) : 0;

    const embed = new EmbedBuilder()
      .setTitle(`📊 Statistik Ekonomi — ${message.guild?.name}`)
      .setColor('#3498db')
      .setThumbnail(message.guild?.iconURL({ dynamic: true }))
      .addFields(
        { name: '👥 Total Pemain',   value: `**${total}**`,                          inline: true },
        { name: '💰 Uang Beredar',   value: `**$${totalMoney.toLocaleString()}**`,   inline: true },
        { name: '📈 Rata-rata',      value: `**$${avgBalance.toLocaleString()}**`,   inline: true },
        { name: '🦁 Total Hewan',    value: `**${totalAnimals}**`,                   inline: true },
        { name: '🏆 Terkaya',        value: richest ? `<@${richest[0]}>` : 'N/A',   inline: true },
        { name: '💳 Kekayaan Teratas',value: richest ? `**$${((richest[1].balance||0)+(richest[1].bank||0)).toLocaleString()}**` : 'N/A', inline: true },
      )
      .setFooter({ text: 'Data diperbarui realtime' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};

module.exports = [
  cooldownsCmd,
  payCmd,
  giftCmd,
  topZooCmd,
  achievementsCmd,
  netCmd,
  boostDailyCmd,
  spinCmd,
  duelCmd,
  serverInfoCmd,
];
