const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, saveUser, isVip } = require('../utils/database');
const { randCD, checkCD, fmtRemaining } = require('../utils/cooldown');

const SUITS  = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function makeDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const val of VALUES)
      deck.push({ suit, val });
  return deck.sort(() => Math.random() - 0.5);
}

function cardVal(card) {
  if (['J','Q','K'].includes(card.val)) return 10;
  if (card.val === 'A') return 11;
  return parseInt(card.val);
}

function handValue(hand) {
  let total = hand.reduce((s, c) => s + cardVal(c), 0);
  let aces  = hand.filter(c => c.val === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function cardStr(card) { return `\`${card.val}${card.suit}\``; }
function handStr(hand) { return hand.map(cardStr).join(' '); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const ACTIVE_GAMES = new Map();

module.exports = {
  name: 'blackjack',
  aliases: ['bj', '21'],
  description: 'Main Blackjack! (cd: 5–10 hari)',
  async execute(message, args) {
    const user = getUser(message.author.id);
    const now  = Date.now();

    if (ACTIVE_GAMES.has(message.author.id))
      return message.reply('⚠️ Kamu sedang dalam game Blackjack! Selesaikan dulu.');

    const savedCD = user.lastBJCD || randCD();
    const { onCD, remaining, resetAt } = checkCD(user.lastBJ, savedCD);

    if (onCD) {
      const embed = new EmbedBuilder()
        .setTitle('🃏 Meja Blackjack Penuh!')
        .setColor('#2c3e50')
        .setDescription(`Kamu baru saja main! Tunggu **${fmtRemaining(remaining)}** lagi.`)
        .addFields(
          { name: '📅 Bisa Main Lagi', value: `<t:${Math.floor(resetAt/1000)}:F>`, inline: true },
          { name: '⏳ Sisa',           value: `<t:${Math.floor(resetAt/1000)}:R>`, inline: true },
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const rawAmount = args[0]?.toLowerCase();
    let bet = rawAmount === 'all' ? user.balance : parseInt(rawAmount);

    if (!bet || bet <= 0 || isNaN(bet)) {
      const embed = new EmbedBuilder()
        .setTitle('🃏 Blackjack')
        .setColor('#2c3e50')
        .setImage('https://media.giphy.com/media/3oEjI8tCScU1TXNKEI/giphy.gif')
        .setDescription(
          '**Cara main:** `!blackjack <jumlah|all>`\n\n' +
          '🎯 **Tujuan:** Capai 21 atau lebih dekat dari dealer tanpa bust!\n\n' +
          '**Aturan:**\n• Hit — ambil kartu lagi\n• Stand — berhenti\n• Bust (>21) = kalah\n' +
          '• Blackjack (A+10/J/Q/K) = menang **2.5x**!\n• Menang biasa = **2x**'
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (bet > user.balance) return message.reply(`❌ Saldo kamu hanya **$${user.balance.toLocaleString()}**!`);
    if (bet < 100) return message.reply('❌ Minimal taruhan **$100**!');

    const vip  = isVip(message.author.id) || message.author.id === '1213365471693246504';
    const deck = makeDeck();

    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    ACTIVE_GAMES.set(message.author.id, { deck, playerHand, dealerHand, bet });

    function buildEmbed(phase = 'playing') {
      const pVal = handValue(playerHand);
      const dVal = handValue(dealerHand);
      const hideDealer = phase === 'playing';

      const embed = new EmbedBuilder()
        .setColor(phase === 'win' ? '#2ecc71' : phase === 'lose' ? '#e74c3c' : phase === 'draw' ? '#f39c12' : '#2c3e50')
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .addFields(
          {
            name: `🎴 Dealer ${hideDealer ? `(${cardVal(dealerHand[0])})` : `(${dVal})`}`,
            value: hideDealer ? `${cardStr(dealerHand[0])} \`🂠\`` : handStr(dealerHand),
            inline: false,
          },
          {
            name: `🃏 Kamu (${pVal})`,
            value: handStr(playerHand),
            inline: false,
          },
          { name: '💵 Taruhan', value: `**$${bet.toLocaleString()}**`, inline: true },
          { name: '💳 Saldo',   value: `**$${user.balance.toLocaleString()}**`, inline: true },
        );

      if (phase === 'playing') {
        embed.setTitle('🃏 Blackjack — Giliranmu!');
        embed.setDescription('Pilih aksi di bawah ini:');
      } else if (phase === 'win') {
        embed.setTitle('🎉 MENANG!');
      } else if (phase === 'lose') {
        embed.setTitle('😭 KALAH!');
      } else if (phase === 'draw') {
        embed.setTitle('🤝 SERI!');
      } else if (phase === 'blackjack') {
        embed.setTitle('🌟 BLACKJACK!!!');
        embed.setColor('#f1c40f');
      } else if (phase === 'bust') {
        embed.setTitle('💥 BUST! Kamu melebihi 21!');
        embed.setColor('#e74c3c');
      }

      return embed;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('bj_hit').setLabel('🃏 HIT').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('bj_stand').setLabel('✋ STAND').setStyle(ButtonStyle.Secondary),
    );

    // Check natural blackjack
    const pVal = handValue(playerHand);
    if (pVal === 21) {
      const prize = Math.floor(bet * 2.5);
      user.balance += prize - bet;
      const newCD = randCD();
      user.lastBJ   = now; user.lastBJCD = newCD;
      saveUser(message.author.id, user);
      ACTIVE_GAMES.delete(message.author.id);

      const embed = buildEmbed('blackjack');
      embed.addFields(
        { name: '🌟 BLACKJACK BONUS', value: `**$${prize.toLocaleString()}** (2.5x)!`, inline: true },
        { name: '💳 Saldo Baru',      value: `**$${user.balance.toLocaleString()}**`,   inline: true },
        { name: '⏳ Cooldown',        value: `5 detik`,       inline: true },
      );
      return message.reply({ embeds: [embed] });
    }

    const gameMsg = await message.reply({ embeds: [buildEmbed('playing')], components: [row] });

    const collector = gameMsg.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 60000,
    });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate();
      const game = ACTIVE_GAMES.get(message.author.id);
      if (!game) return;

      if (interaction.customId === 'bj_hit') {
        game.playerHand.push(game.deck.pop());
        const pv = handValue(game.playerHand);

        if (pv > 21) {
          // BUST
          user.balance -= bet;
          const newCD = randCD();
          user.lastBJ = now; user.lastBJCD = newCD;
          saveUser(message.author.id, user);
          ACTIVE_GAMES.delete(message.author.id);

          const embed = buildEmbed('bust');
          embed.addFields(
            { name: '💸 Kehilangan',  value: `**$${bet.toLocaleString()}**`,          inline: true },
            { name: '💳 Saldo Baru',  value: `**$${user.balance.toLocaleString()}**`, inline: true },
            { name: '⏳ Cooldown',    value: `5 detik`,    inline: true },
          );
          return gameMsg.edit({ embeds: [embed], components: [] });
        }

        if (pv === 21) collector.stop('stand');
        else await gameMsg.edit({ embeds: [buildEmbed('playing')], components: [row] });

      } else if (interaction.customId === 'bj_stand') {
        collector.stop('stand');
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        ACTIVE_GAMES.delete(message.author.id);
        return gameMsg.edit({ embeds: [buildEmbed('lose').setDescription('⏱️ Waktu habis! Taruhan hangus.')], components: [] });
      }

      const game = ACTIVE_GAMES.get(message.author.id);
      if (!game) return;
      ACTIVE_GAMES.delete(message.author.id);

      // Dealer plays
      while (handValue(game.dealerHand) < 17) game.dealerHand.push(game.deck.pop());

      const pv = handValue(game.playerHand);
      const dv = handValue(game.dealerHand);

      let phase, profit;
      if (dv > 21 || pv > dv)       { phase = 'win';  profit =  bet; }
      else if (pv === dv)            { phase = 'draw'; profit =  0;  }
      else                           { phase = 'lose'; profit = -bet; }

      user.balance += profit;
      const newCD = randCD();
      user.lastBJ   = now; user.lastBJCD = newCD;
      saveUser(message.author.id, user);

      const resultText = phase === 'win'  ? `🎉 Kamu menang **$${bet.toLocaleString()}**!`
                       : phase === 'draw' ? '🤝 Seri! Taruhanmu dikembalikan.'
                       :                   `😭 Kamu kalah **$${bet.toLocaleString()}**!`;

      const embed = buildEmbed(phase);
      embed.setDescription(resultText);
      embed.addFields(
        { name: phase === 'win' ? '💰 Menang' : phase === 'draw' ? '↩️ Kembali' : '💸 Kalah',
          value: `**$${bet.toLocaleString()}**`, inline: true },
        { name: '💳 Saldo', value: `**$${user.balance.toLocaleString()}**`, inline: true },
        { name: '⏳ Cooldown', value: `5 detik`, inline: true },
        { name: '📅 Main Lagi', value: `<t:${Math.floor((now+newCD)/1000)}:R>`, inline: true },
      );

      await gameMsg.edit({ embeds: [embed], components: [] });
    });
  },
};
