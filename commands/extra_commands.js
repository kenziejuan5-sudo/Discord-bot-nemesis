// extra_commands.js — 15 Command Baru dengan UI Clean
// 1.  !invest       — Investasi saham dengan resiko
// 2.  !casino       — Masuk casino (beli chip, main roulette)
// 3.  !clan         — Sistem clan/guild (buat/gabung/info)
// 4.  !bounty       — Pasang bounty ke user lain
// 5.  !fish sell    — Jual semua ikan sekaligus
// 6.  !coolreset    — Reset satu cooldown dengan uang (VIP)
// 7.  !richinfo @u  — Analisis keuangan user
// 8.  !weekly       — Reward mingguan khusus VIP
// 9.  !flip @user   — Tantang coinflip 1v1 ke user
// 10. !jackpot      — Lihat jackpot pot saat ini
// 11. !mine sell    — Jual semua mineral sekaligus
// 12. !bank rob     — Curi dari bank user lain (berisiko)
// 13. !top week     — Leaderboard mingguan (who earned most)
// 14. !item info    — Info detail item + cara dapat
// 15. !flex         — Pamerkan kekayaan dengan animasi

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, saveUser, loadDB, isVip, isAdmin } = require('../utils/database');
const { getAnimalById, ANIMALS }  = require('../utils/animals');
const { randCD, checkCD, fmtRemaining } = require('../utils/cooldown');
const { COLORS, SEP, progressBar, RARITY, cooldownEmbed, errorEmbed } = require('../utils/embed');

const OWNER_ID = '1213365471693246504';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── UI HELPERS ───────────────────────────────────────────────
function field(name, value, inline = true) { return { name, value, inline }; }
function money(n) { return `**$${Number(n||0).toLocaleString()}**`; }
function cd(ts, savedMS, def = randCD()) {
  if (!ts) return '✅ Ready';
  const rem = (savedMS||def) - (Date.now()-ts);
  if (rem <= 0) return '✅ Ready';
  return `⏳ <t:${Math.floor((ts+(savedMS||def))/1000)}:R>`;
}

// ═══════════════════════════════════════════════════════════════
// 1. !invest <jumlah> <saham> — Investasi saham
// ═══════════════════════════════════════════════════════════════
const STOCKS = [
  { id:'tech',    name:'💻 TechCorp',    risk:0.40, mult:[0.5, 3.0], trend:'📈 Bullish' },
  { id:'crypto',  name:'🪙 CryptoCoin',  risk:0.55, mult:[0.1, 5.0], trend:'🎢 Volatile' },
  { id:'food',    name:'🍔 FoodChain',   risk:0.25, mult:[0.7, 2.0], trend:'📊 Stable'  },
  { id:'energy',  name:'⚡ EnergyPlus',  risk:0.35, mult:[0.6, 2.5], trend:'📈 Growing' },
  { id:'luxury',  name:'💎 LuxuryBrand', risk:0.30, mult:[0.8, 4.0], trend:'💹 Premium' },
];

