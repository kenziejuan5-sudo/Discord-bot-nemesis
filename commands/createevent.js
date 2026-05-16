const { EmbedBuilder } = require('discord.js');
const { addEvent, getActiveEvents } = require('../utils/database');

const OWNER_ID = '1213365471693246504';

module.exports = {
  name: 'createevent',
  aliases: ['newevent','buatevent','event','ev'],
  description: '[OWNER] Buat atau lihat event ekonomi',
  async execute(message, args) {

    // !event list / !event aktif — siapapun bisa lihat
    if (args[0] === 'list' || args[0] === 'aktif') {
      const events = getActiveEvents();
      if (!events.length) {
        const embed = new EmbedBuilder()
          .setTitle('📅 Event Aktif')
          .setColor('#3498db')
          .setImage('https://media.giphy.com/media/3oEjI6iBCLz1JSSMNq/giphy.gif')
          .setDescription('Tidak ada event yang sedang berjalan saat ini.\nNantikan event selanjutnya!')
          .setTimestamp();
        return message.reply({ embeds:[embed] });
      }

      const embed = new EmbedBuilder()
        .setTitle('🎊 Event Sedang Aktif!')
        .setColor('#f1c40f')
        .setImage('https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif')
        .setTimestamp();

      for (const ev of events) {
        const rem = ev.endsAt - Date.now();
        const h   = Math.floor(rem/3600000);
        const m   = Math.floor((rem%3600000)/60000);
        embed.addFields({
          name:`${ev.emoji} ${ev.title}`,
          value:`${ev.description}\n⏳ Berakhir: <t:${Math.floor(ev.endsAt/1000)}:R>\n💰 Reward: **$${(ev.reward||0).toLocaleString()}**`,
          inline:false,
        });
      }
      return message.reply({ embeds:[embed] });
    }

    // Hanya owner yang bisa buat event
    if (message.author.id !== OWNER_ID) {
      return message.reply({ embeds:[
        new EmbedBuilder().setTitle('🚫 Akses Ditolak').setColor('#e74c3c')
          .setDescription('Hanya **Owner** yang bisa membuat event!').setTimestamp()
      ]});
    }

    // Format: !createevent <jam> <emoji> <judul> | <deskripsi> | <reward>
    const fullText = args.join(' ');
    const parts    = fullText.split('|').map(p=>p.trim());

    if (parts.length < 3) {
      const embed = new EmbedBuilder()
        .setTitle('📋 Cara Membuat Event')
        .setColor('#3498db')
        .setDescription(
          '**Format:**\n`!createevent <jam> <emoji> <judul> | <deskripsi> | <reward>`\n\n' +
          '**Contoh:**\n`!createevent 2 🎉 Double Reward | Semua reward double selama 2 jam! | 1000`\n\n' +
          '**Lihat event aktif:** `!event list`'
        )
        .setTimestamp();
      return message.reply({ embeds:[embed] });
    }

    const firstPart   = parts[0].split(' ');
    const durationHrs = parseFloat(firstPart[0]);
    const emoji       = firstPart[1] || '🎉';
    const title       = firstPart.slice(2).join(' ') || 'Event Spesial';

    if (isNaN(durationHrs) || durationHrs <= 0)
      return message.reply('❌ Durasi harus angka positif! Contoh: `2` untuk 2 jam');

    const description = parts[1] || 'Event spesial sedang berlangsung!';
    const reward      = parseInt(parts[2]) || 0;

    const eventData = {
      id: Date.now().toString(), title, description, emoji, reward,
      createdAt: Date.now(), endsAt: Date.now() + durationHrs*3600000,
      createdBy: message.author.id,
    };
    addEvent(eventData);

    const confirmEmbed = new EmbedBuilder()
      .setTitle(`✅ Event "${title}" Dibuat!`)
      .setColor('#2ecc71')
      .setThumbnail(message.author.displayAvatarURL({dynamic:true}))
      .addFields(
        { name:'📌 Judul',      value:`**${title}**`,                                   inline:true },
        { name:'⏱️ Durasi',     value:`**${durationHrs} jam**`,                         inline:true },
        { name:'💰 Reward',     value:`**$${reward.toLocaleString()}**`,                 inline:true },
        { name:'📝 Deskripsi',  value:description,                                      inline:false },
        { name:'⏳ Berakhir',   value:`<t:${Math.floor(eventData.endsAt/1000)}:R>`,      inline:true },
      )
      .setFooter({text:'Pengumuman dikirim ke channel ini'})
      .setTimestamp();
    message.reply({ embeds:[confirmEmbed] });

    // Announce
    const announceEmbed = new EmbedBuilder()
      .setTitle(`🎊 EVENT BARU DIMULAI!`)
      .setColor('#f1c40f')
      .setImage('https://media.giphy.com/media/xT9IgqCBFkpBZMwnEI/giphy.gif')
      .setDescription(`## ${emoji} ${title}\n\n${description}`)
      .addFields(
        { name:'💰 Reward',   value:`**$${reward.toLocaleString()}**`,            inline:true },
        { name:'⏳ Berakhir', value:`<t:${Math.floor(eventData.endsAt/1000)}:R>`, inline:true },
      )
      .setFooter({text:'Ketik !event list untuk cek semua event aktif'})
      .setTimestamp();

    message.channel.send({ content:'@everyone 🎉 **EVENT BARU!**', embeds:[announceEmbed] });
  },
};
