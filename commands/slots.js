const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser, isVip } = require('../utils/database');
const { randCD, checkCD, fmtRemaining } = require('../utils/cooldown');

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];

const PAYOUTS = {
  '7️⃣7️⃣7️⃣':  50,
  '💎💎💎':    20,
  '⭐⭐⭐':    10,
  '🍇🍇🍇':    5,
  '🍊🍊🍊':    4,
  '🍋🍋🍋':    3,
  '🍒🍒🍒':    2,
};

const SPIN_FRAMES = 8;
const FRAME_DELAY = 220; // ms

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function spin() {
  return [randomSymbol(), randomSymbol(), randomSymbol()];
}

function buildSlotBox(reels, spinning = [false, false, false]) {
  const display = reels.map((r, i) => spinning[i] ? '🎰' : r);
  return [
    '╔══════════════╗',
    `║  ${display[0]}  │  ${display[1]}  │  ${display[2]}  ║`,
    '╚══════════════╝',
  ].join('\n');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = {
  name: 'slots',
  aliases: ['slot', 'mesin', 's'],
  description: 'Slot machine animasi! (cd: 5–10 hari)',
  async execute(message, args) {
    const user = getUser(message.author.id);
    const now  = Date.now();

    const savedCD = user.lastSlotsCD || randCD();
    const { onCD, remaining, resetAt } = checkCD(user.lastSlots, savedCD);

    if (onCD) {
      const embed = new EmbedBuilder()
        .setTitle('🎰 Mesin Masih Panas!')
        .setColor('#9b59b6')
        .setImage('https://media.giphy.com/media/26BGqfMnHoFmBFTCg/giphy.gif')
        .setDescription(`Mesin slot perlu waktu mendingin!\nCoba lagi dalam **${fmtRemaining(remaining)}**`)
        .addFields(
          { name: '📅 Bisa Main Lagi', value: `<t:${Math.floor(resetAt/1000)}:F>`, inline: true },
          { name: '⏳ Sisa',           value: `<t:${Math.floor(resetAt/1000)}:R>`, inline: true },
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const rawAmount = args[0]?.toLowerCase();
    const vip = isVip(message.author.id) || message.author.id === '1213365471693246504';
    let bet = rawAmount === 'all' ? user.balance : parseInt(rawAmount);

    if (!bet || bet <= 0 || isNaN(bet)) {
      const embed = new EmbedBuilder()
        .setTitle('🎰 Slot Machine')
        .setColor('#9b59b6')
        .setImage('https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif')
        .setDescription('**Cara main:** `!slots <jumlah|all>`\n\n**💰 Payout Table:**')
        .addFields({
          name: 'Kombinasi → Bayaran',
          value: Object.entries(PAYOUTS).map(([c, m]) => `${c} → **${m}x**`).join('\n') +
                 '\n\n*2 simbol sama di kiri/tengah → **1x** (balik modal)*',
          inline: false,
        })
        .setFooter({ text: vip ? '👑 VIP: taruhan maksimal +20%!' : 'Beli VIP untuk bonus taruhan' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (vip) bet = Math.floor(bet * 1.2); // VIP bet 20% lebih besar
    if (bet > user.balance) return message.reply(`❌ Saldo kamu hanya **$${user.balance.toLocaleString()}**!`);
    if (bet < 50) return message.reply('❌ Minimal taruhan **$50**!');

    // ─── ANIMASI SPINNING ────────────────────────────────────────
    const spinMsg = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎰 SPINNING...')
          .setColor('#9b59b6')
          .setDescription(buildSlotBox(['🎰','🎰','🎰'], [true,true,true]))
          .addFields({ name: '🎯 Taruhan', value: `**$${bet.toLocaleString()}**`, inline: true })
          .setTimestamp()
      ]
    });

    // Frame animasi — simbol random berputar
    for (let frame = 0; frame < SPIN_FRAMES; frame++) {
      await sleep(FRAME_DELAY);
      const tempReels = spin();
      const spinState = frame < 3  ? [true,true,true]
                      : frame < 5  ? [false,true,true]
                      : frame < 7  ? [false,false,true]
                      :              [false,false,false];
      try {
        await spinMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle('🎰 SPINNING...')
              .setColor('#e67e22')
              .setDescription(buildSlotBox(tempReels, spinState))
              .addFields({ name: '🎯 Taruhan', value: `**$${bet.toLocaleString()}**`, inline: true })
              .setTimestamp()
          ]
        });
      } catch (_) {}
    }

    await sleep(400);

    // ─── HASIL FINAL ────────────────────────────────────────────
    const finalReels  = spin();
    const combo       = finalReels.join('');
    const multiplier  = PAYOUTS[combo] ||
      (finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2] ? 1 : 0);

    const won    = multiplier > 0;
    const payout = won ? bet * multiplier - bet : -bet;

    user.balance += payout;
    const newCD = randCD();
    user.lastSlots   = now;
    user.lastSlotsCD = newCD;
    saveUser(message.author.id, user);

    let title = '😭 TIDAK MENANG!';
    let color = '#e74c3c';
    let resultText = `Tidak ada kombinasi yang cocok. Kamu kehilangan **$${bet.toLocaleString()}**`;

    if (multiplier >= 20) {
      title = '🎊 JACKPOT BESAR!!';
      color = '#f1c40f';
      resultText = `🌟 **${multiplier}x MULTIPLIER!!** Kamu menang **$${(bet*multiplier).toLocaleString()}**!`;
    } else if (multiplier >= 5) {
      title = '🎉 MENANG BESAR!';
      color = '#2ecc71';
      resultText = `**${multiplier}x** kemenangan! Profit **$${payout.toLocaleString()}**!`;
    } else if (multiplier > 0) {
      title = `✅ MENANG ${multiplier}x`;
      color = '#27ae60';
      resultText = `Dapat **${multiplier}x** — profit **$${payout.toLocaleString()}**`;
    }

    try {
      await spinMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle(`🎰 ${title}`)
            .setColor(color)
            .setDescription(
              buildSlotBox(finalReels) + `\n\n${resultText}`
            )
            .addFields(
              { name: '🎯 Taruhan',   value: `**$${bet.toLocaleString()}**`,           inline: true },
              { name: won ? '💰 Profit' : '💸 Rugi', value: `**$${Math.abs(payout).toLocaleString()}**`, inline: true },
              { name: '💳 Saldo',     value: `**$${user.balance.toLocaleString()}**`,   inline: true },
              { name: '⏳ Cooldown',  value: `5 detik`,      inline: true },
              { name: '📅 Main Lagi', value: `<t:${Math.floor((now+newCD)/1000)}:R>`,  inline: true },
            )
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Payout 7️⃣7️⃣7️⃣ = 50x • 💎💎💎 = 20x • ⭐⭐⭐ = 10x' })
            .setTimestamp()
        ]
      });
    } catch (_) {}
  },
};