const investCmd = {
  name: 'invest',
  aliases: ['saham', 'investasi', 'inv'],
  description: '📈 Investasi saham virtual! (cd 1-15 hari)',
  async execute(message, args) {
    const user    = getUser(message.author.id);
    const savedCD = randCD(); // 5 detik
    const { onCD, remaining, resetAt } = checkCD(user.lastInvest, savedCD);

    if (!args[0] || args[0] === 'list') {
      const embed = new EmbedBuilder()
        .setTitle('📊  Pasar Saham')
        .setColor(COLORS.cyan)
        .setDescription(`${SEP}\n💳 Saldo: ${money(user.balance)}\n${SEP}`)
        .addFields(STOCKS.map(s => field(
          `${s.name}  \`${s.id}\``,
          `${s.trend} • Risk: ${Math.round(s.risk*100)}% loss\n` +
          `Return: ${s.mult[0]}x – ${s.mult[1]}x`,
          false
        )))
        .addFields(field('\u200b', `\`!invest <jumlah> <id_saham>\`\nContoh: \`!invest 5000 tech\``, false))
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (onCD) {
      return message.reply({ embeds: [cooldownEmbed('Invest', fmtRemaining(remaining), Math.floor(resetAt/1000))] });
    }

    const amount = parseInt(args[0]);
    const stock  = STOCKS.find(s => s.id === args[1]?.toLowerCase());
    if (!amount || amount < 100) return message.reply({ embeds: [errorEmbed('Minimal investasi $100', 'Format: `!invest <jumlah> <saham_id>`')] });
    if (!stock)  return message.reply({ embeds: [errorEmbed('Saham tidak ditemukan', 'Ketik `!invest list` untuk daftar saham')] });
    if ((user.balance||0) < amount) return message.reply({ embeds: [errorEmbed('Saldo Tidak Cukup', `Punya ${money(user.balance)}`)] });

    // Animasi
    const msg = await message.reply({ embeds: [new EmbedBuilder()
      .setTitle('📊  Memproses Investasi...')
      .setColor(COLORS.info)
      .setDescription(`> Membeli saham **${stock.name}**...\n> Menghitung return...`)
      .setTimestamp()
    ]});
    await sleep(2000);

    const win  = Math.random() > stock.risk;
    const mult = win
      ? (Math.random()*(stock.mult[1]-1.1)+1.1)
      : (Math.random()*(1-stock.mult[0])+stock.mult[0]);
    const result  = Math.floor(amount * mult);
    const profit  = result - amount;
    const newCD = randCD(); // 5 detik

    user.balance       = Math.max(0, (user.balance||0) - amount + result);
    user.lastInvest    = Date.now();
    saveUser(message.author.id, user);

    await msg.edit({ embeds: [new EmbedBuilder()
      .setTitle(win ? `📈  ${stock.name} — PROFIT!` : `📉  ${stock.name} — RUGI!`)
      .setColor(win ? COLORS.success : COLORS.error)
      .setDescription(`${SEP}`)
      .addFields(
        field('📊 Saham',      stock.name),
        field(win?'📈 Return':'📉 Loss', `${mult.toFixed(2)}x`),
        field('💵 Modal',      money(amount)),
        field(win?'💰 Profit':'💸 Rugi', money(Math.abs(profit))),
        field('💳 Saldo',      money(user.balance)),
        field('⏳ CD',         `5 detik`),
        field('🔄 Invest Lagi', `<t:${Math.floor((Date.now()+newCD)/1000)}:R>`, false),
      )
      .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
      .setFooter({text: `Risk: ${Math.round(stock.risk*100)}% • ${stock.trend}`})
      .setTimestamp()
    ]});
  },
};

// ═══════════════════════════════════════════════════════════════
// 2. !roulette <jumlah> <pilihan> — Roulette Casino
// ═══════════════════════════════════════════════════════════════
const ROULETTE_CHOICES = {
  red:   { label:'🔴 Merah',  mult:2.0, nums:[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] },
  black: { label:'⚫ Hitam',  mult:2.0, nums:[2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35] },
  green: { label:'🟢 Hijau',  mult:14,  nums:[0] },
  odd:   { label:'🔢 Ganjil', mult:2.0, nums:[1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35] },
  even:  { label:'🔢 Genap',  mult:2.0, nums:[2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36] },
};

const rouletteCmd = {
  name: 'roulette',
  aliases: ['rl', 'rolet', 'putar'],
  description: '🎡 Main Roulette Casino! (cd 1-15 hari)',
  async execute(message, args) {
    const user    = getUser(message.author.id);
    const savedCD = randCD(); // 5 detik
    const { onCD, remaining, resetAt } = checkCD(user.lastRoulette, savedCD);

    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setTitle('🎡  Roulette Casino')
        .setColor(COLORS.dark)
        .setDescription(
          `${SEP}\n**Cara Main:** \`!roulette <jumlah> <pilihan>\`\n${SEP}\n\n` +
          Object.entries(ROULETTE_CHOICES).map(([k,v])=>
            `\`${k}\` ${v.label} — **${v.mult}x**`
          ).join('\n') +
          `\n\nContoh: \`!roulette 1000 red\``
        ).setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (onCD) return message.reply({ embeds: [cooldownEmbed('Roulette', fmtRemaining(remaining), Math.floor(resetAt/1000))] });

    const amount = parseInt(args[0]);
    const choice = args[1]?.toLowerCase();
    const opt    = ROULETTE_CHOICES[choice];
    if (!amount || amount < 50) return message.reply({ embeds: [errorEmbed('Minimal $50', 'Format: `!roulette <jumlah> <red/black/green/odd/even>`')] });
    if (!opt) return message.reply({ embeds: [errorEmbed('Pilihan salah', 'Pilih: `red` `black` `green` `odd` `even`')] });
    if ((user.balance||0) < amount) return message.reply({ embeds: [errorEmbed('Saldo kurang', `Punya ${money(user.balance)}`)] });

    // Animasi bola berputar
    const spinMsg = await message.reply({ embeds: [new EmbedBuilder()
      .setTitle('🎡  Roulette Berputar...')
      .setColor(COLORS.warning)
      .setDescription('```\n🔴⚫🟢🔴⚫🔴⚫🟢🔴⚫\n    🎯 Bola berputar...   \n```')
      .setTimestamp()
    ]});

    const frames = ['🔴⚫🟢', '⚫🟢🔴', '🟢🔴⚫', '🔴⚫🟢'];
    for (const f of frames) {
      await sleep(400);
      await spinMsg.edit({ embeds: [new EmbedBuilder()
        .setTitle('🎡  Roulette Berputar...')
        .setColor(COLORS.warning)
        .setDescription(`\`\`\`\n${f}🔴⚫🟢🔴⚫🟢🔴\n    ⬇️ Bola jatuh...     \n\`\`\``)
        .setTimestamp()
      ]}).catch(()=>{});
    }
    await sleep(500);

    const ball   = Math.floor(Math.random()*37); // 0-36
    const isRed  = ROULETTE_CHOICES.red.nums.includes(ball);
    const ballColor = ball===0 ? '🟢' : isRed ? '🔴' : '⚫';
    const won    = opt.nums.includes(ball);
    const newCD = randCD(); // 5 detik

    if (won) {
      const earned = Math.floor(amount * opt.mult);
      user.balance = (user.balance||0) - amount + earned;
    } else {
      user.balance = Math.max(0, (user.balance||0) - amount);
    }
    user.lastRoulette   = Date.now();
    saveUser(message.author.id, user);

    await spinMsg.edit({ embeds: [new EmbedBuilder()
      .setTitle(won ? `🎡  Roulette — MENANG!` : `🎡  Roulette — KALAH!`)
      .setColor(won ? COLORS.gold : COLORS.error)
      .setDescription(`${SEP}\n## ${ballColor} Bola jatuh di angka **${ball}**!\n${SEP}`)
      .addFields(
        field('🎯 Pilihanmu',  `${opt.label}`),
        field('🎱 Hasil',      `${ballColor} **${ball}**`),
        field('💵 Taruhan',    money(amount)),
        field(won?'💰 Menang':'💸 Kalah', money(amount*(won?opt.mult-1:1))),
        field('💳 Saldo',      money(user.balance)),
        field('🔄 Main Lagi',  `<t:${Math.floor((Date.now()+newCD)/1000)}:R>`, false),
      )
      .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
      .setTimestamp()
    ]});
  },
};

// ═══════════════════════════════════════════════════════════════
// 3. !bounty — Pasang hadiah untuk user lain
// ═══════════════════════════════════════════════════════════════
const bountyCmd = {
  name: 'bounty',
  aliases: ['buronan', 'hadiah', 'bn'],
  description: '🎯 Pasang hadiah untuk user yang bisa dirampok',
  async execute(message, args) {
    const db = loadDB();
    if (!db.__bounties__) db.__bounties__ = [];

    const sub = args[0]?.toLowerCase();

    if (!sub || sub === 'list') {
      const active = db.__bounties__.filter(b => b.active && b.amount > 0);
      const embed  = new EmbedBuilder()
        .setTitle('🎯  Papan Bounty')
        .setColor(COLORS.error)
        .setDescription(active.length
          ? `${SEP}\n` + active.map((b,i)=>
              `**${i+1}.** <@${b.targetId}>\n  💰 Hadiah: ${money(b.amount)} • Dipasang: <@${b.byId}>`
            ).join('\n\n')
          : `${SEP}\nBelum ada bounty aktif.\nPasang: \`!bounty set @user <jumlah>\``
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (sub === 'set' || sub === 'pasang') {
      const target = message.mentions.users.first();
      const amount = parseInt(args[2]);
      if (!target || !amount || amount < 500) return message.reply({ embeds: [errorEmbed('Format salah', '`!bounty set @user <jumlah>` (minimal $500)')] });
      if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('Tidak bisa', 'Tidak bisa pasang bounty ke diri sendiri!')] });

      const user = getUser(message.author.id);
      if ((user.balance||0) < amount) return message.reply({ embeds: [errorEmbed('Saldo kurang', `Punya ${money(user.balance)}`)] });

      user.balance = (user.balance||0) - amount;
      saveUser(message.author.id, user);

      const existing = db.__bounties__.find(b => b.targetId === target.id && b.active);
      if (existing) existing.amount += amount;
      else db.__bounties__.push({ targetId:target.id, amount, byId:message.author.id, active:true, at:Date.now() });
      require('../utils/database').saveDB(db);

      const embed = new EmbedBuilder()
        .setTitle('🎯  Bounty Dipasang!')
        .setColor(COLORS.error)
        .setDescription(`${SEP}\nKamu memasang bounty untuk ${target}!\n${SEP}`)
        .addFields(
          field('🎯 Target',    `${target}`),
          field('💰 Hadiah',    money(amount)),
          field('💳 Saldo',     money(user.balance)),
          field('\u200b', 'Siapapun yang berhasil `!rob` target ini akan dapat bonus hadiah!', false),
        )
        .setThumbnail(target.displayAvatarURL({dynamic:true}))
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }
  },
};

