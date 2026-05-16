const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser, isVip } = require('../utils/database');
const { randCD, checkCD, fmtRemaining } = require('../utils/cooldown');

const OWNER_ID = '1213365471693246504';

const JOBS = [
  { job:'Programmer',      emoji:'💻', img:'https://media.giphy.com/media/3oEjI6iBCLz1JSSMNq/giphy.gif', msg:'Kamu menyelesaikan proyek coding besar', pay:[8000,20000] },
  { job:'Chef Bintang 5',  emoji:'👨‍🍳', img:'https://media.giphy.com/media/3oFzmkkwkFyTEkbVM4/giphy.gif', msg:'Restoran mewah membayar gajimu',         pay:[5000,14000] },
  { job:'Dokter Spesialis',emoji:'🩺', img:'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', msg:'Kamu menangani banyak pasien VIP',        pay:[10000,25000] },
  { job:'Arsitek',         emoji:'🏗️', img:'https://media.giphy.com/media/l4FGFEMFEt2sCpDRK/giphy.gif', msg:'Gedung megah selesai dibangun',           pay:[7000,18000] },
  { job:'Pilot',           emoji:'✈️', img:'https://media.giphy.com/media/26BGqfMnHoFmBFTCg/giphy.gif', msg:'Rute internasional selesai diterbangkan', pay:[6000,16000] },
  { job:'Lawyer',          emoji:'⚖️', img:'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', msg:'Kamu memenangkan kasus besar di pengadilan', pay:[12000,30000] },
  { job:'YouTuber',        emoji:'🎬', img:'https://media.giphy.com/media/3o7TKuylMTETn1tMGQ/giphy.gif', msg:'Video kamu viral dan AdSense cair',       pay:[3000,10000] },
  { job:'Trader Saham',    emoji:'📈', img:'https://media.giphy.com/media/xT9IgG50Lg7russbMQ/giphy.gif', msg:'Analisis pasar berhasil, profit besar',   pay:[5000,30000] },
  { job:'Ilmuwan',         emoji:'🔬', img:'https://media.giphy.com/media/3oEjI8tCScU1TXNKEI/giphy.gif', msg:'Grant penelitian cair setelah berhari-hari', pay:[7000,22000] },
  { job:'CEO Perusahaan',  emoji:'🏢', img:'https://media.giphy.com/media/l4FGrYKtP0pBGpBAY/giphy.gif', msg:'Dividen dan gaji bulanan baru saja cair',  pay:[15000,40000] },
];

module.exports = {
  name: 'work',
  aliases: ['kerja','w'],
  description: 'Kerja besar — cd 5–10 hari, gaji $3k–40k',
  async execute(message) {
    const user = getUser(message.author.id);
    const now  = Date.now();
    const vip  = isVip(message.author.id) || message.author.id === OWNER_ID;

    const savedCD = randCD(); // 5 detik
    const { onCD, remaining, resetAt } = checkCD(user.lastWork, savedCD);

    if (onCD) {
      const embed = new EmbedBuilder()
        .setTitle('😴 Masih Istirahat dari Kerja')
        .setColor('#e74c3c')
        .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
        .setImage('https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif')
        .setDescription(`Tubuhmu butuh istirahat setelah kerja keras!\nBisa kerja lagi dalam **${fmtRemaining(remaining)}**`)
        .addFields(
          { name:'📅 Kerja Lagi', value:`<t:${Math.floor(resetAt/1000)}:F>`, inline:true },
          { name:'⏳ Sisa',       value:`<t:${Math.floor(resetAt/1000)}:R>`, inline:true },
        )
        .setFooter({ text:'💡 Gunakan ⚡ Energy Drink (!use energy_drink) untuk skip cooldown!' })
        .setTimestamp();
      return message.reply({ embeds:[embed] });
    }

    const job    = JOBS[Math.floor(Math.random() * JOBS.length)];
    const [mn,mx] = job.pay;
    const base   = Math.floor(Math.random() * (mx-mn+1)) + mn;
    const vipBonus = vip ? Math.floor(base * 0.3) : 0;
    const total  = base + vipBonus;

    const newCD = randCD(); // 5 detik
    user.balance = (user.balance||0) + total;
    user.lastWork = now;
    user.lastWorkCooldown = newCD;
    saveUser(message.author.id, user);

    const embed = new EmbedBuilder()
      .setTitle(`${job.emoji} Selesai Kerja sebagai ${job.job}!`)
      .setColor('#3498db')
      .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
      .setImage(job.img)
      .setDescription(`> ${job.msg} — mendapat bayaran besar!`)
      .addFields(
        { name:'💵 Gaji Dasar',  value:`**$${base.toLocaleString()}**`,          inline:true },
        { name:'👑 Bonus VIP',   value:vipBonus>0?`**+$${vipBonus.toLocaleString()}**`:'`—`', inline:true },
        { name:'💰 Total',       value:`**$${total.toLocaleString()}**`,          inline:true },
        { name:'💳 Saldo Baru',  value:`**$${(user.balance).toLocaleString()}**`, inline:true },
        { name:'⏳ Cooldown',    value:`**5 detik**`,  inline:true },
        { name:'📅 Kerja Lagi',  value:`<t:${Math.floor((now+newCD)/1000)}:R>`,  inline:true },
      )
      .setFooter({ text:vip?'👑 VIP Bonus +30% aktif!':'Beli VIP untuk +30% gaji kerja' })
      .setTimestamp();

    message.reply({ embeds:[embed] });
  },
};
