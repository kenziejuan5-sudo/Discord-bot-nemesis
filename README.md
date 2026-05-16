# 🎮 Discord Economy Bot v2.0

Bot ekonomi Discord paling lengkap — Hunt, Zoo, Gambling animasi, VIP, Admin, dan 40+ command!

---

## 📁 Struktur File

```
discord-economy-bot/
├── index.js              ← Entry point, status cycling, anti-crash
├── package.json
├── .env.example
├── commands/
│   ├── balance.js        ← !balance
│   ├── profile.js        ← !profile
│   ├── daily.js          ← !daily (7 hari)
│   ├── work.js           ← !work (5-10 hari, $3k-40k)
│   ├── leaderboard.js    ← !lb [zoo/net]
│   ├── bank.js           ← !bank deposit/withdraw/transfer
│   ├── hunt.js           ← !hunt (5-10 hari, animasi)
│   ├── zoo.js            ← !zoo
│   ├── huntinfo.js       ← !huntinfo [id]
│   ├── sell.js           ← !sell
│   ├── fish.js           ← !fish (5-10 hari)
│   ├── shop.js           ← !shop (VIP diskon 10%)
│   ├── inventory.js      ← !inventory
│   ├── use.js            ← !use (animasi!)
│   ├── slots.js          ← !slots ANIMASI BERPUTAR
│   ├── blackjack.js      ← !blackjack tombol HIT/STAND
│   ├── coinflip.js       ← !coinflip animasi koin
│   ├── race.js           ← !race animasi trek balap
│   ├── rob.js            ← !rob (5-10 hari)
│   ├── admin.js          ← !admin panel
│   ├── roles.js          ← 10 cmd: addadmin/vip/warn/kick
│   ├── vipuser.js        ← 10 cmd: spin/duel/achievements/dll
│   ├── createevent.js    ← !createevent / !event list
│   ├── givemoney.js      ← !givemoney [OWNER]
│   ├── takemoney.js      ← !takemoney [OWNER]
│   └── help.js           ← !help menu interaktif tombol
├── utils/
│   ├── database.js       ← JSON DB + roles + VIP system
│   ├── animals.js        ← 14 hewan + foto nyata
│   └── cooldown.js       ← randCD, checkCD, fmtRemaining
└── data/                 ← Auto-dibuat
    ├── economy.json
    ├── roles.json
    ├── events.json
    └── warnings.json
```

---

## 🚀 Setup (5 Menit)

### 1. Install Node.js v18+
https://nodejs.org

### 2. Install Dependencies
```bash
cd discord-economy-bot
npm install
```

### 3. Buat Bot Discord
1. https://discord.com/developers/applications → New Application
2. Tab **Bot** → Add Bot → Reset Token → **Copy token**
3. Aktifkan: ✅ Message Content Intent ✅ Server Members Intent
4. **OAuth2 → URL Generator** → scope `bot` → permission:
   - Send Messages, Embed Links, Read Message History
   - Use External Emojis, Mention Everyone
5. Buka URL → invite bot ke server

### 4. Config
```bash
cp .env.example .env
# Edit .env → isi TOKEN=token_botmu
```

### 5. Jalankan
```bash
npm start        # Normal
npm run dev      # Development (auto-restart)
```

---

## 📋 Semua Command

### 💰 Ekonomi
```
!balance [@user]      → Saldo + rank + progress bar
!profile [@user]      → Profil lengkap + semua cooldown
!net [@user]          → Net worth detail
!daily                → Reward 7 hari, $2k-5k + streak bonus
!work                 → Kerja 5-10 hari, $3k-40k + VIP +30%
!leaderboard [zoo/net]→ Top 10 server
!cooldowns            → Semua CD aktif sekaligus
!serverinfo           → Statistik ekonomi server
!achievements         → 10 badge pencapaian
```

### 🏦 Bank
```
!bank                          → Menu bank
!bank deposit <jml|all>        → Setor
!bank withdraw <jml|all>       → Tarik
!bank transfer @user <jml>     → Transfer (5% pajak, VIP 0%)
```

### 🏹 Hunt & Zoo
```
!hunt                 → Berburu hewan, CD 5-10 hari (14 jenis)
!zoo [@user]          → Koleksi hewan dikelompok per rarity
!huntinfo [id]        → Bestiary + foto semua hewan
!sell <id> [all]      → Jual hewan
!topzoo               → Leaderboard kolektor terbanyak
!gift @user <id>      → Hadiahkan hewan + DM notif
!fish                 → Mancing, CD 5-10 hari (butuh joran+umpan)
```

