// utils/embed.js — Beautiful embed builder helper
const { EmbedBuilder } = require('discord.js');

const COLORS = {
  success:   0x2ecc71,
  error:     0xe74c3c,
  warning:   0xf39c12,
  info:      0x3498db,
  gold:      0xf1c40f,
  purple:    0x9b59b6,
  dark:      0x2c3e50,
  cyan:      0x1abc9c,
  pink:      0xe91e8c,
  legendary: 0xff6b35,
};

// Baris pemisah cantik
const SEP = '━━━━━━━━━━━━━━━━━━━━';

function base(title, color, thumbnail = null) {
  const e = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setTimestamp();
  if (thumbnail) e.setThumbnail(thumbnail);
  return e;
}

function cooldownEmbed(commandName, remaining, resetAt, img = null) {
  const e = new EmbedBuilder()
    .setTitle(`⏳ Cooldown Aktif — ${commandName}`)
    .setColor(COLORS.error)
    .setDescription(
      `> Sisa waktu: **${remaining}**\n> Bisa dipakai: <t:${resetAt}:R>`
    )
    .setTimestamp();
  if (img) e.setImage(img);
  return e;
}

function successEmbed(title, desc, fields = [], img = null, thumb = null) {
  const e = new EmbedBuilder()
    .setTitle(`✅  ${title}`)
    .setColor(COLORS.success)
    .setDescription(desc)
    .setTimestamp();
  if (fields.length) e.addFields(fields);
  if (img) e.setImage(img);
  if (thumb) e.setThumbnail(thumb);
  return e;
}

function errorEmbed(title, desc) {
  return new EmbedBuilder()
    .setTitle(`❌  ${title}`)
    .setColor(COLORS.error)
    .setDescription(`> ${desc}`)
    .setTimestamp();
}

function infoEmbed(title, desc, fields = []) {
  const e = new EmbedBuilder()
    .setTitle(title)
    .setColor(COLORS.info)
    .setDescription(desc)
    .setTimestamp();
  if (fields.length) e.addFields(fields);
  return e;
}

// Progress bar
function progressBar(current, max, len = 15) {
  const filled = Math.round((current / max) * len);
  const empty  = len - filled;
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
}

// Rarity styling
const RARITY = {
  Common:    { color: 0x95a5a6, emoji: '⚪', bar: '░' },
  Uncommon:  { color: 0x2ecc71, emoji: '🟢', bar: '▒' },
  Rare:      { color: 0x3498db, emoji: '🔵', bar: '▓' },
  Epic:      { color: 0x9b59b6, emoji: '🟣', bar: '█' },
  Legendary: { color: 0xf1c40f, emoji: '🔴', bar: '◆' },
  Junk:      { color: 0x636e72, emoji: '⬛', bar: '·' },
  Miss:      { color: 0x636e72, emoji: '✖️',  bar: '·' },
};

module.exports = { COLORS, SEP, base, cooldownEmbed, successEmbed, errorEmbed, infoEmbed, progressBar, RARITY };