// ═══════════════════════════════════════════════════════════════
// 4. !weekly — Reward mingguan VIP khusus
// ═══════════════════════════════════════════════════════════════
const weeklyCmd = {
  name: 'weekly',
  aliases: ['mingguan', 'wk'],
  description: '👑 Reward mingguan eksklusif VIP (cd 7 hari)',
  async execute(message) {
    const vip = isVip(message.author.id) || message.author.id === OWNER_ID;
    if (!vip) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('👑  Fitur VIP')
        .setColor(COLORS.gold)
        .setDescription(`${SEP}\n\`!weekly\` hanya untuk **VIP Member**!\n${SEP}\nDapatkan VIP dari Admin: \`!vipinfo\``)
        .setTimestamp()
      ]});
    }

    const user = getUser(message.author.id);
    const CD = 5000; // 5 detik
    const { onCD, remaining, resetAt } = checkCD(user.lastWeekly, CD);
    if (onCD) return message.reply({ embeds: [cooldownEmbed('Weekly VIP', fmtRemaining(remaining), Math.floor(resetAt/1000))] });

    const prestige = user.prestige || 0;
    const base     = 15000 + prestige * 2000;
    const bonus    = Math.floor(Math.random() * 10000);
    const total    = base + bonus;

    user.balance    = (user.balance||0) + total;
    user.lastWeekly = Date.now();
    saveUser(message.author.id, user);

    const embed = new EmbedBuilder()
      .setTitle('👑  Weekly VIP Reward!')
      .setColor(COLORS.gold)
      .setDescription(`${SEP}\n🌟 Reward mingguan eksklusif VIP telah diklaim!\n${SEP}`)
      .addFields(
        field('💵 Base Reward',  money(base)),
        field('✨ Bonus Acak',   money(bonus)),
        field('💰 Total',        money(total)),
        field('💳 Saldo Baru',   money(user.balance)),
        field('⭐ Prestige Bonus', prestige > 0 ? `+${prestige*2000}/minggu` : 'Belum prestige', false),
        field('🔄 Minggu Depan', `<t:${Math.floor((Date.now()+CD)/1000)}:R>`, false),
      )
      .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
      .setImage('https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif')
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 5. !flip1v1 @user <jumlah> — Tantang coinflip 1v1
// ═══════════════════════════════════════════════════════════════
const ACTIVE_1V1 = new Map();

