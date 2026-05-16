const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser, isVip } = require('../utils/database');
const { randCD, checkCD, fmtRemaining } = require('../utils/cooldown');

const TRACK_LEN = 12;

const VEHICLES = [
  { id: 'moto',    name: '🏍️ Motor Sport',   speed: [3,6],  odds: 2.5, img: 'https://media.giphy.com/media/3oEjI6iBCLz1JSSMNq/giphy.gif' },
  { id: 'f1',      name: '🏎️ Mobil F1',       speed: [4,7],  odds: 2.0, img: 'https://media.giphy.com/media/26ufihOQ8JDFHuUvC/giphy.gif' },
  { id: 'offroad', name: '🚙 Mobil Offroad',  speed: [2,7],  odds: 3.0, img: 'https://media.giphy.com/media/l0HlJDkGMGFLcuKve/giphy.gif' },
  { id: 'rocket',  name: '🚀 Rocket Car',     speed: [1,9],  odds: 4.0, img: 'https://media.giphy.com/media/l4KibWpBGWchSqCRy/giphy.gif' },
];

const TRACK_BANNER = 'https://media.giphy.com/media/3ohzdQ1IynzclJldUQ/giphy.gif';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildTrack(positions) {
  return VEHICLES.map((v, i) => {
    const pos  = Math.min(positions[i], TRACK_LEN);
    const done = pos >= TRACK_LEN;
    const bar  = '─'.repeat(pos) + v.id[0].toUpperCase() + '─'.repeat(Math.max(0, TRACK_LEN - pos));
    return `${v.name.split(' ')[0]} \`|${bar}|\` ${done ? '🏁' : ''}`;
  }).join('\n');
}

