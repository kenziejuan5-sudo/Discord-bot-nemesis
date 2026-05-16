// commands/extra2.js — 15 Command Baru Batch 2
// 1.  !farm       — Bertani hasil panen (cd 5 detik)
// 2.  !arena      — PvP arena taruhan vs random user
// 3.  !craft      — Crafting item dari bahan
// 4.  !fortune    — Ramalan nasib harian + bonus
// 5.  !auction    — Lelang hewan ke server
// 6.  !bank info  — Info detail rekening bank
// 7.  !payloan    — Bayar hutang / pinjaman
// 8.  !loan       — Pinjam uang dari bank (bayar bunga)
// 9.  !trivia     — Trivia berhadiah uang
// 10. !weather    — Cuaca hari ini (buff/debuff random)
// 11. !salary     — Gaji pasif otomatis (VIP)
// 12. !casino info— Info semua game & odds
// 13. !compare    — Bandingkan kekayaan dua user
// 14. !zoovalue   — Hitung nilai total zoo
// 15. !help2      — Help page 2 (semua command baru)

const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser, loadDB, isVip, isAdmin } = require('../utils/database');
const { getAnimalById, ANIMALS } = require('../utils/animals');
const { randCD, checkCD, fmtRemaining } = require('../utils/cooldown');
const { COLORS, SEP, progressBar, RARITY } = require('../utils/embed');

const OWNER_ID = '1213365471693246504';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const money = n => `**$${Number(n||0).toLocaleString()}**`;
const field = (name, value, inline = true) => ({ name, value, inline });

// ═══════════════════════════════════════════════════════════════
// 1. !farm — Bertani, panen hasil, jual ke pasar
// ═══════════════════════════════════════════════════════════════
const CROPS = [
  { id:'wheat',    name:'🌾 Gandum',       value:300,   rarity:'Common',    chance:35 },
  { id:'carrot',   name:'🥕 Wortel',       value:500,   rarity:'Common',    chance:25 },
  { id:'tomato',   name:'🍅 Tomat',        value:800,   rarity:'Uncommon',  chance:18 },
  { id:'corn',     name:'🌽 Jagung',       value:1200,  rarity:'Uncommon',  chance:12 },
  { id:'mushroom', name:'🍄 Jamur Ajaib',  value:3000,  rarity:'Rare',      chance:6  },
  { id:'truffle',  name:'🖤 Truffle',      value:8000,  rarity:'Epic',      chance:3  },
  { id:'golden',   name:'🌟 Gandum Emas',  value:25000, rarity:'Legendary', chance:1  },
];

const FARM_COLORS = { Common:'#95a5a6', Uncommon:'#2ecc71', Rare:'#3498db', Epic:'#9b59b6', Legendary:'#f1c40f' };

function pickCrop() {
  const r = Math.random() * 100;
  let acc = 0;
  for (const c of CROPS) { acc += c.chance; if (r < acc) return c; }
  return CROPS[0];
}

const farmCmd = {
  name: 'farm',
  aliases: ['bertani','panen','ladang'],
  description: '🌾 Bertani dan panen hasil ladang! (cd 5 detik)',
  async execute(message) {
    const user    = getUser(message.author.id);
    const savedCD = randCD();
    const { onCD, remaining, resetAt } = checkCD(user.lastFarm, savedCD);

    if (onCD) return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('🌾  Ladang Belum Siap Panen')
      .setColor(COLORS.error)
      .setDescription(`> Tanaman masih tumbuh...\n> Panen lagi ${fmtRemaining(remaining)}`)
      .setTimestamp()
    ]});

    const farmMsg = await message.reply({ embeds: [new EmbedBuilder()
      .setTitle('🌾  Sedang Bertani...')
      .setColor(COLORS.success)
      .setDescription('```\n🌱 Menanam benih...\n💧 Menyiram tanaman...\n🌞 Menunggu panen...\n```')
      .setTimestamp()
    ]});
    await sleep(1500);

    const vip   = isVip(message.author.id) || message.author.id === OWNER_ID;
    const crop  = vip && Math.random() < 0.15 ? CROPS[Math.floor(Math.random()*3)+2] : pickCrop();
    const qty   = Math.floor(Math.random() * 3) + 1;
    const total = crop.value * qty * (vip ? 1.2 : 1);

    user.balance   = (user.balance||0) + total;
    user.lastFarm  = Date.now();
    if (!user.farmStats) user.farmStats = { harvests:0, total:0 };
    user.farmStats.harvests++;
    user.farmStats.total += total;
    saveUser(message.author.id, user);

    await farmMsg.edit({ embeds: [new EmbedBuilder()
      .setTitle(`🌾  Panen ${crop.name}!`)
      .setColor(FARM_COLORS[crop.rarity] || '#2ecc71')
      .setDescription(`${SEP}\n> Ladangmu menghasilkan panen berlimpah!\n${SEP}`)
      .addFields(
        field('🌱 Tanaman',    `**${crop.name}**`),
        field('⭐ Rarity',     `**${crop.rarity}**`),
        field('📦 Jumlah',     `**×${qty}**`),
        field('💰 Per Item',   money(crop.value)),
        field('💰 Total',      money(total)),
        field('💳 Saldo',      money(user.balance)),
        field('🌾 Total Panen', `${user.farmStats.harvests}x`, false),
      )
      .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
      .setFooter({text: vip ? '👑 VIP: +20% nilai panen!' : 'VIP dapat +20% hasil panen'})
      .setTimestamp()
    ]});
  },
};

// ═══════════════════════════════════════════════════════════════
// 2. !arena — PvP taruhan vs user lain (dice battle)
// ═══════════════════════════════════════════════════════════════
const ACTIVE_ARENA = new Map();

