// utils/cooldown.js — v5.0
// daily    = 24 jam (tetap)
// semua lainnya = 5 detik flat

function randCD() {
  return 5000; // 5 detik
}

function fmtRemaining(ms) {
  if (ms < 1000) return 'kurang dari 1 detik';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} detik`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m} menit ${rem} detik`;
}

function checkCD(lastTimestamp, cooldownMs) {
  if (!lastTimestamp) return { onCD: false, remaining: 0, resetAt: 0 };
  const remaining = cooldownMs - (Date.now() - lastTimestamp);
  if (remaining <= 0) return { onCD: false, remaining: 0, resetAt: 0 };
  return { onCD: true, remaining, resetAt: lastTimestamp + cooldownMs };
}

module.exports = { randCD, fmtRemaining, checkCD };
