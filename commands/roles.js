// ============================================================
//  roles.js — 10 command baru: Owner / Admin / VIP system
//  Commands: !addadmin !removeadmin !adminlist
//            !addvip !removevip !viplist !vipinfo
//            !adminkick !adminwarn !adminwarnlist
// ============================================================

const { EmbedBuilder } = require('discord.js');
const {
  isAdmin, addAdmin, removeAdmin, getAdminList,
  isVip, addVip, removeVip, getVipInfo, getVipList,
  getUser, saveUser, loadDB,
} = require('../utils/database');

const OWNER_ID = '1213365471693246504';

// Shared warning storage (in-memory, persists via db)
const fs   = require('fs');
const path = require('path');
const WARN_PATH = path.join(__dirname, '..', 'data', 'warnings.json');

function loadWarns() {
  if (!fs.existsSync(WARN_PATH)) fs.writeFileSync(WARN_PATH, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(WARN_PATH));
}
function saveWarns(d) { fs.writeFileSync(WARN_PATH, JSON.stringify(d, null, 2)); }

// ─── Helper embeds ───────────────────────────────────────────
function denied(message, text = 'Hanya **Owner** yang bisa pakai command ini!') {
  return message.reply({ embeds: [
    new EmbedBuilder().setTitle('🚫 Akses Ditolak').setColor('#e74c3c').setDescription(text).setTimestamp()
  ]});
}

function success(title, desc, color = '#2ecc71') {
  return new EmbedBuilder().setTitle(title).setColor(color).setDescription(desc).setTimestamp();
}

// ═══════════════════════════════════════════════════════════════
//  1. !addadmin @user  — Owner → tambah admin
// ═══════════════════════════════════════════════════════════════
const addAdminCmd = {
  name: 'addadmin',
  aliases: ['setadmin'],
  description: '[OWNER] Tambah admin bot',
  async execute(message, args) {
    if (message.author.id !== OWNER_ID) return denied(message);
    const target = message.mentions.users.first();
    if (!target) return message.reply('Format: `!addadmin @user`');
    if (target.id === OWNER_ID) return message.reply('❌ Owner sudah otomatis jadi admin!');

    addAdmin(target.id);
    message.reply({ embeds: [success(
      '✅ Admin Ditambahkan',
      `${target} sekarang menjadi **Admin Bot**!\nMereka bisa pakai command \`!admin\`.`,
    )] });
  },
};

// ═══════════════════════════════════════════════════════════════
//  2. !removeadmin @user  — Owner → hapus admin
// ═══════════════════════════════════════════════════════════════
const removeAdminCmd = {
  name: 'removeadmin',
  aliases: ['deladmin', 'demoteadmin'],
  description: '[OWNER] Hapus admin bot',
  async execute(message, args) {
    if (message.author.id !== OWNER_ID) return denied(message);
    const target = message.mentions.users.first();
    if (!target) return message.reply('Format: `!removeadmin @user`');

    removeAdmin(target.id);
    message.reply({ embeds: [success(
      '✅ Admin Dihapus',
      `${target} sudah tidak menjadi **Admin Bot**.`,
      '#e67e22',
    )] });
  },
};

