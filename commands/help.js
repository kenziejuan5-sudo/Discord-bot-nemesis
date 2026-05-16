const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, isAdmin, isVip, getVipInfo } = require('../utils/database');

const OWNER_ID = '1213365471693246504';

// ─── Semua kategori command ───────────────────────────────────
const CATEGORIES = {
  economy: {
    label: '💰 Ekonomi',
    color: '#f1c40f',
    emoji: '💰',
    commands: [
      { name: '!balance [@user]',  cd: '—',           desc: 'Lihat saldo kas & bank kamu atau user lain' },
      { name: '!profile [@user]',  cd: '—',           desc: 'Profil lengkap: rank, net worth, semua CD aktif, hewan terlangka' },
      { name: '!net [@user]',      cd: '—',           desc: 'Net worth detail: kas + bank + nilai zoo + inventory' },
      { name: '!daily',            cd: '7 hari',      desc: 'Klaim reward mingguan $2k–5k + bonus streak & VIP' },
      { name: '!work',             cd: '5–10 hari',   desc: 'Kerja besar, gaji $3k–30k. Makin langka makin mahal' },
      { name: '!leaderboard',      cd: '—',           desc: 'Top 10 terkaya di server berdasarkan total net worth' },
      { name: '!cooldowns',        cd: '—',           desc: 'Cek semua cooldown aktif milikmu dalam satu tempat' },
      { name: '!serverinfo',       cd: '—',           desc: 'Statistik ekonomi keseluruhan server' },
      { name: '!achievements',     cd: '—',           desc: 'Lihat 10 badge pencapaian yang bisa kamu buka' },
    ],
  },
  bank: {
    label: '🏦 Bank',
    color: '#2980b9',
    emoji: '🏦',
    commands: [
      { name: '!bank',                        cd: '—',  desc: 'Menu utama bank — lihat saldo kas & bank' },
      { name: '!bank deposit <jumlah|all>',   cd: '—',  desc: 'Setor uang ke bank (aman dari rampok)' },
      { name: '!bank withdraw <jumlah|all>',  cd: '—',  desc: 'Tarik uang dari bank ke kas' },
      { name: '!bank transfer @user <jml>',   cd: '—',  desc: 'Transfer ke user lain, kena pajak 5% (VIP: 0%)' },
    ],
  },
  hunt: {
    label: '🏹 Berburu & Pancing',
    color: '#27ae60',
    emoji: '🏹',
    commands: [
      { name: '!hunt',               cd: '5–10 hari',  desc: 'Berburu hewan liar: Common→Legendary (14 jenis hewan)' },
      { name: '!zoo [@user]',        cd: '—',          desc: 'Lihat koleksi hewan di zoo kamu atau user lain' },
      { name: '!huntinfo [id]',      cd: '—',          desc: 'Info lengkap & foto semua hewan yang bisa diburu' },
      { name: '!sell <id> [all]',    cd: '—',          desc: 'Jual hewan dari koleksi. Tambah `all` untuk jual semua' },
      { name: '!topzoo',             cd: '—',          desc: 'Leaderboard siapa yang punya koleksi hewan terbanyak' },
      { name: '!gift @user <id>',    cd: '—',          desc: 'Hadiahkan hewan ke user lain + notif DM otomatis' },
      { name: '!fish',               cd: '5–10 hari',  desc: 'Mancing ikan (butuh joran + umpan dari !shop)' },
    ],
  },
  shop: {
    label: '🛍️ Shop & Inventory',
    color: '#8e44ad',
    emoji: '🛍️',
    commands: [
      { name: '!shop',               cd: '—',  desc: 'Toko item — joran, senapan, jimat, peta harta, VIP pass' },
      { name: '!shop buy <id>',      cd: '—',  desc: 'Beli item dari toko' },
      { name: '!shop sell <id>',     cd: '—',  desc: 'Jual item dari inventory (harga 50% beli)' },
      { name: '!inventory [@user]',  cd: '—',  desc: 'Lihat semua item di inventory kamu atau user lain' },
      { name: '!use <item_id>',      cd: '—',  desc: 'Pakai item: peta harta, VIP pass, jimat keberuntungan' },
    ],
  },
  gambling: {
    label: '🎲 Judi & Minigame',
    color: '#c0392b',
    emoji: '🎲',
    commands: [
      { name: '!coinflip <jml> [h/t]', cd: '5–10 hari', desc: 'Lempar koin! Pilih heads/tails untuk +odds. Animasi koin!' },
      { name: '!slots <jumlah|all>',   cd: '5–10 hari', desc: '🎰 Slot machine dengan ANIMASI BERPUTAR! Max 50x jackpot' },
      { name: '!blackjack <jumlah>',   cd: '5–10 hari', desc: '🃏 Blackjack interaktif — HIT/STAND dengan tombol! BJ = 2.5x' },
      { name: '!race <jml> <1-4>',     cd: '5–10 hari', desc: '🏁 Balapan motor/mobil dengan ANIMASI TREK! Max odds 4x' },
      { name: '!spin',                 cd: '5–10 hari', desc: '🎡 Roda keberuntungan gratis! Bisa dapat uang/reset daily' },
      { name: '!rob @user',            cd: '5–10 hari', desc: '🦹 Coba rampok user lain! 40% sukses, gagal = denda 30%' },
      { name: '!duel @user <jml>',     cd: '—',         desc: '⚔️ Tantang user duel dice! Menang ambil semua taruhan' },
    ],
  },
  social: {
    label: '👥 Sosial',
    color: '#16a085',
    emoji: '👥',
    commands: [
      { name: '!pay @user <jml>',  cd: '—',  desc: '💸 Transfer cepat TANPA pajak — khusus VIP' },
      { name: '!vipinfo [@user]',  cd: '—',  desc: 'Cek status VIP & sisa durasi VIP kamu' },
      { name: '!boostdaily',       cd: '7 hari', desc: '👑 Klaim bonus daily ekstra — khusus VIP ($3k–8k)' },
      { name: '!event list',       cd: '—',  desc: 'Lihat semua event ekonomi yang sedang aktif' },
    ],
  },
};