const arenaCmd = {
  name: 'arena',
  aliases: ['pvp','battle','laga'],
  description: '⚔️ Tantang user di arena PvP! (taruhan)',
  async execute(message, args) {
    const target = message.mentions.users.first();
    const bet    = parseInt(args[1]) || 0;

    if (!target || bet < 100) return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('⚔️  Arena PvP')
      .setColor(COLORS.error)
      .setDescription(`${SEP}\nFormat: \`!arena @user <taruhan>\`\nMinimal taruhan: **$100**\n${SEP}`)
      .setTimestamp()
    ]});

    if (target.id === message.author.id) return message.reply('❌ Tidak bisa lawan diri sendiri!');
    if (target.bot) return message.reply('❌ Tidak bisa lawan bot!');
    if (ACTIVE_ARENA.has(message.author.id)) return message.reply('⚠️ Kamu sudah dalam arena!');

    const challenger = getUser(message.author.id);
    const opponent   = getUser(target.id);
    if ((challenger.balance||0) < bet) return message.reply(`❌ Saldo kamu hanya ${money(challenger.balance)}!`);
    if ((opponent.balance||0) < bet)   return message.reply(`❌ ${target.username} hanya punya ${money(opponent.balance)}!`);

    ACTIVE_ARENA.set(message.author.id, true);

    const embed = new EmbedBuilder()
      .setTitle('⚔️  TANTANGAN ARENA!')
      .setColor(COLORS.error)
      .setImage('https://media.giphy.com/media/3oEjI6iBCLz1JSSMNq/giphy.gif')
      .setDescription(`${SEP}\n${message.author} menantang ${target} ke arena!\n💰 Taruhan: ${money(bet)}\n${SEP}\n\n${target}, ketik \`!accept\` dalam **60 detik**!`)
      .setTimestamp();
    const arenaMsg = await message.channel.send({ embeds: [embed] });

    const col = message.channel.createMessageCollector({
      filter: m => m.author.id === target.id && m.content.toLowerCase() === '!accept',
      time: 60000, max: 1,
    });

    col.on('collect', async () => {
      ACTIVE_ARENA.delete(message.author.id);

      // Battle: 3 ronde, setiap ronde roll d20 + bonus prestige
      const pA = getUser(message.author.id);
      const pB = getUser(target.id);
      const pBonus = (pA.prestige||0) * 2;
      const oBonus = (pB.prestige||0) * 2;

      let scoreA = 0, scoreB = 0;
      const rounds = [];
      for (let i = 1; i <= 3; i++) {
        const rA = Math.floor(Math.random()*20)+1 + pBonus;
        const rB = Math.floor(Math.random()*20)+1 + oBonus;
        if (rA > rB) scoreA++;
        else if (rB > rA) scoreB++;
        rounds.push(`Ronde ${i}: **${message.author.username}** ${rA} vs ${rB} **${target.username}** ${rA>rB?'✅':rB>rA?'❌':'🟡'}`);
      }

      const winner = scoreA > scoreB ? message.author : scoreA < scoreB ? target : null;
      const loser  = winner ? (winner.id === message.author.id ? target : message.author) : null;

      if (winner) {
        const wu = getUser(winner.id); wu.balance = (wu.balance||0) + bet; saveUser(winner.id, wu);
        const lu = getUser(loser.id);  lu.balance = Math.max(0,(lu.balance||0)-bet); saveUser(loser.id, lu);
      }

      await arenaMsg.edit({ embeds: [new EmbedBuilder()
        .setTitle(winner ? `⚔️  ${winner.username} MENANG ARENA!` : '⚔️  SERI!')
        .setColor(winner ? COLORS.gold : COLORS.warning)
        .setDescription(`${SEP}\n${rounds.join('\n')}\n${SEP}`)
        .addFields(
          field('🏆 Pemenang',  winner ? `${winner}` : 'Seri!'),
          field('💰 Hadiah',    winner ? money(bet) : money(0)),
          field('📊 Skor',      `${scoreA} - ${scoreB}`),
        )
        .setThumbnail(winner?.displayAvatarURL({dynamic:true}) || null)
        .setTimestamp()
      ]});
    });

    col.on('end', c => {
      ACTIVE_ARENA.delete(message.author.id);
      if (!c.size) arenaMsg.edit({ embeds: [new EmbedBuilder()
        .setTitle('⏱️  Tantangan Kedaluwarsa').setColor(COLORS.dark)
        .setDescription(`${target.username} tidak merespons.`).setTimestamp()
      ]});
    });
  },
};

// ═══════════════════════════════════════════════════════════════
// 3. !fortune — Ramalan nasib + bonus/debuff random harian
// ═══════════════════════════════════════════════════════════════
const FORTUNES = [
  { text:'✨ Bintangmu bersinar! Semua usaha membawa hasil berlipat ganda.',  mult:2.0,  type:'bonus',  emoji:'🌟' },
  { text:'🍀 Hari keberuntunganmu! Setiap langkah membawa rezeki.',           mult:1.5,  type:'bonus',  emoji:'🍀' },
  { text:'☀️ Hari yang cerah! Energi positif mengalir deras.',                mult:1.3,  type:'bonus',  emoji:'☀️' },
  { text:'🌧️ Mendung menyelimuti... Berhati-hatilah hari ini.',              mult:0.8,  type:'debuff', emoji:'🌧️' },
  { text:'⚡ Petir menyambar! Nasibmu sedang tidak berpihak.',                mult:0.5,  type:'debuff', emoji:'⚡' },
  { text:'😐 Hari biasa. Tidak ada yang spesial.',                            mult:1.0,  type:'normal', emoji:'😐' },
  { text:'🌈 Pelangi setelah hujan! Hal baik menunggu di akhir hari.',        mult:1.7,  type:'bonus',  emoji:'🌈' },
  { text:'🔮 Misteri menyelimuti takdirmu... Sesuatu besar akan terjadi!',    mult:3.0,  type:'jackpot',emoji:'🔮' },
];