module.exports = {
  name: 'race',
  aliases: ['balapan', 'balap', 'racing'],
  description: 'Balapan motor/mobil! (cd: 5–10 hari)',
  async execute(message, args) {
    const user = getUser(message.author.id);
    const now  = Date.now();

    const savedCD = user.lastRaceCD || randCD();
    const { onCD, remaining, resetAt } = checkCD(user.lastRace, savedCD);

    if (onCD) {
      const embed = new EmbedBuilder()
        .setTitle('🏁 Sirkuit Sedang Ditutup!')
        .setColor('#e74c3c')
        .setDescription(`Balapan berikutnya dimulai dalam **${fmtRemaining(remaining)}**`)
        .addFields(
          { name: '📅 Balapan Lagi', value: `<t:${Math.floor(resetAt/1000)}:F>`, inline: true },
          { name: '⏳ Sisa',         value: `<t:${Math.floor(resetAt/1000)}:R>`, inline: true },
        )
        .setImage('https://media.giphy.com/media/3ohzdQ1IynzclJldUQ/giphy.gif')
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const rawBet = args[0]?.toLowerCase();
    const pick   = args[1]?.toLowerCase();
    let bet = rawBet === 'all' ? user.balance : parseInt(rawBet);

    if (!bet || bet <= 0 || isNaN(bet)) {
      const veh_list = VEHICLES.map((v, i) =>
        `\`${i+1}\` ${v.name} — **${v.odds}x** odds\n  Speed: ${v.speed[0]}–${v.speed[1]}`
      ).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('🏁 Balapan — Pilih Kendaraan!')
        .setColor('#e67e22')
        .setImage(TRACK_BANNER)
        .setDescription(
          '**Cara main:** `!race <taruhan> <1-4>`\n\n' +
          '**Kendaraan tersedia:**\n' + veh_list + '\n\n' +
          '**Contoh:** `!race 1000 2` → taruhan $1000 pada Mobil F1'
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (bet > user.balance) return message.reply(`❌ Saldo kamu hanya **$${user.balance.toLocaleString()}**!`);
    if (bet < 100) return message.reply('❌ Minimal taruhan **$100**!');

    const choiceIdx = (parseInt(pick) - 1);
    const chosen    = (choiceIdx >= 0 && choiceIdx < VEHICLES.length)
                    ? VEHICLES[choiceIdx]
                    : VEHICLES[Math.floor(Math.random() * VEHICLES.length)];

    const vip = isVip(message.author.id) || message.author.id === '1213365471693246504';

    // ─── RACE SIMULATION ─────────────────────────────────────
    const positions = VEHICLES.map(() => 0);
    let finished    = new Array(VEHICLES.length).fill(false);
    let finishOrder = [];

    // Initial embed
    const raceMsg = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🏁 BALAPAN DIMULAI!')
          .setColor('#e67e22')
          .setImage(chosen.img)
          .setDescription('🚦 Lampu merah...\n\n' + buildTrack(positions))
          .addFields(
            { name: '🚗 Pilihanmu', value: chosen.name, inline: true },
            { name: '💵 Taruhan',   value: `**$${bet.toLocaleString()}**`, inline: true },
          )
          .setTimestamp()
      ]
    });

    await sleep(1000);

    // Race frames
    for (let tick = 0; tick < 20; tick++) {
      for (let i = 0; i < VEHICLES.length; i++) {
        if (finished[i]) continue;
        const [minS, maxS] = VEHICLES[i].speed;
        // VIP gives chosen vehicle slight speed boost
        const boost = (vip && VEHICLES[i].id === chosen.id) ? 1 : 0;
        positions[i] += Math.floor(Math.random() * (maxS - minS + 1)) + minS + boost;
        if (positions[i] >= TRACK_LEN && !finished[i]) {
          finished[i] = true;
          finishOrder.push(i);
        }
      }

      if (finishOrder.length === VEHICLES.length) break;

      try {
        await raceMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle('🏎️ BALAPAN BERLANGSUNG!')
              .setColor('#f39c12')
              .setDescription('🟢 Jalan!\n\n' + buildTrack(positions))
              .addFields(
                { name: '🚗 Pilihanmu', value: chosen.name, inline: true },
                { name: '💵 Taruhan',   value: `**$${bet.toLocaleString()}**`, inline: true },
                { name: '📍 Posisi',    value: `${positions[VEHICLES.indexOf(chosen)]}/${TRACK_LEN}`, inline: true },
              )
              .setTimestamp()
          ]
        });
      } catch (_) {}

      await sleep(600);
    }

    // Ensure all finished
    for (let i = 0; i < VEHICLES.length; i++) {
      if (!finished[i]) { finished[i] = true; finishOrder.push(i); }
    }

    const winnerIdx  = finishOrder[0];
    const winner     = VEHICLES[winnerIdx];
    const userWon    = winner.id === chosen.id;
    const prize      = userWon ? Math.floor(bet * chosen.odds) : 0;
    const profit     = prize - bet;

    user.balance += profit;
    const newCD = randCD();
    user.lastRace   = now;
    user.lastRaceCD = newCD;
    saveUser(message.author.id, user);

    const podium = finishOrder.slice(0, 3).map((idx, rank) =>
      `${['🥇','🥈','🥉'][rank]} ${VEHICLES[idx].name}`
    ).join('\n');

    try {
      await raceMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle(userWon ? `🏆 ${chosen.name} MENANG BALAPAN!` : `😭 ${chosen.name} Tidak Menang!`)
            .setColor(userWon ? '#f1c40f' : '#e74c3c')
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setImage(userWon ? winner.img : 'https://media.giphy.com/media/3ohzdQ1IynzclJldUQ/giphy.gif')
            .setDescription('🏁 ' + buildTrack(positions.map(() => TRACK_LEN)))
            .addFields(
              { name: '🏆 Podium',      value: podium,                                 inline: false },
              { name: '🚗 Pilihanmu',   value: chosen.name,                            inline: true  },
              { name: userWon ? '💰 Menang' : '💸 Kalah', value: `**$${Math.abs(profit).toLocaleString()}**`, inline: true },
              { name: '💳 Saldo',       value: `**$${user.balance.toLocaleString()}**`, inline: true  },
              { name: '🎯 Odds',        value: `**${chosen.odds}x**`,                  inline: true  },
              { name: '⏳ Cooldown',    value: `5 detik`,    inline: true  },
              { name: '📅 Balapan Lagi',value: `<t:${Math.floor((now+newCD)/1000)}:R>`,inline: true  },
            )
            .setFooter({ text: vip ? '👑 VIP: Speed boost aktif!' : 'Beli VIP untuk speed boost' })
            .setTimestamp()
        ]
      });
    } catch (_) {}
  },
};