const ADMIN_CMDS = [
  '`!addvip @user <hari>` — Beri VIP ke user',
  '`!removevip @user` — Cabut VIP user',
  '`!viplist` — Daftar semua VIP aktif',
  '`!adminwarn @user [alasan]` — Beri peringatan (3+ = auto denda)',
  '`!adminwarnlist @user` — Lihat riwayat peringatan',
  '`!adminkick @user [alasan]` — Hukuman ekonomi (saldo -50%)',
  '`!admin setbal @user <jml>` — Set saldo user',
  '`!admin reset @user` — Reset semua data user',
  '`!admin giveitem @user <id>` — Beri item gratis',
  '`!admin giveanimal @user <id>` — Beri hewan ke user',
  '`!admin stats` — Statistik lengkap database',
];

const OWNER_CMDS = [
  '`!addadmin @user` — Promosikan user jadi admin',
  '`!removeadmin @user` — Cabut jabatan admin',
  '`!adminlist` — Daftar semua admin bot',
  '`!givemoney @user <jml>` — Tambah uang ke user',
  '`!takemoney @user <jml>` — Kurangi uang dari user',
  '`!createevent <jam> <emoji> <judul> | <desc> | <reward>` — Buat event',
];

function buildMainEmbed(author, role, vipInfo) {
  const isOwnerBit = author.id === OWNER_ID;
  const isAdminBit = isAdmin(author.id, OWNER_ID);
  const isVipBit   = isVip(author.id);

  const roleTag = isOwnerBit ? '👑 **Owner**'
                : isAdminBit ? '🛡️ **Admin**'
                : isVipBit   ? '⭐ **VIP**'
                :              '👤 **Member**';

  const color = isOwnerBit ? '#f1c40f'
              : isAdminBit ? '#e74c3c'
              : isVipBit   ? '#9b59b6'
              :              '#3498db';

  const vipText = isVipBit && vipInfo
    ? `\n> 👑 VIP aktif hingga <t:${Math.floor(vipInfo.until / 1000)}:R>`
    : '';

  const user = getUser(author.id);

  return new EmbedBuilder()
    .setTitle('╔══ 📚 ECONOMY BOT — HELP CENTER ══╗')
    .setColor(color)
    .setThumbnail(author.displayAvatarURL({ dynamic: true }))
    .setDescription(
      `> Halo **${author.username}**! Role kamu: ${roleTag}${vipText}\n` +
      `> 💳 Saldo: **$${(user.balance||0).toLocaleString()}** | 🏦 Bank: **$${(user.bank||0).toLocaleString()}**\n\n` +
      `**Klik tombol di bawah untuk lihat kategori command:**\n` +
      Object.entries(CATEGORIES).map(([, cat]) =>
        `${cat.emoji} **${cat.label}**`
      ).join('  •  ')
    )
    .addFields(
      {
        name: '⚡ Quick Commands',
        value: [
          '`!balance` `!profile` `!daily` `!work` `!hunt`',
          '`!slots` `!race` `!blackjack` `!coinflip` `!spin`',
          '`!shop` `!zoo` `!cooldowns` `!duel` `!serverinfo`',
        ].join('\n'),
        inline: false,
      },
      {
        name: '⏳ Sistem Cooldown',
        value: [
          '• `!daily` — **7 hari**',
          '• `!work` `!hunt` `!fish` — **5–10 hari random**',
          '• `!slots` `!coinflip` `!blackjack` — **5–10 hari random**',
          '• `!race` `!rob` `!spin` — **5–10 hari random**',
        ].join('\n'),
        inline: true,
      },
      {
        name: '🌟 Keuntungan VIP',
        value: [
          '• `!pay` — Transfer 0% pajak',
          '• `!boostdaily` — Bonus $3k–8k/minggu',
          '• Hunt: +20% catch rate',
          '• Slots: taruhan +20% lebih besar',
          '• Coinflip: win rate 52%',
          '• Race: speed boost kendaraan',
        ].join('\n'),
        inline: true,
      },
    )
    .setImage('https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif')
    .setFooter({ text: `Economy Bot • Prefix: ! • Klik kategori di bawah untuk detail` })
    .setTimestamp();
}