const flip1v1Cmd = {
  name: 'flip1v1',
  aliases: ['cf1v1','tantang','versus','vs'],
  description: '🪙 Tantang user coinflip 1v1! Pemenang ambil semua',
  async execute(message, args) {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target||!amount||amount<100) return message.reply({ embeds: [errorEmbed('Format salah','`!flip1v1 @user <jumlah>` (min $100)')] });
    if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('Tidak bisa','Tidak bisa lawan diri sendiri!')] });
    if (target.bot) return message.reply({ embeds: [errorEmbed('Tidak bisa','Tidak bisa lawan bot!')] });
    if (ACTIVE_1V1.has(message.author.id)) return message.reply({ embeds: [errorEmbed('Sibuk','Kamu sedang dalam tantangan lain!')] });

    const challenger = getUser(message.author.id);
    const opponent   = getUser(target.id);
    if ((challenger.balance||0) < amount) return message.reply({ embeds: [errorEmbed('Saldo kurang', `Punya ${money(challenger.balance)}`)] });
    if ((opponent.balance||0)   < amount) return message.reply({ embeds: [errorEmbed('Saldo lawan kurang', `${target.username} hanya punya ${money(opponent.balance)}`)] });

    ACTIVE_1V1.set(message.author.id, true);

    const embed = new EmbedBuilder()
      .setTitle('🪙  Tantangan 1v1 Coinflip!')
      .setColor(COLORS.gold)
      .setDescription(`${SEP}\n${message.author} menantang ${target} untuk duel koin!\n\n💰 Taruhan: ${money(amount)}\n${SEP}\n\n${target}, ketik \`!accept\` dalam **60 detik!**`)
      .setTimestamp();
    const challengeMsg = await message.channel.send({ embeds: [embed] });

    const col = message.channel.createMessageCollector({
      filter: m => m.author.id===target.id && m.content.toLowerCase()==='!accept',
      time: 60000, max: 1,
    });

    col.on('collect', async () => {
      ACTIVE_1V1.delete(message.author.id);
      const flip1  = Math.random() < 0.5;
      const result = flip1 ? message.author : target;
      const loser  = flip1 ? target : message.author;

      const wu = getUser(result.id); wu.balance = (wu.balance||0) + amount; saveUser(result.id, wu);
      const lu = getUser(loser.id);  lu.balance = Math.max(0,(lu.balance||0)-amount); saveUser(loser.id, lu);

      await challengeMsg.edit({ embeds: [new EmbedBuilder()
        .setTitle('🎊  Coinflip 1v1 — Hasil!')
        .setColor(COLORS.gold)
        .setDescription(`${SEP}\n## ${flip1?'🌕 HEADS':'🌑 TAILS'}\n🏆 **${result.username}** MENANG!\n${SEP}`)
        .addFields(
          field('🏆 Pemenang',   `${result}`),
          field('💸 Kalah',      `${loser}`),
          field('💰 Pot Total',  money(amount*2)),
          field('💳 Saldo Menang', money(wu.balance)),
        )
        .setThumbnail(result.displayAvatarURL({dynamic:true}))
        .setTimestamp()
      ]});
    });

    col.on('end', collected => {
      ACTIVE_1V1.delete(message.author.id);
      if (!collected.size) {
        challengeMsg.edit({ embeds: [new EmbedBuilder()
          .setTitle('⏱️  Tantangan Kedaluwarsa')
          .setColor(COLORS.dark)
          .setDescription(`${target.username} tidak merespons dalam 60 detik.`)
          .setTimestamp()
        ]});
      }
    });
  },
};

