const fs = require('fs');
const path = require('path');

const DB_PATH    = path.join(__dirname, '..', 'data', 'economy.json');
const EVENTS_PATH= path.join(__dirname, '..', 'data', 'events.json');
const ROLES_PATH = path.join(__dirname, '..', 'data', 'roles.json');

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── USER ECONOMY ───────────────────────────────────────────────
function loadDB() {
  ensureDir();
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  ensureDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getUser(userId) {
  const db = loadDB();
  if (!db[userId]) {
    db[userId] = {
      balance: 0, bank: 0, animals: [],
      lastDaily: null, lastHunt: null, lastWork: null,
    };
    saveDB(db);
  }
  return db[userId];
}

function saveUser(userId, userData) {
  const db = loadDB();
  db[userId] = userData;
  saveDB(db);
}

function addMoney(userId, amount) {
  const user = getUser(userId);
  user.balance += amount;
  saveUser(userId, user);
  return user;
}

function removeMoney(userId, amount) {
  const user = getUser(userId);
  if (user.balance < amount) return null;
  user.balance -= amount;
  saveUser(userId, user);
  return user;
}

// ─── ROLES (admin / vip) ────────────────────────────────────────
function loadRoles() {
  ensureDir();
  if (!fs.existsSync(ROLES_PATH)) fs.writeFileSync(ROLES_PATH, JSON.stringify({ admins: [], vips: [] }));
  return JSON.parse(fs.readFileSync(ROLES_PATH));
}

function saveRoles(data) {
  ensureDir();
  fs.writeFileSync(ROLES_PATH, JSON.stringify(data, null, 2));
}

function isAdmin(userId, ownerId) {
  if (userId === ownerId) return true;
  return loadRoles().admins.includes(userId);
}

function isVip(userId) {
  const roles = loadRoles();
  const entry = roles.vips.find(v => v.id === userId);
  if (!entry) return false;
  if (entry.until && Date.now() > entry.until) {
    // expired — auto remove
    roles.vips = roles.vips.filter(v => v.id !== userId);
    saveRoles(roles);
    return false;
  }
  return true;
}

function addAdmin(userId) {
  const roles = loadRoles();
  if (!roles.admins.includes(userId)) { roles.admins.push(userId); saveRoles(roles); }
}

function removeAdmin(userId) {
  const roles = loadRoles();
  roles.admins = roles.admins.filter(id => id !== userId);
  saveRoles(roles);
}

function addVip(userId, durationMs) {
  const roles = loadRoles();
  const until = Date.now() + durationMs;
  const idx = roles.vips.findIndex(v => v.id === userId);
  if (idx >= 0) roles.vips[idx].until = Math.max(roles.vips[idx].until || 0, until);
  else roles.vips.push({ id: userId, since: Date.now(), until });
  saveRoles(roles);
  return until;
}

function removeVip(userId) {
  const roles = loadRoles();
  roles.vips = roles.vips.filter(v => v.id !== userId);
  saveRoles(roles);
}

function getVipInfo(userId) {
  return loadRoles().vips.find(v => v.id === userId) || null;
}

function getAdminList() { return loadRoles().admins; }
function getVipList()   { return loadRoles().vips; }

// ─── EVENTS ─────────────────────────────────────────────────────
function loadEvents() {
  ensureDir();
  if (!fs.existsSync(EVENTS_PATH)) fs.writeFileSync(EVENTS_PATH, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(EVENTS_PATH));
}

function saveEvents(data) {
  ensureDir();
  fs.writeFileSync(EVENTS_PATH, JSON.stringify(data, null, 2));
}

function addEvent(eventData) {
  const events = loadEvents();
  events.push(eventData);
  saveEvents(events);
}

function getActiveEvents() {
  const events = loadEvents();
  const now = Date.now();
  return events.filter(e => e.endsAt > now);
}

module.exports = {
  getUser, saveUser, addMoney, removeMoney, loadDB, saveDB,
  addEvent, getActiveEvents,
  isAdmin, isVip,
  addAdmin, removeAdmin, addVip, removeVip, getVipInfo,
  getAdminList, getVipList,
};