function buildCategoryEmbed(catKey, author) {
  const cat = CATEGORIES[catKey];
  const embed = new EmbedBuilder()
    .setTitle(`${cat.emoji} ${cat.label} — Command List`)
    .setColor(cat.color)
    .setThumbnail(author.displayAvatarURL({ dynamic: true }))
    .setDescription(`Semua command dalam kategori **${cat.label}**:\n\u200b`)
    .setFooter({ text: 'Klik 🏠 Home untuk kembali ke menu utama • Prefix: !' })
    .setTimestamp();

  for (const cmd of cat.commands) {
    embed.addFields({
      name: `\`${cmd.name}\`${cmd.cd !== '—' ? `  ⏳ ${cmd.cd}` : ''}`,
      value: `> ${cmd.desc}`,
      inline: false,
    });
  }

  return embed;
}

function buildAdminEmbed(isOwner) {
  const embed = new EmbedBuilder()
    .setTitle('🛡️ Admin & Owner Commands')
    .setColor('#e74c3c')
    .setDescription('Command eksklusif untuk Admin dan Owner bot.\n\u200b')
    .addFields(
      {
        name: '🛡️ Admin Commands',
        value: ADMIN_CMDS.join('\n'),
        inline: false,
      },
    )
    .setFooter({ text: 'Klik 🏠 Home untuk kembali' })
    .setTimestamp();

  if (isOwner) {
    embed.addFields({
      name: '👑 Owner Only Commands',
      value: OWNER_CMDS.join('\n'),
      inline: false,
    });
  }

  return embed;
}

function buildButtons(page = 'home', isAdmin = false) {
  const rows = [];

  // Row 1 — Category buttons
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('help_economy').setLabel('💰 Ekonomi').setStyle(ButtonStyle.Primary).setDisabled(page === 'economy'),
    new ButtonBuilder().setCustomId('help_bank').setLabel('🏦 Bank').setStyle(ButtonStyle.Primary).setDisabled(page === 'bank'),
    new ButtonBuilder().setCustomId('help_hunt').setLabel('🏹 Hunt').setStyle(ButtonStyle.Success).setDisabled(page === 'hunt'),
    new ButtonBuilder().setCustomId('help_shop').setLabel('🛍️ Shop').setStyle(ButtonStyle.Secondary).setDisabled(page === 'shop'),
    new ButtonBuilder().setCustomId('help_gambling').setLabel('🎲 Judi').setStyle(ButtonStyle.Danger).setDisabled(page === 'gambling'),
  ));

  // Row 2
  const row2 = [
    new ButtonBuilder().setCustomId('help_social').setLabel('👥 Sosial').setStyle(ButtonStyle.Secondary).setDisabled(page === 'social'),
    new ButtonBuilder().setCustomId('help_home').setLabel('🏠 Home').setStyle(ButtonStyle.Primary).setDisabled(page === 'home'),
  ];

  if (isAdmin) {
    row2.push(new ButtonBuilder().setCustomId('help_admin').setLabel('🛡️ Admin').setStyle(ButtonStyle.Danger).setDisabled(page === 'admin'));
  }

  rows.push(new ActionRowBuilder().addComponents(...row2));

  return rows;
}

module.exports = {
  name: 'help',
  aliases: ['bantuan', 'commands', 'h', 'menu'],
  description: 'Menu bantuan lengkap dengan navigasi interaktif',
  async execute(message) {
    const uid     = message.author.id;
    const adminBit = isAdmin(uid, OWNER_ID);
    const vipInfo  = getVipInfo(uid);

    const mainEmbed = buildMainEmbed(message.author, null, vipInfo);
    const components = buildButtons('home', adminBit);

    const msg = await message.reply({ embeds: [mainEmbed], components });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === uid,
      time: 5 * 60 * 1000, // 5 menit
    });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate();
      const id = interaction.customId;

      let embed, page;

      if (id === 'help_home') {
        embed = buildMainEmbed(message.author, null, vipInfo);
        page  = 'home';
      } else if (id === 'help_admin') {
        embed = buildAdminEmbed(uid === OWNER_ID);
        page  = 'admin';
      } else {
        const catKey = id.replace('help_', '');
        embed = buildCategoryEmbed(catKey, message.author);
        page  = catKey;
      }

      await msg.edit({ embeds: [embed], components: buildButtons(page, adminBit) });
    });

    collector.on('end', () => {
      // Disable semua tombol
      const disabledRows = buildButtons('none', false).map(row => {
        row.components.forEach(btn => btn.setDisabled(true));
        return row;
      });
      msg.edit({ components: disabledRows }).catch(() => {});
    });
  },
};