### 🎲 Gambling (semua CD 5-10 hari)
```
!slots <jml>          → 🎰 ANIMASI berputar! Max jackpot 50x
!blackjack <jml>      → 🃏 Interaktif tombol HIT/STAND. BJ=2.5x
!coinflip <jml> [h/t] → 🪙 Animasi koin + pilih sisi
!race <jml> <1-4>     → 🏁 Animasi trek! Motor/F1/Offroad/Rocket
!spin                 → 🎡 Roda keberuntungan gratis
!rob @user            → 🦹 Rampok 40% sukses, gagal denda 30%
!duel @user <jml>     → ⚔️ Adu dice, pemenang ambil semua
```

### 🛍️ Shop
```
!shop                 → Toko (VIP diskon 10%)
!shop buy <id>        → Beli item
!shop sell <id>       → Jual 50% harga
!shop info <id>       → Detail + foto item
!inventory [@user]    → Lihat inventory + nilai
!use <id>             → Pakai item (ada animasi!)
```

Item: `fishing_rod`(500) `hunting_rifle`(2000) `lucky_charm`(1500)
      `treasure_map`(800) `vip_pass`(8000) `bait`(100)
      `energy_drink`(3000) `robbery_mask`(2500)

### 👥 VIP & Sosial
```
!pay @user <jml>      → Transfer 0% pajak [VIP only]
!boostdaily           → Bonus daily $3k-8k/minggu [VIP only]
!vipinfo [@user]      → Status + sisa durasi VIP
!event list           → Event aktif server
```

### 🛡️ Admin (diangkat Owner)
```
!addvip @user <hari>          → Beri VIP
!removevip @user              → Cabut VIP
!viplist                      → Daftar VIP aktif
!adminwarn @user [alasan]     → Beri peringatan (3+=denda otomatis)
!adminwarnlist @user          → Riwayat peringatan
!adminkick @user [alasan]     → Hukuman ekonomi (saldo -50%)
!admin setbal @user <jml>     → Set saldo
!admin setbank @user <jml>    → Set bank
!admin reset @user            → Reset semua data
!admin giveitem @user <id>    → Beri item gratis
!admin giveanimal @user <id>  → Beri hewan gratis
!admin resetcd @user [type]   → Reset cooldown
!admin stats                  → Statistik server
```

### 👑 Owner Only (ID: 1213365471693246504)
```
!addadmin @user               → Angkat admin
!removeadmin @user            → Pecat admin
!adminlist                    → Daftar admin
!givemoney @user <jml>        → Tambah uang
!takemoney @user <jml>        → Kurangi uang
!createevent <jam> <emoji> <judul> | <desc> | <reward>
```

---

## 🦁 14 Hewan Hunt

| Rarity    | Hewan                           | Nilai         |
|-----------|---------------------------------|---------------|
| ⚪ Common   | Kelinci, Tupai, Rusa, Rubah    | $120–$250    |
| 🟢 Uncommon| Serigala, Beruang, Elang       | $500–$600    |
| 🔵 Rare    | Singa, Harimau, Panda          | $1,200–$1,500|
| 🟣 Epic    | Naga, Unicorn                   | $5,000–$6,000|
| 🔴 Legendary| Phoenix, Kraken               | $15,000–$20,000|

---

## 🎰 Payout Gambling

**Slots:** 7️⃣x3=50x · 💎x3=20x · ⭐x3=10x · 🍇x3=5x · 🍊x3=4x · dll
**Blackjack:** Menang=2x · Blackjack=2.5x
**Race:** Motor=2.5x · F1=2.0x · Offroad=3.0x · Rocket=4.0x

---

## 🌟 Keuntungan VIP

- 💰 Work & Daily **+30% bonus**
- 🏹 Hunt catch rate **+20%**
- 🎰 Slots taruhan **+20%**
- 🪙 Coinflip win rate **52%** (normal 48%)
- 🏁 Race speed **boost**
- 💸 Transfer pajak **0%** (normal 5%)
- 🛍️ Shop diskon **10%**
- Akses `!pay` dan `!boostdaily`

---

## ☁️ Hosting Gratis Terbaik

| Platform | Rating | Notes |
|----------|--------|-------|
| **Railway.app** | ⭐⭐⭐⭐⭐ | Deploy dari GitHub, paling mudah, $5 credit/bulan |
| **Render.com** | ⭐⭐⭐⭐ | Free tier, bisa sleep jika tidak aktif |
| **Koyeb.com** | ⭐⭐⭐⭐ | 2 service gratis, performa bagus |
| **Fly.io** | ⭐⭐⭐ | Powerful, butuh CLI |
| **Oracle Cloud** | ⭐⭐⭐⭐⭐ | Gratis selamanya, setup lebih rumit |

---

*Economy Bot v2.0 — Discord.js v14 | Node.js 18+*