const fortuneCmd = {
  name: 'fortune',
  aliases: ['ramalan','nasib','zodiak'],
  description: '🔮 Cek ramalan nasib + bonus/debuff hari ini',
  async execute(message) {
    const user = getUser(message.author.id);
    const CD   = 24 * 60 * 60 * 1000; // 24 jam khusus fortune
    const { onCD, remaining, resetAt } = checkCD(user.lastFortune, CD);

    if (onCD) return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('🔮  Ramalan Sudah Dibaca Hari Ini')
      .setColor(COLORS.purple)
      .setDescription(`> Baca ramalan baru ${fmtRemaining(remaining)} lagi\n> <t:${Math.floor(resetAt/1000)}:R>`)
      .setTimestamp()
    ]});

    const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    const base    = Math.floor(Math.random() * 2000) + 500;
    const reward  = Math.floor(base * fortune.mult);
    const change  = reward - base;

    user.balance     = Math.max(0, (user.balance||0) + change);
    user.lastFortune = Date.now();
    user.fortuneBuff = { mult: fortune.mult, until: Date.now() + CD };
    saveUser(message.author.id, user);

    const typeColor = fortune.type === 'bonus' || fortune.type === 'jackpot' ? COLORS.gold
                    : fortune.type === 'debuff' ? COLORS.error : COLORS.info;

    const embed = new EmbedBuilder()
      .setTitle(`${fortune.emoji}  Ramalan Nasibmu Hari Ini`)
      .setColor(typeColor)
      .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
      .setDescription(`${SEP}\n*"${fortune.text}"*\n${SEP}`)
      .addFields(
        field('🎭 Tipe',        `**${fortune.type.toUpperCase()}**`),
        field('✨ Multiplier',  `**${fortune.mult}x**`),
        field(change >= 0 ? '💰 Bonus' : '💸 Debuff', money(Math.abs(change))),
        field('💳 Saldo',       money(user.balance)),
        field('⏳ Reset',       `<t:${Math.floor((user.lastFortune+CD)/1000)}:R>`, false),
      )
      .setFooter({text:'Ramalan memengaruhi semua earning hari ini!'})
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 4. !loan — Pinjam uang dari bank (bayar bunga)
// ═══════════════════════════════════════════════════════════════
const MAX_LOAN = 50000;
const INTEREST = 0.15; // 15% bunga

const loanCmd = {
  name: 'loan',
  aliases: ['hutang','pinjam','kredit'],
  description: '🏦 Pinjam uang dari bank (bunga 15%)',
  async execute(message, args) {
    const user = getUser(message.author.id);
    const sub  = args[0]?.toLowerCase();

    // Lihat status hutang
    if (!sub || sub === 'info' || sub === 'status') {
      const debt = user.loan || 0;
      const embed = new EmbedBuilder()
        .setTitle('🏦  Info Pinjaman')
        .setColor(debt > 0 ? COLORS.error : COLORS.success)
        .setDescription(`${SEP}\n${debt > 0 ? `⚠️ Kamu punya hutang **${money(debt)}**!` : '✅ Tidak ada hutang.'}\n${SEP}`)
        .addFields(
          field('💸 Hutang',     money(debt)),
          field('📊 Bunga',      `**${INTEREST*100}%**`),
          field('💰 Maks Pinjam',money(MAX_LOAN)),
          field('💡 Cara Bayar', '`!payloan <jumlah>` atau `!payloan all`', false),
          field('💡 Cara Pinjam','`!loan <jumlah>`', false),
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const amount = parseInt(args[0]);
    if (!amount || amount < 100) return message.reply('❌ Minimal pinjaman **$100**!');

    const currentLoan = user.loan || 0;
    if (currentLoan > 0) return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('❌  Masih Ada Hutang!')
      .setColor(COLORS.error)
      .setDescription(`Bayar hutang dulu! Kamu masih punya hutang ${money(currentLoan)}.\n\`!payloan all\` untuk bayar semua.`)
      .setTimestamp()
    ]});

    if (amount > MAX_LOAN) return message.reply(`❌ Maksimal pinjaman **${money(MAX_LOAN)}**!`);

    const totalOwed = Math.floor(amount * (1 + INTEREST));
    user.balance    = (user.balance||0) + amount;
    user.loan       = totalOwed;
    saveUser(message.author.id, user);

    const embed = new EmbedBuilder()
      .setTitle('🏦  Pinjaman Disetujui!')
      .setColor(COLORS.success)
      .setDescription(`${SEP}\nBank menyetujui pinjaman kamu!\n${SEP}`)
      .addFields(
        field('💵 Dipinjam',     money(amount)),
        field('💸 Total Bayar',  money(totalOwed)),
        field('📊 Bunga',        `**${INTEREST*100}%** = ${money(totalOwed-amount)}`),
        field('💳 Saldo Baru',   money(user.balance)),
        field('⚠️ Bayar Hutang', '`!payloan <jumlah>` kapan saja', false),
      )
      .setFooter({text:'Bayar hutang sebelum pinjam lagi!'})
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 5. !payloan — Bayar hutang
// ═══════════════════════════════════════════════════════════════
const payLoanCmd = {
  name: 'payloan',
  aliases: ['bayarhutang','lunasi','pl'],
  description: '💸 Bayar hutang pinjaman',
  async execute(message, args) {
    const user = getUser(message.author.id);
    const debt = user.loan || 0;

    if (debt === 0) return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('✅  Tidak Ada Hutang')
      .setColor(COLORS.success)
      .setDescription('Kamu tidak punya hutang apapun! 🎉')
      .setTimestamp()
    ]});

    const raw    = args[0]?.toLowerCase();
    const amount = raw === 'all' ? Math.min(debt, user.balance||0) : parseInt(raw);
    if (!amount || amount <= 0) return message.reply(`Hutangmu: ${money(debt)}\nFormat: \`!payloan <jumlah>\` atau \`!payloan all\``);
    if ((user.balance||0) < amount) return message.reply(`❌ Saldo kamu hanya ${money(user.balance)}!`);

    const paid      = Math.min(amount, debt);
    user.balance    = (user.balance||0) - paid;
    user.loan       = Math.max(0, debt - paid);
    saveUser(message.author.id, user);

    const paid_off = user.loan === 0;
    const embed = new EmbedBuilder()
      .setTitle(paid_off ? '✅  Hutang Lunas!' : '💸  Pembayaran Hutang')
      .setColor(paid_off ? COLORS.success : COLORS.warning)
      .setDescription(paid_off ? `${SEP}\n🎉 Semua hutang telah lunas!\n${SEP}` : `${SEP}\nPembayaran berhasil.\n${SEP}`)
      .addFields(
        field('💸 Dibayar',    money(paid)),
        field('💰 Sisa Hutang',money(user.loan)),
        field('💳 Saldo',      money(user.balance)),
      )
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 6. !trivia — Trivia berhadiah uang
// ═══════════════════════════════════════════════════════════════
const TRIVIA_QS = [
  { q:'Berapa sisi pada sebuah segitiga?',          a:['3'],              reward:500  },
  { q:'Apa ibu kota Indonesia?',                     a:['jakarta'],        reward:500  },
  { q:'Apa hasil dari 15 × 8?',                      a:['120'],            reward:800  },
  { q:'Berapa planet di tata surya?',                a:['8'],              reward:600  },
  { q:'Apa gas yang kita hirup untuk bernapas?',     a:['oksigen','o2'],   reward:700  },
  { q:'Siapa penemu telepon?',                        a:['bell','graham'],  reward:1000 },
  { q:'Apa warna campuran merah dan biru?',          a:['ungu','purple'],  reward:500  },
  { q:'Berapa hari dalam seminggu?',                  a:['7'],              reward:300  },
  { q:'Apa nama satelit alami Bumi?',                a:['bulan','moon'],   reward:500  },
  { q:'Apa mata uang Jepang?',                       a:['yen'],            reward:600  },
  { q:'Berapa sudut dalam segitiga siku-siku?',      a:['90'],             reward:800  },
  { q:'Planet terbesar di tata surya?',              a:['jupiter'],        reward:700  },
  { q:'Berapa huruf dalam alfabet Indonesia?',       a:['26'],             reward:500  },
  { q:'Apa bahasa pemrograman yang dibuat oleh Guido van Rossum?', a:['python'], reward:1200 },
  { q:'Apa kepanjangan dari CPU?',                   a:['central processing unit'], reward:1000 },
];