// ═══════════════════════════════════════════════════════════════
// 6. !jackpot — Lihat jackpot pool & cara memenangkannya
// ═══════════════════════════════════════════════════════════════
const jackpotCmd = {
  name: 'jackpot',
  aliases: ['jp', 'prize', 'pot'],
  description: '💎 Info jackpot & leaderboard pemenang terbesar',
  async execute(message) {
    const db      = loadDB();
    const tickets = Object.values(db).reduce((s,u)=>s+(u.lotteryTickets||0),0);
    const jackpot = Math.floor(tickets * 500 * 0.8);

    const topWin  = Object.entries(db)
      .map(([id,d])=>({id, best: d.mineStats?.best||0}))
      .sort((a,b)=>b.best-a.best).slice(0,5);

    const embed = new EmbedBuilder()
      .setTitle('💎  Info Jackpot & Prize Pool')
      .setColor(COLORS.gold)
      .setDescription(`${SEP}`)
      .addFields(
        field('🎟️ Jackpot Lotre',   money(jackpot||0), false),
        field('🎟️ Total Tiket',     `**${tickets}**`),
        field('💎 Jackpot Slots',   `**50x** taruhan (7️⃣7️⃣7️⃣)`),
        field('🎡 Jackpot Gosok',    `**$50,000** (💎💎💎)`, false),
        field('\u200b', `${SEP}\n🏆 **Top Mining Jackpot:**`, false),
        ...topWin.map((e,i)=>field(
          `${['🥇','🥈','🥉','4️⃣','5️⃣'][i]} <@${e.id}>`,
          money(e.best), false
        )),
      )
      .setImage('https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif')
      .setFooter({text:'Beli tiket lotre: !lottery buy • Main slots: !slots'})
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 7. !minesell — Jual semua mineral hasil tambang
// ═══════════════════════════════════════════════════════════════
const mineSellCmd = {
  name: 'minesell',
  aliases: ['jualmineral', 'msell'],
  description: '⛏️ Jual semua mineral di storage',
  async execute(message) {
    const user = getUser(message.author.id);
    const minerals = user.mineralStorage || [];

    if (!minerals.length) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('⛏️  Storage Mineral Kosong')
        .setColor(COLORS.dark)
        .setDescription(`${SEP}\nBelum ada mineral tersimpan!\nGunakan \`!mine\` untuk menambang.\n${SEP}`)
        .setTimestamp()
      ]});
    }

    const total = minerals.reduce((s,m)=>s+m.value,0);
    user.balance = (user.balance||0) + total;
    user.mineralStorage = [];
    saveUser(message.author.id, user);

    const breakdown = {};
    for (const m of minerals) breakdown[m.name] = (breakdown[m.name]||0)+1;

    const embed = new EmbedBuilder()
      .setTitle('⛏️  Semua Mineral Terjual!')
      .setColor(COLORS.success)
      .setDescription(`${SEP}\n` + Object.entries(breakdown).map(([n,c])=>`> ${n} ×${c}`).join('\n') + `\n${SEP}`)
      .addFields(
        field('💰 Total Penjualan', money(total)),
        field('💳 Saldo Baru',      money(user.balance)),
        field('📦 Item Terjual',    `**${minerals.length}** mineral`),
      )
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 8. !bankrob @user — Curi uang dari bank user lain (berisiko)
// ═══════════════════════════════════════════════════════════════
const bankRobCmd = {
  name: 'bankrob',
  aliases: ['robbank','curibank','br'],
  description: '🏦 Curi dari bank user! Super berisiko (cd 1-15 hari)',
  async execute(message, args) {
    const target = message.mentions.users.first();
    if (!target) return message.reply({ embeds: [errorEmbed('Tag target!','`!bankrob @user`')] });
    if (target.id===message.author.id) return message.reply({ embeds: [errorEmbed('Tidak bisa','Tidak bisa merampok bank sendiri!')] });

    const robber = getUser(message.author.id);
    const victim = getUser(target.id);
    const savedCD = robber.lastBankRobCD || randCD(1,15);
    const { onCD, remaining, resetAt } = checkCD(robber.lastBankRob, savedCD);

    if (onCD) return message.reply({ embeds: [cooldownEmbed('Bank Rob', fmtRemaining(remaining), Math.floor(resetAt/1000))] });
    if ((victim.bank||0) < 1000) return message.reply({ embeds: [errorEmbed('Bank terlalu kecil',`${target.username} hanya punya ${money(victim.bank)} di bank (min $1,000)`)] });

    const animMsg = await message.reply({ embeds: [new EmbedBuilder()
      .setTitle('🏦  Membobol Keamanan Bank...')
      .setColor(COLORS.dark)
      .setDescription('```\n🔐 Bypass sistem keamanan...\n💻 Hack terminal bank...\n🏃 Kabur dari CCTV...\n```')
      .setTimestamp()
    ]});
    await sleep(2500);

    const SUCCESS = 0.25; // Hanya 25% berhasil
    const newCD = randCD(); // 5 detik
    robber.lastBankRob   = Date.now();
    robber.lastBankRobCD = newCD;

    const success = Math.random() < SUCCESS;
    if (success) {
      const stolen = Math.floor((victim.bank||0) * (Math.random()*0.2+0.05)); // 5-25% bank
      victim.bank = Math.max(0,(victim.bank||0)-stolen);
      robber.balance = (robber.balance||0)+stolen;
      saveUser(target.id, victim);
      saveUser(message.author.id, robber);

      await animMsg.edit({ embeds: [new EmbedBuilder()
        .setTitle('🏦  Bank Berhasil Dibobol!')
        .setColor(COLORS.success)
        .setDescription(`${SEP}\n💸 Kamu berhasil mencuri dari bank **${target.username}**!\n${SEP}`)
        .addFields(
          field('🎯 Korban',   `${target}`),
          field('💸 Dicuri',   money(stolen)),
          field('💳 Saldo',    money(robber.balance)),
          field('⏳ CD Baru',  `5 detik`),
          field('🔄 Rob Lagi', `<t:${Math.floor((Date.now()+newCD)/1000)}:R>`, false),
        )
        .setImage('https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif')
        .setThumbnail(target.displayAvatarURL({dynamic:true}))
        .setTimestamp()
      ]});

      target.send({ embeds: [new EmbedBuilder()
        .setTitle('🚨  Bank Kamu Dibobol!')
        .setColor(COLORS.error)
        .setDescription(`**${message.author.tag}** mencuri ${money(stolen)} dari bank kamu di **${message.guild?.name}**!`)
        .setTimestamp()
      ]}).catch(()=>{});
    } else {
      const fine = Math.floor((robber.balance||0)*0.35);
      robber.balance = Math.max(0,(robber.balance||0)-fine);
      saveUser(message.author.id, robber);

      await animMsg.edit({ embeds: [new EmbedBuilder()
        .setTitle('🚔  Sistem Keamanan Mengaktifkan Alarm!')
        .setColor(COLORS.error)
        .setDescription(`${SEP}\nPolisi menangkapmu tepat di depan vault!\nDenda besar menanti!\n${SEP}`)
        .addFields(
          field('💸 Denda',    money(fine)),
          field('💳 Saldo',    money(robber.balance)),
          field('📊 Chance',   '**25%** sukses'),
          field('🔄 Rob Lagi', `<t:${Math.floor((Date.now()+newCD)/1000)}:R>`, false),
        )
        .setImage('https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif')
        .setTimestamp()
      ]});
    }
  },
};