// ═══════════════════════════════════════════════════════════════
//  3. !adminlist  — Lihat semua admin
// ═══════════════════════════════════════════════════════════════
const adminListCmd = {
  name: 'adminlist',
  aliases: ['admins', 'listadmin'],
  description: '[OWNER] Lihat daftar admin',
  async execute(message) {
    if (message.author.id !== OWNER_ID) return denied(message);
    const list = getAdminList();

    const embed = new EmbedBuilder()
      .setTitle('🛡️ Daftar Admin Bot')
      .setColor('#f1c40f')
      .setDescription(
        `👑 **Owner:** <@${OWNER_ID}>\n\n` +
        (list.length
          ? list.map((id, i) => `**${i + 1}.** <@${id}>`).join('\n')
          : '*Belum ada admin tambahan*')
      )
      .setFooter({ text: `Total Admin: ${list.length + 1}` })
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
//  4. !addvip @user <hari>  — Owner/Admin → beri VIP
// ═══════════════════════════════════════════════════════════════
const addVipCmd = {
  name: 'addvip',
  aliases: ['givevip', 'setvip'],
  description: '[ADMIN] Beri VIP ke user',
  async execute(message, args) {
    if (!isAdmin(message.author.id, OWNER_ID)) return denied(message, 'Hanya **Owner** atau **Admin** yang bisa!');
    const target = message.mentions.users.first();
    const days   = parseInt(args[1]) || 30;
    if (!target) return message.reply('Format: `!addvip @user <hari>`');

    const until = addVip(target.id, days * 86400000);

    const embed = new EmbedBuilder()
      .setTitle('👑 VIP Diberikan!')
      .setColor('#f1c40f')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 User',     value: `${target}`,                                         inline: true },
        { name: '⏳ Durasi',   value: `**${days} hari**`,                                  inline: true },
        { name: '📅 Berakhir', value: `<t:${Math.floor(until / 1000)}:D>`,                 inline: true },
      )
      .setDescription('🌟 User sekarang mendapat keuntungan **VIP**:\n• +25% gaji !work\n• Cooldown -50%\n• Badge 👑 di !profile')
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
//  5. !removevip @user  — Owner/Admin → cabut VIP
// ═══════════════════════════════════════════════════════════════
const removeVipCmd = {
  name: 'removevip',
  aliases: ['delvip', 'unvip'],
  description: '[ADMIN] Cabut VIP user',
  async execute(message, args) {
    if (!isAdmin(message.author.id, OWNER_ID)) return denied(message, 'Hanya **Owner** atau **Admin** yang bisa!');
    const target = message.mentions.users.first();
    if (!target) return message.reply('Format: `!removevip @user`');

    removeVip(target.id);
    message.reply({ embeds: [success('✅ VIP Dicabut', `VIP ${target} telah dihapus.`, '#e67e22')] });
  },
};

// ═══════════════════════════════════════════════════════════════
//  6. !viplist  — Lihat semua user VIP
// ═══════════════════════════════════════════════════════════════
const vipListCmd = {
  name: 'viplist',
  aliases: ['listvip', 'vips'],
  description: '[ADMIN] Lihat daftar VIP',
  async execute(message) {
    if (!isAdmin(message.author.id, OWNER_ID)) return denied(message, 'Hanya **Owner** atau **Admin** yang bisa!');
    const list = getVipList();
    const now  = Date.now();
    const active = list.filter(v => !v.until || v.until > now);

    const embed = new EmbedBuilder()
      .setTitle('👑 Daftar User VIP')
      .setColor('#f1c40f')
      .setDescription(
        active.length
          ? active.map((v, i) =>
              `**${i + 1}.** <@${v.id}> — berakhir <t:${Math.floor((v.until || 0) / 1000)}:R>`
            ).join('\n')
          : '*Belum ada VIP aktif*'
      )
      .setFooter({ text: `Total VIP Aktif: ${active.length}` })
      .setTimestamp();
    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
//  7. !vipinfo [@user]  — Cek status VIP diri sendiri atau orang lain
// ═══════════════════════════════════════════════════════════════
const vipInfoCmd = {
  name: 'vipinfo',
  aliases: ['myvip', 'cekv'],
  description: 'Cek status VIP kamu atau user lain',
  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    // Non-admin hanya boleh cek diri sendiri
    if (target.id !== message.author.id && !isAdmin(message.author.id, OWNER_ID)) {
      return denied(message, 'Kamu hanya bisa cek VIP diri sendiri!');
    }

    const info    = getVipInfo(target.id);
    const active  = isVip(target.id);
    const isOwner = target.id === OWNER_ID;
    const isAdminUser = isAdmin(target.id, OWNER_ID);

    const embed = new EmbedBuilder()
      .setTitle(`👑 Status VIP — ${target.username}`)
      .setColor(active || isOwner ? '#f1c40f' : '#7f8c8d')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🎖️ Role',   value: isOwner ? '**👑 Owner**' : isAdminUser ? '**🛡️ Admin**' : active ? '**⭐ VIP**' : '**👤 Member**', inline: true },
        { name: '✅ VIP Aktif', value: (active || isOwner) ? '**Ya**' : '**Tidak**', inline: true },
      );

    if (info && active) {
      embed.addFields(
        { name: '📅 Mulai',     value: `<t:${Math.floor(info.since / 1000)}:D>`,           inline: true },
        { name: '📅 Berakhir',  value: `<t:${Math.floor(info.until / 1000)}:D>`,            inline: true },
        { name: '⏳ Sisa',      value: `<t:${Math.floor(info.until / 1000)}:R>`,            inline: true },
      );
      embed.addFields({ name: '🌟 Keuntungan VIP', value: '• +25% gaji `!work`\n• Cooldown -50%\n• Badge 👑 di !profile', inline: false });
    } else if (!active && !isOwner) {
      embed.setDescription('Kamu belum VIP. Hubungi Admin untuk mendapatkan VIP!\nAtau beli `!shop buy vip_pass` untuk VIP 24 jam.');
    }

    message.reply({ embeds: [embed] });
  },
};

// ═══════════════════════════════════════════════════════════════
//  8. !adminkick @user [alasan]  — Admin → kick paksa (kurangi saldo 50%)
//     (Tidak bisa kick sesungguhnya tanpa intent, jadi hukuman ekonomi)
// ═══════════════════════════════════════════════════════════════
const adminKickCmd = {
  name: 'adminkick',
  aliases: ['ekick', 'economykick'],
  description: '[ADMIN] Hukuman ekonomi — saldo user dikurangi 50%',
  async execute(message, args) {
    if (!isAdmin(message.author.id, OWNER_ID)) return denied(message, 'Hanya **Owner** atau **Admin** yang bisa!');
    const target = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'Tidak ada alasan';
    if (!target) return message.reply('Format: `!adminkick @user [alasan]`');
    if (target.id === OWNER_ID) return message.reply('❌ Tidak bisa menghukum Owner!');

    const user = getUser(target.id);
    const fine = Math.floor(user.balance * 0.5);
    user.balance = Math.floor(user.balance * 0.5);
    saveUser(target.id, user);

    const embed = new EmbedBuilder()
      .setTitle('🔨 Economic Kick!')
      .setColor('#e74c3c')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 User',     value: `${target}`,                    inline: true },
        { name: '💸 Denda',    value: `**$${fine.toLocaleString()}**`, inline: true },
        { name: '💰 Sisa',     value: `**$${user.balance.toLocaleString()}**`, inline: true },
        { name: '📝 Alasan',   value: reason,                         inline: false },
      )
      .setFooter({ text: `Dilakukan oleh: ${message.author.tag}` })
      .setTimestamp();
    message.reply({ embeds: [embed] });

    // DM target
    target.send({ embeds: [
      new EmbedBuilder()
        .setTitle('⚠️ Kamu Terkena Hukuman Ekonomi!')
        .setColor('#e74c3c')
        .setDescription(`Admin **${message.author.tag}** di **${message.guild?.name}** menghukummu!\n**Alasan:** ${reason}\n**Denda:** $${fine.toLocaleString()}`)
        .setTimestamp()
    ]}).catch(() => {});
  },
};

// ═══════════════════════════════════════════════════════════════
//  9. !adminwarn @user [alasan]  — Admin → beri peringatan
// ═══════════════════════════════════════════════════════════════
const adminWarnCmd = {
  name: 'adminwarn',
  aliases: ['warn', 'peringatan'],
  description: '[ADMIN] Beri peringatan ke user',
  async execute(message, args) {
    if (!isAdmin(message.author.id, OWNER_ID)) return denied(message, 'Hanya **Owner** atau **Admin** yang bisa!');
    const target = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'Tidak ada alasan';
    if (!target) return message.reply('Format: `!adminwarn @user [alasan]`');
    if (target.id === OWNER_ID) return message.reply('❌ Tidak bisa memperingatkan Owner!');

    const warns = loadWarns();
    if (!warns[target.id]) warns[target.id] = [];
    warns[target.id].push({ reason, by: message.author.id, at: Date.now() });
    saveWarns(warns);

    const total = warns[target.id].length;

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Peringatan #${total} Diberikan`)
      .setColor('#e67e22')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 User',           value: `${target}`,   inline: true },
        { name: '⚠️ Total Peringatan', value: `**${total}**`, inline: true },
        { name: '📝 Alasan',          value: reason,        inline: false },
      )
      .setFooter({ text: `Admin: ${message.author.tag}` })
      .setTimestamp();
    message.reply({ embeds: [embed] });

    // Auto-denda jika 3+ warn
    if (total >= 3) {
      const user = getUser(target.id);
      const fine = Math.floor(user.balance * 0.25);
      user.balance -= fine;
      saveUser(target.id, user);
      message.channel.send(`🔴 ${target} sudah **${total} peringatan** — saldo dikurangi **$${fine.toLocaleString()}** otomatis!`);
    }

    target.send({ embeds: [
      new EmbedBuilder()
        .setTitle(`⚠️ Kamu Mendapat Peringatan ke-${total}!`)
        .setColor('#e67e22')
        .setDescription(`**Server:** ${message.guild?.name}\n**Admin:** ${message.author.tag}\n**Alasan:** ${reason}\n\n${total >= 3 ? '🔴 3+ peringatan = denda otomatis!' : ''}`)
        .setTimestamp()
    ]}).catch(() => {});
  },
};

// ═══════════════════════════════════════════════════════════════
//  10. !adminwarnlist [@user]  — Lihat daftar peringatan
// ═══════════════════════════════════════════════════════════════
const adminWarnListCmd = {
  name: 'adminwarnlist',
  aliases: ['warns', 'warnlist', 'lihat-peringatan'],
  description: '[ADMIN] Lihat daftar peringatan user',
  async execute(message, args) {
    if (!isAdmin(message.author.id, OWNER_ID)) return denied(message, 'Hanya **Owner** atau **Admin** yang bisa!');
    const target = message.mentions.users.first();
    if (!target) return message.reply('Format: `!adminwarnlist @user`');

    const warns = loadWarns();
    const userWarns = warns[target.id] || [];

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Daftar Peringatan — ${target.username}`)
      .setColor(userWarns.length > 0 ? '#e67e22' : '#2ecc71')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    if (userWarns.length === 0) {
      embed.setDescription('✅ User ini tidak memiliki peringatan.');
    } else {
      embed.setDescription(
        userWarns.map((w, i) =>
          `**#${i + 1}** — ${w.reason}\n  *<@${w.by}> • <t:${Math.floor(w.at / 1000)}:R>*`
        ).join('\n\n')
      );
      embed.setFooter({ text: `Total: ${userWarns.length} peringatan • 3+ = denda otomatis` });
    }

    message.reply({ embeds: [embed] });
  },
};

// Export semua sebagai array
module.exports = [
  addAdminCmd,
  removeAdminCmd,
  adminListCmd,
  addVipCmd,
  removeVipCmd,
  vipListCmd,
  vipInfoCmd,
  adminKickCmd,
  adminWarnCmd,
  adminWarnListCmd,
];