const ACTIVE_TRIVIA = new Set();

const triviaCmd = {
  name: 'trivia',
  aliases: ['kuis','quiz','tanya'],
  description: '❓ Jawab trivia dan menangkan uang! (cd 5 detik)',
  async execute(message) {
    const user    = getUser(message.author.id);
    const savedCD = randCD();
    const { onCD, remaining } = checkCD(user.lastTrivia, savedCD);
    if (onCD) return message.reply(`⏳ Cooldown: ${fmtRemaining(remaining)}`);
    if (ACTIVE_TRIVIA.has(message.author.id)) return message.reply('⚠️ Kamu sudah ada pertanyaan aktif!');

    const q   = TRIVIA_QS[Math.floor(Math.random() * TRIVIA_QS.length)];
    const vip = isVip(message.author.id) || message.author.id === OWNER_ID;
    const reward = vip ? Math.floor(q.reward * 1.3) : q.reward;

    ACTIVE_TRIVIA.add(message.author.id);
    user.lastTrivia = Date.now();
    saveUser(message.author.id, user);

    const embed = new EmbedBuilder()
      .setTitle('❓  TRIVIA — Jawab Sekarang!')
      .setColor(COLORS.cyan)
      .setDescription(`${SEP}\n**${q.q}**\n${SEP}\n\n⏰ Jawab dalam **30 detik**!\n💰 Hadiah: ${money(reward)}`)
      .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
      .setTimestamp();
    message.channel.send({ embeds: [embed] });

    const col = message.channel.createMessageCollector({
      filter: m => m.author.id === message.author.id,
      time: 30000, max: 1,
    });

    col.on('collect', async m => {
      ACTIVE_TRIVIA.delete(message.author.id);
      const ans = m.content.toLowerCase().trim();
      const correct = q.a.some(a => ans.includes(a));

      if (correct) {
        const u = getUser(message.author.id);
        u.balance = (u.balance||0) + reward;
        saveUser(message.author.id, u);
        message.channel.send({ embeds: [new EmbedBuilder()
          .setTitle('✅  BENAR!')
          .setColor(COLORS.success)
          .setDescription(`${SEP}\n🎉 Jawaban benar!\n${SEP}`)
          .addFields(
            field('💡 Jawaban', q.a[0].toUpperCase()),
            field('💰 Reward',  money(reward)),
            field('💳 Saldo',   money(u.balance)),
          ).setTimestamp()
        ]});
      } else {
        message.channel.send({ embeds: [new EmbedBuilder()
          .setTitle('❌  SALAH!')
          .setColor(COLORS.error)
          .setDescription(`${SEP}\n> Jawaban benar: **${q.a[0]}**\n${SEP}`)
          .setTimestamp()
        ]});
      }
    });

    col.on('end', c => {
      ACTIVE_TRIVIA.delete(message.author.id);
      if (!c.size) message.channel.send({ embeds: [new EmbedBuilder()
        .setTitle('⏱️  Waktu Habis!')
        .setColor(COLORS.dark)
        .setDescription(`> Jawaban: **${q.a[0]}**`)
        .setTimestamp()
      ]});
    });
  },
};

// ═══════════════════════════════════════════════════════════════
// 7. !weather — Cuaca hari ini (buff/debuff untuk semua command)
// ═══════════════════════════════════════════════════════════════
const WEATHERS = [
  { name:'☀️ Cerah',        desc:'Hari sempurna untuk beraktivitas!',         buff:'+15% semua reward',  mult:1.15, color:COLORS.gold   },
  { name:'🌧️ Hujan Lebat',  desc:'Lebih baik di rumah saja...',               buff:'-10% semua reward',  mult:0.90, color:COLORS.info   },
  { name:'⛈️ Badai',        desc:'Berbahaya keluar rumah!',                   buff:'-25% semua reward',  mult:0.75, color:COLORS.dark   },
  { name:'🌈 Setelah Hujan', desc:'Rejeki datang setelah kesabaran!',          buff:'+30% semua reward',  mult:1.30, color:COLORS.purple },
  { name:'🌪️ Tornado',      desc:'Semua kacau! Hati-hati...',                 buff:'-20% semua reward',  mult:0.80, color:COLORS.error  },
  { name:'❄️ Salju',         desc:'Dingin tapi membawa keberuntungan!',        buff:'+20% semua reward',  mult:1.20, color:COLORS.cyan   },
  { name:'🌫️ Berkabut',     desc:'Tidak jelas apa yang akan terjadi...',      buff:'Normal',             mult:1.00, color:COLORS.dark   },
  { name:'🌟 Langit Cerah',  desc:'Hari paling beruntung tahun ini!',          buff:'+50% semua reward',  mult:1.50, color:COLORS.gold   },
];