// ═══════════════════════════════════════════════════════════════
// 9. !topweek — Siapa yang paling banyak earning minggu ini
// ═══════════════════════════════════════════════════════════════
const topweekCmd = {
  name: 'topweek',
  aliases: ['weeklyrank','tw','minggutop'],
  description: '📅 Leaderboard penghasilan minggu ini',
  async execute(message) {
    const db      = loadDB();
    const weekAgo = Date.now() - 7*24*3600*1000;

    // Hitung berdasarkan net worth karena tidak ada tracking khusus
    const entries = Object.entries(db)
      .map(([id,d]) => {
        const zoo = (d.animals||[]).reduce((s,a)=>s+(getAnimalById(a.id)?.value||0),0);
        return { id, net:(d.balance||0)+(d.bank||0)+zoo, prestige: d.prestige||0 };
      })
      .sort((a,b)=>b.net-a.net).slice(0,10);

    const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    const lines  = entries.map((e,i)=>`${medals[i]} <@${e.id}>\n  └ ${money(e.net)}${e.prestige?` ⭐×${e.prestige}`:''}`).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle('📅  Leaderboard Kekayaan')
      .setColor(COLORS.cyan)
      .setDescription(`${SEP}\n${lines}\n${SEP}`)
      .setThumbnail(message.guild?.iconURL({dynamic:true}))
      .setFooter({text:`Server: ${message.guild?.name} • Diperbarui realtime`})
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 10. !iteminfo <id> — Info detail item
// ═══════════════════════════════════════════════════════════════
const ALL_ITEMS = [
  { id:'fishing_rod',   name:'🎣 Joran Pancing',      price:500,  desc:'Wajib untuk !fish',              how:'!shop buy fishing_rod' },
  { id:'hunting_rifle', name:'🔫 Senapan Berburu',     price:2000, desc:'+20% catch rate !hunt',          how:'!shop buy hunting_rifle' },
  { id:'lucky_charm',   name:'🍀 Jimat Keberuntungan', price:1500, desc:'Boost luck (10x pakai)',          how:'!shop buy lucky_charm' },
  { id:'treasure_map',  name:'🗺️ Peta Harta',          price:800,  desc:'Harta $500-$10k (1x)',           how:'!shop buy treasure_map' },
  { id:'vip_pass',      name:'👑 VIP Pass',            price:8000, desc:'VIP 24 jam penuh',               how:'!shop buy vip_pass' },
  { id:'bait',          name:'🪱 Umpan Ikan',          price:100,  desc:'10 umpan untuk !fish',           how:'!shop buy bait' },
  { id:'energy_drink',  name:'⚡ Energy Drink',        price:3000, desc:'Reset cooldown !work',            how:'!shop buy energy_drink' },
  { id:'robbery_mask',  name:'🎭 Topeng Perampok',     price:2500, desc:'+20% sukses !rob',               how:'!shop buy robbery_mask' },
];

const itemInfoCmd = {
  name: 'iteminfo',
  aliases: ['iinfo','ii','itemdetail'],
  description: '📦 Info detail semua item atau satu item',
  async execute(message, args) {
    if (args[0]) {
      const item = ALL_ITEMS.find(i=>i.id===args[0].toLowerCase());
      if (!item) return message.reply({ embeds: [errorEmbed('Item tidak ditemukan', `Ketik \`!iteminfo\` untuk daftar lengkap`)] });
      const user  = getUser(message.author.id);
      const owned = (user.inventory||[]).find(i=>i.id===item.id);
      const vip   = isVip(message.author.id)||message.author.id===OWNER_ID;

      const embed = new EmbedBuilder()
        .setTitle(`📦  ${item.name}`)
        .setColor(COLORS.info)
        .setDescription(`${SEP}\n> ${item.desc}\n${SEP}`)
        .addFields(
          field('💰 Harga Beli', money(vip?Math.floor(item.price*.9):item.price) + (vip?' *(VIP -10%)*':'')),
          field('💸 Harga Jual', money(Math.floor(item.price*.5))),
          field('📦 Dimiliki',   owned ? `**${owned.quantity}x**${owned.usesLeft?` (${owned.usesLeft} uses)`:''}` : '**0**'),
          field('🛒 Cara Dapat', `\`${item.how}\``, false),
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const user = getUser(message.author.id);
    const embed = new EmbedBuilder()
      .setTitle('📦  Daftar Semua Item')
      .setColor(COLORS.info)
      .setDescription(`${SEP}\nKetik \`!iteminfo <id>\` untuk detail\n${SEP}`)
      .addFields(ALL_ITEMS.map(item => {
        const owned = (user.inventory||[]).find(i=>i.id===item.id);
        return field(
          `${item.name}`,
          `\`${item.id}\` • ${money(item.price)}${owned?` • ✅ ×${owned.quantity}`:''}\n> ${item.desc}`,
          false
        );
      }))
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 11. !flex — Pamer kekayaan dengan animasi
// ═══════════════════════════════════════════════════════════════
const flexCmd = {
  name: 'flex',
  aliases: ['pamer','show','kaya'],
  description: '💅 Pamer kekayaan kamu dengan style!',
  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const user   = getUser(target.id);

    const animals = user.animals||[];
    const zoo     = animals.reduce((s,a)=>s+(getAnimalById(a.id)?.value||0),0);
    const net     = (user.balance||0)+(user.bank||0)+zoo;
    const prestige = user.prestige||0;

    const db     = loadDB();
    const sorted = Object.entries(db).map(([id,d])=>({id,net:(d.balance||0)+(d.bank||0)})).sort((a,b)=>b.net-a.net);
    const rank   = sorted.findIndex(e=>e.id===target.id)+1;
    const total  = sorted.length;
    const pct    = total>0 ? Math.round((1-((rank-1)/total))*100) : 0;

    // Tentukan tier kekayaan
    const tier = net>=1000000 ? { label:'💎 SULTAN',     color:COLORS.gold,    img:'https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif' }
               : net>=500000  ? { label:'💰 KONGLOMERAT', color:COLORS.purple,  img:'https://media.giphy.com/media/l4FGFEMFEt2sCpDRK/giphy.gif' }
               : net>=100000  ? { label:'🤑 TAJIR',       color:COLORS.cyan,    img:'https://media.giphy.com/media/26BGqfMnHoFmBFTCg/giphy.gif' }
               : net>=10000   ? { label:'💵 LUMAYAN',     color:COLORS.success, img:'https://media.giphy.com/media/3oFzmkkwkFyTEkbVM4/giphy.gif' }
               :                { label:'🪙 MASIH BELAJAR',color:COLORS.dark,   img:'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif' };

    const bar = progressBar(pct, 100, 20);

    const embed = new EmbedBuilder()
      .setTitle(`💅  ${tier.label} — ${target.username}`)
      .setColor(tier.color)
      .setThumbnail(target.displayAvatarURL({dynamic:true}))
      .setImage(tier.img)
      .setDescription(
        `${SEP}\n` +
        `**Kekayaan:** ${money(net)}\n` +
        `**Rank:** #${rank} dari ${total} pemain (Top ${100-pct}%)\n` +
        `\`${bar}\` ${pct}%\n` +
        (prestige>0?`**Prestige:** ${'⭐'.repeat(prestige)}\n`:'')+
        `${SEP}`
      )
      .addFields(
        field('💵 Kas',      money(user.balance)),
        field('🏦 Bank',     money(user.bank)),
        field('🦁 Zoo',      money(zoo)),
        field('🦁 Hewan',    `**${animals.length}**`),
        field('🔥 Streak',   `**${user.dailyStreak||0}** minggu`),
        field('🎒 Items',    `**${(user.inventory||[]).length}**`),
      )
      .setFooter({text: target.id===OWNER_ID ? '👑 PEMILIK BOT' : isVip(target.id)?'⭐ VIP Member':'👤 Member'})
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 12. !coolreset <command> — Reset cooldown dengan bayar (VIP)
// ═══════════════════════════════════════════════════════════════
const CD_PRICES = {
  hunt: 5000, fish: 3000, work: 8000, mine: 4000,
  slots: 5000, blackjack: 5000, race: 5000, coinflip: 3000,
  crime: 6000, rob: 4000, heist: 7000,
};

const coolResetCmd = {
  name: 'coolreset',
  aliases: ['cdreset','skipcooldown','cdr'],
  description: '⏭️ Skip cooldown dengan uang (VIP: 50% diskon)',
  async execute(message, args) {
    const user = getUser(message.author.id);
    const cmd  = args[0]?.toLowerCase();
    const vip  = isVip(message.author.id)||message.author.id===OWNER_ID;

    if (!cmd) {
      const embed = new EmbedBuilder()
        .setTitle('⏭️  Reset Cooldown dengan Uang')
        .setColor(COLORS.purple)
        .setDescription(`${SEP}\nBayar untuk skip cooldown!\n${vip?'👑 **VIP diskon 50%!**':''}\n${SEP}`)
        .addFields(Object.entries(CD_PRICES).map(([c,p])=>field(
          `!${c}`,
          money(vip?Math.floor(p*.5):p)
        )))
        .addFields(field('\u200b','`!coolreset <command>`',false))
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (!CD_PRICES[cmd]) return message.reply({ embeds: [errorEmbed('Command tidak ada',`Command \`${cmd}\` tidak bisa direset.\nKetik \`!coolreset\` untuk daftar.`)] });

    const price = vip ? Math.floor(CD_PRICES[cmd]*.5) : CD_PRICES[cmd];
    if ((user.balance||0)<price) return message.reply({ embeds: [errorEmbed('Saldo kurang',`Butuh ${money(price)}, kamu punya ${money(user.balance)}`)] });

    const KEY_MAP = {
      hunt:'lastHunt', fish:'lastFish', work:'lastWork', mine:'lastMine',
      slots:'lastSlots', blackjack:'lastBJ', race:'lastRace', coinflip:'lastCF',
      crime:'lastCrime', rob:'lastRob', heist:'lastHeist',
    };

    user.balance = (user.balance||0)-price;
    user[KEY_MAP[cmd]] = null;
    saveUser(message.author.id, user);

    const embed = new EmbedBuilder()
      .setTitle(`⏭️  Cooldown \`!${cmd}\` Di-reset!`)
      .setColor(COLORS.success)
      .setDescription(`${SEP}\nCooldown berhasil di-skip! Command siap digunakan.\n${SEP}`)
      .addFields(
        field('⚡ Command',  `\`!${cmd}\``),
        field('💸 Biaya',    money(price)+(vip?' *(VIP -50%)*':'')),
        field('💳 Saldo',    money(user.balance)),
        field('✅ Status',   '**Ready sekarang!**', false),
      )
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 13. !richinfo @user — Analisis keuangan detail
// ═══════════════════════════════════════════════════════════════
const richInfoCmd = {
  name: 'richinfo',
  aliases: ['keuangan','finance','ri'],
  description: '💰 Analisis keuangan lengkap user',
  async execute(message, args) {
    const target  = message.mentions.users.first() || message.author;
    const user    = getUser(target.id);
    const animals = user.animals||[];

    const cash = user.balance||0;
    const bank = user.bank||0;
    const zoo  = animals.reduce((s,a)=>s+(getAnimalById(a.id)?.value||0),0);
    const inv  = (user.inventory||[]).reduce((s,i)=>{
      const PRICES={fishing_rod:500,hunting_rifle:2000,lucky_charm:1500,treasure_map:800,vip_pass:8000,bait:100,energy_drink:3000,robbery_mask:2500};
      return s+Math.floor((PRICES[i.id]||0)*.5*(i.quantity||1));
    },0);
    const net = cash+bank+zoo+inv;

    const db      = loadDB();
    const allNets = Object.entries(db).map(([id,d])=>{
      const z=(d.animals||[]).reduce((s,a)=>s+(getAnimalById(a.id)?.value||0),0);
      return {id, net:(d.balance||0)+(d.bank||0)+z};
    }).sort((a,b)=>b.net-a.net);
    const rank = allNets.findIndex(e=>e.id===target.id)+1;

    const pctCash = net>0?((cash/net)*100).toFixed(1):0;
    const pctBank = net>0?((bank/net)*100).toFixed(1):0;
    const pctZoo  = net>0?((zoo/net)*100).toFixed(1):0;
    const pctInv  = net>0?((inv/net)*100).toFixed(1):0;

    const embed = new EmbedBuilder()
      .setTitle(`💰  Analisis Keuangan — ${target.username}`)
      .setColor(COLORS.gold)
      .setThumbnail(target.displayAvatarURL({dynamic:true}))
      .setDescription(`${SEP}\n💎 Net Worth: ${money(net)} • 🏆 Rank #${rank}\n${SEP}`)
      .addFields(
        field('💵 Kas',       `${money(cash)}\n\`${progressBar(cash,net,12)}\` ${pctCash}%`),
        field('🏦 Bank',      `${money(bank)}\n\`${progressBar(bank,net,12)}\` ${pctBank}%`),
        field('🦁 Zoo Value', `${money(zoo)}\n\`${progressBar(zoo,net,12)}\` ${pctZoo}%`),
        field('🎒 Inventory', `${money(inv)}\n\`${progressBar(inv,net,12)}\` ${pctInv}%`),
        field('📊 Distribusi Aset', `\`\`\`\n💵${pctCash}% 🏦${pctBank}% 🦁${pctZoo}% 🎒${pctInv}%\n\`\`\``, false),
        field('⭐ Prestige',  `**${user.prestige||0}x** ${'⭐'.repeat(Math.min(user.prestige||0,5))}`),
        field('🔥 Streak',    `**${user.dailyStreak||0}** minggu`),
        field('🎟️ Tiket Lotre',`**${user.lotteryTickets||0}**`),
      )
      .setFooter({text:'!flex untuk pamer kekayaanmu!'})
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 14. !fishsell — Jual semua ikan sekaligus
// ═══════════════════════════════════════════════════════════════
const fishSellCmd = {
  name: 'fishsell',
  aliases: ['jualan','sellfish','fs'],
  description: '🐟 Jual semua ikan di storage sekaligus',
  async execute(message) {
    const user  = getUser(message.author.id);
    const fish  = user.fishStorage || [];

    if (!fish.length) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('🐟  Storage Ikan Kosong')
        .setColor(COLORS.info)
        .setDescription(`${SEP}\nBelum ada ikan!\nGunakan \`!fish\` untuk memancing.\n${SEP}`)
        .setTimestamp()
      ]});
    }

    const total = fish.reduce((s,f)=>s+(f.value||0),0);
    user.balance = (user.balance||0)+total;
    user.fishStorage = [];
    saveUser(message.author.id, user);

    const breakdown = {};
    for (const f of fish) breakdown[f.name]=(breakdown[f.name]||0)+1;

    const embed = new EmbedBuilder()
      .setTitle('🐟  Semua Ikan Terjual!')
      .setColor(COLORS.success)
      .setDescription(`${SEP}\n`+Object.entries(breakdown).map(([n,c])=>`> ${n} ×${c}`).join('\n')+`\n${SEP}`)
      .addFields(
        field('💰 Total',     money(total)),
        field('💳 Saldo',     money(user.balance)),
        field('🐟 Terjual',   `**${fish.length}** ikan`),
      )
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 15. !hosting — Info tempat hosting bot gratis 24/7
// ═══════════════════════════════════════════════════════════════
const hostingCmd = {
  name: 'hosting',
  aliases: ['host','server','vps'],
  description: '☁️ Info rekomendasi hosting bot gratis 24/7',
  async execute(message) {
    const embed = new EmbedBuilder()
      .setTitle('☁️  Rekomendasi Hosting Bot Discord')
      .setColor(COLORS.cyan)
      .setDescription(`${SEP}\nSemua opsi di bawah bisa 24/7 gratis!\n${SEP}`)
      .addFields(
        field('📱 Termux (Android — HP kamu sendiri)',
          '> **Gratis selamanya** selama HP nyala\n' +
          '> Install dari **F-Droid** (bukan Play Store)\n' +
          '> ```\npkg install nodejs\nnpm install && npm start\n```\n' +
          '> + Install **Termux:Boot** agar auto-start\n' +
          '> ⚠️ HP harus tetap on, boros baterai',
          false),
        field('🚀 Railway.app ⭐ TERBAIK',
          '> **$5 credit/bulan** = cukup 24/7\n' +
          '> Deploy langsung dari **GitHub**\n' +
          '> Tidak perlu kartu kredit\n' +
          '> Link: `railway.app`',
          false),
        field('🌐 Render.com',
          '> **Gratis** tapi sleep 15 menit tidak aktif\n' +
          '> Fix: tambah keep-alive ping tiap 10 menit\n' +
          '> Link: `render.com`',
          false),
        field('⚡ Koyeb.com',
          '> **2 service gratis** selamanya\n' +
          '> Tidak pernah sleep, stabil\n' +
          '> Link: `koyeb.com`',
          false),
        field('☁️ Oracle Cloud Free Tier ⭐ GRATIS SELAMANYA',
          '> VPS **1 CPU + 1GB RAM ARM** gratis forever\n' +
          '> Butuh kartu kredit verifikasi (tidak ditagih)\n' +
          '> Paling stabil untuk jangka panjang\n' +
          '> Link: `cloud.oracle.com`',
          false),
        field('🔧 Cara Upload ke Railway (Paling Mudah)',
          '> 1. Upload bot ke **GitHub** (github.com)\n' +
          '> 2. Daftar Railway → **New Project**\n' +
          '> 3. Connect GitHub → pilih repo\n' +
          '> 4. Add variable: `TOKEN = token_botmu`\n' +
          '> 5. Deploy → bot online 24/7! ✅',
          false),
      )
      .setFooter({text:'Gunakan Railway untuk pemula • Oracle untuk jangka panjang'})
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// Export semua 15 command
// ═══════════════════════════════════════════════════════════════
module.exports = [
  investCmd,    // 1  !invest
  rouletteCmd,  // 2  !roulette
  bountyCmd,    // 3  !bounty
  weeklyCmd,    // 4  !weekly
  flip1v1Cmd,   // 5  !flip1v1
  jackpotCmd,   // 6  !jackpot
  mineSellCmd,  // 7  !minesell
  bankRobCmd,   // 8  !bankrob
  topweekCmd,   // 9  !topweek
  itemInfoCmd,  // 10 !iteminfo
  flexCmd,      // 11 !flex
  coolResetCmd, // 12 !coolreset
  richInfoCmd,  // 13 !richinfo
  fishSellCmd,  // 14 !fishsell
  hostingCmd,   // 15 !hosting
];
