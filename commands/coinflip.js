const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser, isVip } = require('../utils/database');
const { randCD, checkCD, fmtRemaining } = require('../utils/cooldown');

const FLIP_FRAMES = [
  ['🌕 ——————— 🌕', 'Melempar koin...'],
  ['🌗 ——————— 🌗', 'Koin berputar di udara!'],
  ['🌑 ——————— 🌑', 'Koin masih di udara...'],
  ['🌓 ——————— 🌓', 'Hampir mendarat...'],
  ['🌕 ——————— 🌕', 'Menghitung hasil...'],
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = {
  name: 'coinflip',
  aliases: ['cf', 'koin', 'flip'],
  description: 'Lempar koin — 50/50! (cd: 5–10 hari)',
  async execute(message, args) {
    const user = getUser(message.author.id);
    const now  = Date.now();

    const savedCD = user.lastCFCD || randCD();
    const { onCD, remaining, resetAt } = checkCD(user.lastCF, savedCD);

    if (onCD) {
      const embed = new EmbedBuilder()
        .setTitle('🪙 Koin Masih Bergulir!')
        .setColor('#f1c40f')
        .setDescription(`Kamu baru saja melempar koin!\nTunggu **${fmtRemaining(remaining)}** lagi.`)
        .addFields(
          { name: '📅 Bisa Flip Lagi', value: `<t:${Math.floor(resetAt/1000)}:F>`, inline: true },
          { name: '⏳ Sisa',           value: `<t:${Math.floor(resetAt/1000)}:R>`, inline: true },
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const rawAmount = args[0]?.toLowerCase();
    const pick      = args[1]?.toLowerCase(); // heads / tails / h / t (optional)
    let bet = rawAmount === 'all' ? user.balance : parseInt(rawAmount);

    if (!bet || bet <= 0 || isNaN(bet)) {
      const embed = new EmbedBuilder()
        .setTitle('🪙 Coin Flip')
        .setColor('#f1c40f')
        .setImage('https://media.giphy.com/media/3oz8xZvvOZRmKay4xy/giphy.gif')
        .setDescription(
          '**Cara main:** `!coinflip <jumlah> [heads/tails]`\n\n' +
          '• Menang → **2x** taruhan\n• Kalah → kehilangan taruhan\n' +
          '• Jika pilih sisi: menang 2x, kalah 1x\n' +
          '• Tanpa pilih: random 48% win\n\n' +
          '**Contoh:**\n`!coinflip 1000`\n`!coinflip 500 heads`'
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (bet > user.balance) return message.reply(`❌ Saldo kamu hanya **$${user.balance.toLocaleString()}**!`);
    if (bet < 50)           return message.reply('❌ Minimal taruhan **$50**!');

    const vip = isVip(message.author.id) || message.author.id === '1213365471693246504';

    // ─── ANIMASI ────────────────────────────────────────────────
    const flipMsg = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🪙 Melempar Koin...')
          .setColor('#f1c40f')
          .setDescription('```\n' + FLIP_FRAMES[0][0] + '\n' + FLIP_FRAMES[0][1] + '\n```')
          .addFields({ name: '💵 Taruhan', value: `**$${bet.toLocaleString()}**`, inline: true })
          .setTimestamp()
      ]
    });

    for (let i = 1; i < FLIP_FRAMES.length; i++) {
      await sleep(500);
      try {
        await flipMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle('🪙 Melempar Koin...')
              .setColor('#f39c12')
              .setDescription('```\n' + FLIP_FRAMES[i][0] + '\n' + FLIP_FRAMES[i][1] + '\n```')
              .addFields({ name: '💵 Taruhan', value: `**$${bet.toLocaleString()}**`, inline: true })
              .setTimestamp()
          ]
        });
      } catch (_) {}
    }

    await sleep(600);

    // ─── HASIL ─────────────────────────────────────────────────
    const result  = Math.random() < 0.5 ? 'heads' : 'tails';
    const userPick = (pick === 'heads' || pick === 'h') ? 'heads'
                   : (pick === 'tails' || pick === 't') ? 'tails'
                   : null;

    let win;
    if (userPick) {
      win = userPick === result;
    } else {
      win = vip ? Math.random() < 0.52 : Math.random() < 0.48;
    }

    const profit = win ? bet : -bet;
    user.balance += profit;
    const newCD = randCD();
    user.lastCF   = now;
    user.lastCFCD = newCD;
    saveUser(message.author.id, user);

    const resultEmoji = result === 'heads' ? '🌕 HEADS' : '🌑 TAILS';
    const pickText    = userPick ? `Pilihanmu: **${userPick.toUpperCase()}** ${userPick === result ? '✅' : '❌'}` : 'Tanpa pilihan';

    try {
      await flipMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle(win ? '🎊 MENANG COINFLIP!' : '💸 KALAH COINFLIP!')
            .setColor(win ? '#2ecc71' : '#e74c3c')
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setDescription(
              `## ${resultEmoji}\n${pickText}\n\n` +
              (win ? `🎉 Kamu menang **$${bet.toLocaleString()}**!` : `😭 Kamu kehilangan **$${bet.toLocaleString()}**!`)
            )
            .addFields(
              { name: '🎯 Hasil',     value: `**${result.toUpperCase()}**`,             inline: true },
              { name: win ? '💰 Menang' : '💸 Rugi', value: `**$${bet.toLocaleString()}**`, inline: true },
              { name: '💳 Saldo',     value: `**$${user.balance.toLocaleString()}**`,    inline: true },
              { name: '⏳ Cooldown',  value: `5 detik`,       inline: true },
              { name: '📅 Flip Lagi', value: `<t:${Math.floor((now+newCD)/1000)}:R>`,   inline: true },
            )
            .setFooter({ text: vip ? '👑 VIP: 52% win rate!' : 'Normal win rate: 48%' })
            .setTimestamp()
        ]
      });
    } catch (_) {}
  },
};