const weatherCmd = {
  name: 'weather',
  aliases: ['cuaca','iklim','wf'],
  description: '🌤️ Cek cuaca hari ini (buff/debuff aktif)',
  async execute(message) {
    // Cuaca berganti setiap 6 jam berdasarkan timestamp
    const slot = Math.floor(Date.now() / (6 * 3600 * 1000));
    const w    = WEATHERS[slot % WEATHERS.length];
    const resetAt = (slot + 1) * 6 * 3600 * 1000;

    const embed = new EmbedBuilder()
      .setTitle(`${w.name}  —  Cuaca Hari Ini`)
      .setColor(w.color)
      .setDescription(`${SEP}\n*${w.desc}*\n${SEP}`)
      .addFields(
        field('🎯 Efek Aktif',   `**${w.buff}**`, false),
        field('⏳ Berubah',      `<t:${Math.floor(resetAt/1000)}:R>`),
        field('📅 Waktu Reset',  `<t:${Math.floor(resetAt/1000)}:T>`),
      )
      .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
      .setFooter({text:'Cuaca berganti setiap 6 jam'})
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 8. !salary — Klaim gaji pasif otomatis (VIP)
// ═══════════════════════════════════════════════════════════════
const salaryCmd = {
  name: 'salary',
  aliases: ['gaji','gajian','upah'],
  description: '💼 Klaim gaji pasif! VIP dapat lebih besar (cd 5 detik)',
  async execute(message) {
    const user    = getUser(message.author.id);
    const savedCD = randCD();
    const { onCD, remaining } = checkCD(user.lastSalary, savedCD);
    if (onCD) return message.reply(`⏳ Cooldown gaji: ${fmtRemaining(remaining)}`);

    const vip       = isVip(message.author.id) || message.author.id === OWNER_ID;
    const prestige  = user.prestige || 0;
    const base      = vip ? 3000 : 500;
    const pBonus    = prestige * 200;
    const total     = base + pBonus + Math.floor(Math.random()*500);

    user.balance    = (user.balance||0) + total;
    user.lastSalary = Date.now();
    saveUser(message.author.id, user);

    const embed = new EmbedBuilder()
      .setTitle('💼  Gaji Diterima!')
      .setColor(vip ? COLORS.gold : COLORS.success)
      .setDescription(`${SEP}\n💰 Gaji pasifmu telah cair!\n${SEP}`)
      .addFields(
        field('💵 Gaji Dasar',    money(base)),
        field('⭐ Bonus Prestige', money(pBonus)),
        field('💰 Total',         money(total)),
        field('💳 Saldo Baru',    money(user.balance)),
      )
      .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
      .setFooter({text: vip ? '👑 VIP: Gaji 6x lebih besar!' : 'VIP mendapat gaji 3000/klaim'})
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 9. !casino — Info lengkap semua game & odds
// ═══════════════════════════════════════════════════════════════
const casinoCmd = {
  name: 'casino',
  aliases: ['games','gameinfo','casino-info'],
  description: '🎰 Info semua game casino & odds',
  async execute(message) {
    const vip = isVip(message.author.id) || message.author.id === OWNER_ID;

    const embed = new EmbedBuilder()
      .setTitle('🎰  Casino — Info Semua Game')
      .setColor(COLORS.dark)
      .setDescription(`${SEP}\n${vip?'👑 **VIP Aktif** — Semua odds lebih baik!\n':''}${SEP}`)
      .addFields(
        field('🎰 !slots <jml>',
          `Jackpot: 7️⃣7️⃣7️⃣ = **50x**\n💎💎💎 = **20x** • ⭐⭐⭐ = **10x**\n${vip?'VIP: taruhan +20%':''}`, false),
        field('🃏 !blackjack <jml>',
          `Menang = **2x** • Blackjack = **2.5x**\nInteraktif tombol HIT/STAND\n${vip?'VIP: Early win detection':''}`, false),
        field('🪙 !coinflip <jml> [h/t]',
          `Menang = **2x** • Win rate: ${vip?'52%':'48%'}\nPilih heads/tails untuk lebih fair`, false),
        field('🏁 !race <jml> <1-4>',
          `Motor=**2.5x** • F1=**2x** • Offroad=**3x** • Rocket=**4x**\n${vip?'VIP: Speed boost kendaraan':''}`, false),
        field('🎡 !roulette <jml> <warna>',
          `Merah/Hitam=**2x** • Hijau=**14x**\nGanjil/Genap=**2x**`, false),
        field('📈 !invest <jml> <saham>',
          `Tech: 1.1x-3x • Crypto: 0.1x-5x\nFood: 0.7x-2x • Energy: 0.6x-2.5x`, false),
        field('🎫 !scratch',
          `💎💎💎 = **$50,000** jackpot!\n${vip?'VIP: +20% semua hadiah':''}`, false),
        field('🎡 !spin',
          `Roda gratis! Bisa dapat uang atau reset daily\n${vip?'VIP: Peluang hadiah lebih besar':''}`, false),
      )
      .setFooter({text:'Semua game cooldown 5 detik!'})
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 10. !compare @user1 @user2 — Bandingkan kekayaan 2 user
// ═══════════════════════════════════════════════════════════════
const compareCmd = {
  name: 'compare',
  aliases: ['vs','banding','versus'],
  description: '⚖️ Bandingkan kekayaan dua user',
  async execute(message, args) {
    const u1 = message.mentions.users.first();
    const u2 = message.mentions.users.at(1) || message.author;

    if (!u1) return message.reply('Format: `!compare @user1 [@user2]`');

    const d1 = getUser(u1.id);
    const d2 = getUser(u2.id);

    const net1 = (d1.balance||0)+(d1.bank||0)+(d1.animals||[]).reduce((s,a)=>s+(getAnimalById(a.id)?.value||0),0);
    const net2 = (d2.balance||0)+(d2.bank||0)+(d2.animals||[]).reduce((s,a)=>s+(getAnimalById(a.id)?.value||0),0);
    const maxNet = Math.max(net1, net2) || 1;

    const bar1 = progressBar(net1, maxNet, 12);
    const bar2 = progressBar(net2, maxNet, 12);

    const winner = net1 > net2 ? u1 : net2 > net1 ? u2 : null;
    const diff   = Math.abs(net1 - net2);

    const embed = new EmbedBuilder()
      .setTitle(`⚖️  ${u1.username} vs ${u2.username}`)
      .setColor(COLORS.purple)
      .setDescription(`${SEP}`)
      .addFields(
        field(`${u1.username}`,
          `\`${bar1}\`\n💵 ${money(d1.balance||0)} 🏦 ${money(d1.bank||0)}\n🦁 Zoo: ${money((d1.animals||[]).reduce((s,a)=>s+(getAnimalById(a.id)?.value||0),0))}\n💎 **Net: ${money(net1)}**`, false),
        field(`${u2.username}`,
          `\`${bar2}\`\n💵 ${money(d2.balance||0)} 🏦 ${money(d2.bank||0)}\n🦁 Zoo: ${money((d2.animals||[]).reduce((s,a)=>s+(getAnimalById(a.id)?.value||0),0))}\n💎 **Net: ${money(net2)}**`, false),
        field('🏆 Lebih Kaya',  winner ? `**${winner.username}**` : '**Sama!**'),
        field('💰 Selisih',     money(diff)),
        field('📊 Rasio',       net2>0 ? `**${(net1/net2*100).toFixed(1)}%** vs **100%**` : 'N/A'),
      )
      .setThumbnail(u1.displayAvatarURL({dynamic:true}))
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 11. !zoovalue [@user] — Hitung nilai total zoo lengkap
// ═══════════════════════════════════════════════════════════════
const zooValueCmd = {
  name: 'zoovalue',
  aliases: ['zooval','nilaizoo','zv'],
  description: '🦁 Hitung nilai total zoo kamu',
  async execute(message, args) {
    const target  = message.mentions.users.first() || message.author;
    const user    = getUser(target.id);
    const animals = user.animals || [];

    if (!animals.length) return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('🦁  Zoo Kosong').setColor(COLORS.dark)
      .setDescription('Belum ada hewan! Gunakan `!hunt` untuk berburu.')
      .setTimestamp()
    ]});

    // Hitung per rarity
    const byRarity = {};
    const byAnimal = {};
    for (const a of animals) {
      const info = getAnimalById(a.id);
      if (!info) continue;
      byRarity[info.rarity] = (byRarity[info.rarity]||0) + info.value;
      if (!byAnimal[a.id]) byAnimal[a.id] = { info, count:0, total:0 };
      byAnimal[a.id].count++;
      byAnimal[a.id].total += info.value;
    }

    const total   = Object.values(byAnimal).reduce((s,v)=>s+v.total,0);
    const topAnim = Object.values(byAnimal).sort((a,b)=>b.total-a.total)[0];
    const RORDER  = ['Legendary','Epic','Rare','Uncommon','Common'];
    const RE      = {Legendary:'🔴',Epic:'🟣',Rare:'🔵',Uncommon:'🟢',Common:'⚪'};

    const embed = new EmbedBuilder()
      .setTitle(`🦁  Nilai Zoo — ${target.username}`)
      .setColor(COLORS.gold)
      .setThumbnail(target.displayAvatarURL({dynamic:true}))
      .setDescription(`${SEP}\n💰 Total Nilai Zoo: ${money(total)}\n📦 Total Hewan: **${animals.length}**\n${SEP}`)
      .addFields(
        ...RORDER.filter(r=>byRarity[r]).map(r=>field(
          `${RE[r]} ${r}`, money(byRarity[r])
        )),
        field('🏆 Hewan Paling Berharga',
          topAnim ? `${topAnim.info.emoji} **${topAnim.info.name}** ×${topAnim.count} = ${money(topAnim.total)}` : 'N/A',
          false),
      )
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 12. !auction @user — Lelang hewan ke server
// ═══════════════════════════════════════════════════════════════
const auctionCmd = {
  name: 'auction',
  aliases: ['lelang','bid','auction'],
  description: '🔨 Lelang hewanmu ke server! (cd 5 detik)',
  async execute(message, args) {
    const sub = args[0]?.toLowerCase();
    const db  = loadDB();
    if (!db.__auctions__) db.__auctions__ = [];

    if (!sub || sub === 'list') {
      const active = db.__auctions__.filter(a=>a.active);
      const embed  = new EmbedBuilder()
        .setTitle('🔨  Lelang Aktif')
        .setColor(COLORS.gold)
        .setDescription(active.length
          ? `${SEP}\n`+active.map((a,i)=>{
              const ani = getAnimalById(a.animalId);
              return `**${i+1}.** ${ani?.emoji||'❓'} **${ani?.name||a.animalId}**\n  💰 Bid tertinggi: ${money(a.topBid)} (<@${a.topBidder||'Belum ada'}>)\n  ⏳ <t:${Math.floor(a.endsAt/1000)}:R> • \`!auction bid ${a.id} <jml>\``;
            }).join('\n\n')
          : `${SEP}\nBelum ada lelang aktif!\nMulai: \`!auction start <animal_id> <harga_awal>\``)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (sub === 'start') {
      const animalId = args[1]?.toLowerCase();
      const startBid = parseInt(args[2]) || 100;
      const user     = getUser(message.author.id);
      const animal   = getAnimalById(animalId);
      if (!animal) return message.reply('❌ Hewan tidak ditemukan!');
      const idx = (user.animals||[]).findIndex(a=>a.id===animalId);
      if (idx===-1) return message.reply(`❌ Kamu tidak punya **${animal.name}**!`);

      user.animals.splice(idx,1);
      saveUser(message.author.id, user);

      const auctionId = `auc_${Date.now()}`;
      db.__auctions__.push({
        id:auctionId, animalId, sellerId:message.author.id,
        startBid, topBid:startBid, topBidder:null,
        active:true, endsAt: Date.now()+5*60*1000, // 5 menit
      });
      require('../utils/database').saveDB(db);

      message.channel.send({ embeds: [new EmbedBuilder()
        .setTitle(`🔨  Lelang Dimulai: ${animal.emoji} ${animal.name}!`)
        .setColor(COLORS.gold)
        .setImage(animal.image)
        .setDescription(`${SEP}\nLelang dimulai! Bid tertinggi menang dalam **5 menit**!\n${SEP}`)
        .addFields(
          field('🦁 Hewan',      `${animal.emoji} **${animal.name}**`),
          field('⭐ Rarity',     `**${animal.rarity}**`),
          field('💰 Bid Awal',   money(startBid)),
          field('🔑 ID',         `\`${auctionId}\``, false),
          field('📢 Cara Bid',   `\`!auction bid ${auctionId} <jumlah>\``, false),
        ).setTimestamp()
      ]});

      // Auto-end setelah 5 menit
      setTimeout(async () => {
        const freshDB  = require('../utils/database').loadDB();
        const auc = freshDB.__auctions__?.find(a=>a.id===auctionId);
        if (!auc || !auc.active) return;
        auc.active = false;

        if (auc.topBidder) {
          const winner = getUser(auc.topBidder);
          const seller = getUser(auc.sellerId);
          winner.balance = (winner.balance||0) - auc.topBid;
          if (!winner.animals) winner.animals = [];
          winner.animals.push({id:animalId, caughtAt:Date.now()});
          seller.balance = (seller.balance||0) + auc.topBid;
          saveUser(auc.topBidder, winner);
          saveUser(auc.sellerId, seller);

          message.channel.send({ embeds: [new EmbedBuilder()
            .setTitle(`🔨  Lelang Selesai — <@${auc.topBidder}> Menang!`)
            .setColor(COLORS.success)
            .setDescription(`${animal.emoji} **${animal.name}** terjual seharga ${money(auc.topBid)}!`)
            .setTimestamp()
          ]});
        } else {
          // Kembalikan hewan ke seller
          const seller = getUser(auc.sellerId);
          if (!seller.animals) seller.animals=[];
          seller.animals.push({id:animalId, caughtAt:Date.now()});
          saveUser(auc.sellerId, seller);
          message.channel.send(`❌ Lelang **${animal.name}** berakhir tanpa pemenang. Hewan dikembalikan.`);
        }

        require('../utils/database').saveDB(freshDB);
      }, 5*60*1000);
      return;
    }

    if (sub === 'bid') {
      const auctionId = args[1];
      const bidAmount = parseInt(args[2]);
      if (!auctionId||!bidAmount) return message.reply('Format: `!auction bid <auction_id> <jumlah>`');

      const freshDB = require('../utils/database').loadDB();
      const auc = freshDB.__auctions__?.find(a=>a.id===auctionId&&a.active);
      if (!auc) return message.reply('❌ Lelang tidak ditemukan atau sudah berakhir!');
      if (auc.sellerId===message.author.id) return message.reply('❌ Tidak bisa bid di lelangan sendiri!');
      if (bidAmount<=auc.topBid) return message.reply(`❌ Bid harus lebih dari ${money(auc.topBid)}!`);

      const bidder = getUser(message.author.id);
      if ((bidder.balance||0)<bidAmount) return message.reply(`❌ Saldo tidak cukup! Punya ${money(bidder.balance)}`);

      auc.topBid    = bidAmount;
      auc.topBidder = message.author.id;
      require('../utils/database').saveDB(freshDB);

      const ani = getAnimalById(auc.animalId);
      message.reply({ embeds: [new EmbedBuilder()
        .setTitle('🔨  Bid Diterima!')
        .setColor(COLORS.success)
        .setDescription(`${SEP}\nBid kamu diterima untuk **${ani?.name||auc.animalId}**!\n${SEP}`)
        .addFields(
          field('💰 Bid Kamu',   money(bidAmount)),
          field('⏳ Berakhir',   `<t:${Math.floor(auc.endsAt/1000)}:R>`),
        ).setTimestamp()
      ]});
    }
  },
};

// ═══════════════════════════════════════════════════════════════
// 13. !bankinfo — Info detail rekening bank + bunga
// ═══════════════════════════════════════════════════════════════
const bankInfoCmd = {
  name: 'bankinfo',
  aliases: ['akunbank','mybank','bankdetail'],
  description: '🏦 Info detail rekening bank kamu',
  async execute(message) {
    const user  = getUser(message.author.id);
    const vip   = isVip(message.author.id) || message.author.id === OWNER_ID;
    const cash  = user.balance || 0;
    const bank  = user.bank    || 0;
    const debt  = user.loan    || 0;
    const total = cash + bank;

    // Bunga bank (VIP 2%, normal 1% per deposit)
    const interestRate = vip ? 0.02 : 0.01;

    const embed = new EmbedBuilder()
      .setTitle('🏦  Info Rekening Bank')
      .setColor(COLORS.info)
      .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
      .setDescription(`${SEP}\n📋 Laporan keuangan lengkap:\n${SEP}`)
      .addFields(
        field('💵 Kas (Dompet)',  money(cash)),
        field('🏦 Tabungan Bank', money(bank)),
        field('💎 Total Aset',   money(total)),
        field('💸 Hutang',       debt>0 ? money(debt) : '**Tidak ada**'),
        field('📊 Bunga Simpan', `**${interestRate*100}%** per klaim${vip?' (VIP bonus)':''}`),
        field('💰 Net Cash',     money(cash - debt)),
        field('📈 Rasio Kas/Bank',total>0 ? `**${Math.round(cash/total*100)}%** / **${Math.round(bank/total*100)}%**` : 'N/A'),
        field('👑 Status',       vip ? '⭐ **VIP Member**' : '👤 Member'),
      )
      .setFooter({text:'!bank deposit untuk simpan • !loan untuk pinjam'})
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 14. !craft — Crafting item dari bahan
// ═══════════════════════════════════════════════════════════════
const RECIPES = [
  {
    id:'super_bait', name:'🎣 Super Umpan', result_desc:'Umpan 25x (lebih dari biasa)',
    ingredients:['bait','bait','bait'], result_uses:25,
    desc:'Gabung 3 umpan jadi Super Umpan 25 kali pakai'
  },
  {
    id:'mega_charm', name:'🌟 Mega Jimat', result_desc:'Jimat 30x pakai',
    ingredients:['lucky_charm','lucky_charm'], result_uses:30,
    desc:'Gabung 2 jimat jadi Mega Jimat 30 kali pakai'
  },
];

const craftCmd = {
  name: 'craft',
  aliases: ['buat','crafting','bikin'],
  description: '🔨 Crafting item dari bahan yang ada',
  async execute(message, args) {
    const user = getUser(message.author.id);

    if (!args[0] || args[0]==='list') {
      const embed = new EmbedBuilder()
        .setTitle('🔨  Crafting — Daftar Resep')
        .setColor(COLORS.purple)
        .setDescription(`${SEP}\nGunakan \`!craft <id>\` untuk membuat item\n${SEP}`)
        .addFields(RECIPES.map(r=>field(
          `\`${r.id}\` ${r.name}`,
          `📦 Bahan: \`${r.ingredients.join('` + `')}\`\n📝 ${r.desc}\n✅ Hasil: **${r.result_desc}**`,
          false
        )))
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const recipe = RECIPES.find(r=>r.id===args[0].toLowerCase());
    if (!recipe) return message.reply(`❌ Resep \`${args[0]}\` tidak ada! Ketik \`!craft list\``);

    const inv   = user.inventory || [];
    const owned = {};
    for (const i of inv) owned[i.id] = (owned[i.id]||0)+1;

    const needed = {};
    for (const ing of recipe.ingredients) needed[ing] = (needed[ing]||0)+1;

    for (const [id, qty] of Object.entries(needed)) {
      if ((owned[id]||0) < qty) return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('❌  Bahan Kurang')
        .setColor(COLORS.error)
        .setDescription(`Butuh \`${id}\` ×${qty}, kamu punya ×${owned[id]||0}`)
        .setTimestamp()
      ]});
    }

    // Konsumsi bahan
    for (const [id, qty] of Object.entries(needed)) {
      let removed = 0;
      user.inventory = (user.inventory||[]).filter(i=>{
        if (i.id===id && removed<qty) { removed++; return false; }
        return true;
      });
    }

    // Tambah hasil
    user.inventory.push({ id:recipe.id, quantity:1, usesLeft:recipe.result_uses, craftedAt:Date.now() });
    saveUser(message.author.id, user);

    const embed = new EmbedBuilder()
      .setTitle(`🔨  ${recipe.name} Berhasil Dibuat!`)
      .setColor(COLORS.success)
      .setDescription(`${SEP}\n✅ Crafting berhasil!\n${SEP}`)
      .addFields(
        field('🎁 Hasil',   `**${recipe.name}**`),
        field('🔢 Uses',    `**${recipe.result_uses}x**`),
        field('📦 Bahan',   recipe.ingredients.map(i=>`\`${i}\``).join(' + '), false),
      )
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
// 15. !help2 — Help page 2 (semua command baru)
// ═══════════════════════════════════════════════════════════════
const help2Cmd = {
  name: 'help2',
  aliases: ['h2','bantuan2','newcommands'],
  description: '📚 Daftar semua command baru',
  async execute(message) {
    const vip = isVip(message.author.id) || message.author.id === OWNER_ID;

    const embed = new EmbedBuilder()
      .setTitle('📚  Help — Command Baru (Page 2)')
      .setColor(COLORS.cyan)
      .setDescription(`${SEP}\nSemua command baru yang ditambahkan!\n${vip?'👑 **VIP Aktif** — Semua bonus berlaku!\n':''}${SEP}`)
      .addFields(
        field('🌾 Farming & Alam', [
          '`!farm` — Bertani & panen hasil ladang',
          '`!weather` — Cek cuaca hari ini (buff/debuff)',
          '`!fortune` — Ramalan nasib + bonus (cd 24j)',
        ].join('\n'), false),
        field('⚔️ PvP & Kompetisi', [
          '`!arena @user <bet>` — PvP taruhan 3 ronde',
          '`!flip1v1 @user <bet>` — Coinflip 1v1',
          '`!compare @u1 @u2` — Bandingkan kekayaan',
        ].join('\n'), false),
        field('🏦 Ekonomi Lanjutan', [
          '`!loan <jml>` — Pinjam uang (bunga 15%)',
          '`!payloan <jml|all>` — Bayar hutang',
          '`!salary` — Klaim gaji pasif',
          '`!bankinfo` — Detail rekening bank',
        ].join('\n'), false),
        field('🎰 Game & Casino', [
          '`!roulette <jml> <warna>` — Roulette!',
          '`!invest <jml> <saham>` — Investasi saham',
          '`!casino` — Info semua game & odds',
          '`!trivia` — Kuis berhadiah uang',
        ].join('\n'), false),
        field('🔨 Crafting & Lelang', [
          '`!craft [id]` — Crafting item dari bahan',
          '`!auction list/start/bid` — Sistem lelang',
          '`!zoovalue` — Nilai total zoo kamu',
        ].join('\n'), false),
        field('📊 Info & Utility', [
          '`!coolreset <cmd>` — Skip CD dengan uang',
          '`!iteminfo [id]` — Info detail item',
          '`!flex [@user]` — Pamer kekayaan!',
          '`!hosting` — Info hosting gratis 24/7',
          '`!mine` — Tambang mineral berharga',
          '`!bounty set @user <jml>` — Pasang bounty',
        ].join('\n'), false),
      )
      .setFooter({text:'!help untuk command utama • semua CD 5 detik'})
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

module.exports = [
  farmCmd,      // 1
  arenaCmd,     // 2
  fortuneCmd,   // 3
  loanCmd,      // 4
  payLoanCmd,   // 5
  triviaCmd,    // 6
  weatherCmd,   // 7
  salaryCmd,    // 8
  casinoCmd,    // 9
  compareCmd,   // 10
  zooValueCmd,  // 11
  auctionCmd,   // 12
  bankInfoCmd,  // 13
  craftCmd,     // 14
  help2Cmd,     // 15
];
