// Googly Seek — lobby + round server. Up to 8 googlies per lobby (players + computer players).
// The server owns roles, timers, tags, coins and the computer players; browsers move themselves and draw everything.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { MAPS, ROOM, LOBBY } from './public/js/maps.js';
import * as S from './public/js/sim.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8000);
const MAX = 8, TICK = 1 / 30, END_SEC = Number(process.env.END_SEC || 11), SQUEAK_EVERY = 30;

// ---------------------------------------------------------------- static files
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/health') { res.writeHead(200); return res.end('ok'); }
  const file = url.startsWith('/three/addons/') ? path.join(ROOT, 'node_modules/three/examples/jsm', path.normalize(url.slice(14)))
    : url.startsWith('/three/') ? path.join(ROOT, 'node_modules/three/build', path.basename(url))
    : path.join(ROOT, 'public', path.normalize(url === '/' ? 'index.html' : url));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ---------------------------------------------------------------- shared helpers
const BOTS = [['RICK', '#e8452c'], ['GUS', '#8a5a2b'], ['SUNNY', '#ffc53a'], ['VIOLET', '#9b59ff'], ['PICKLE', '#7bd13b'], ['DOTTIE', '#ff6fb5'], ['NOODLE', '#f2e2b8'], ['BLOBBY', '#3ad0ff']];
const BOT_LOOK = [['none', 'pup'], ['polka', 'none'], ['none', 'duck'], ['zebra', 'kitty'], ['camo', 'none'], ['none', 'bunny'], ['cookie', 'rock'], ['none', 'slime']];
// computer players: view = how far a seeker spots you, alarm = how close a seeker gets before a hider runs
const DIFF = [
  { name: 'Easy', view: 11, react: 0.9, speed: 0.9, alarm: 4.5, sense: 1.5, hear: 0.3, taunt: 1 / 35, smart: 0, cone: 0.9 },
  { name: 'Normal', view: 17, react: 0.45, speed: 0.97, alarm: 7, sense: 2.1, hear: 0.65, taunt: 1 / 90, smart: 0.55, cone: 1.1 },
  { name: 'Hard', view: 25, react: 0.22, speed: 1.03, alarm: 9.5, sense: 2.7, hear: 1, taunt: 1 / 400, smart: 1, cone: 1.3 },
];
const NAV = MAPS.map(m => S.buildNav(m));
const rooms = new Map();
let nextId = 1;
const clean = (s, n) => String(s ?? '').replace(/[<>&"]/g, '').trim().slice(0, n);
const r2 = v => Math.round(v * 100) / 100;
const now = () => performance.now() / 1000;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const angDiff = (a, b) => ((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
const yawTo = (dx, dz) => Math.atan2(-dx, -dz);

function send(ws, m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }
function bcast(room, m) { const s = JSON.stringify(m); for (const p of room.players.values()) if (p.ws && p.ws.readyState === 1) p.ws.send(s); }
function code() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let c; do { c = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join(''); } while (rooms.has(c)); return c; }

function newEntity(o) {
  return {
    id: nextId++, name: 'GOOGLY', color: '#9b59ff', skin: 'none', pet: 'none', bot: false, ws: null,
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, crouch: false, onGround: true,
    seeker: false, orig: false, tags: 0, caughtAt: -1, caughtBy: 0, taunts: 0, lastTaunt: -9, seekTurns: 0, lastTag: 0, reachT: 0,
    rtt: 0.1, ...o,
  };
}

// ---------------------------------------------------------------- rooms
function makeRoom(opts = {}) {
  const r = {
    code: code(), public: !!opts.public, name: clean(opts.name, 24), hostId: 0, players: new Map(),
    settings: { cpus: 3, diff: 1, hide: 30, seek: 180, seekers: 0, ...(opts.settings || {}) },
    state: 'lobby', t: 0, seekT: 0, squeakT: SQUEAK_EVERY, solo: !!opts.solo, role: opts.role || 'random', snapAcc: 0, round: 0, sounds: [], winner: null,
  };
  rooms.set(r.code, r);
  syncBots(r);
  return r;
}
const humans = r => [...r.players.values()].filter(p => !p.bot);
const hidersOf = r => [...r.players.values()].filter(p => !p.seeker);
const seekersOf = r => [...r.players.values()].filter(p => p.seeker);
const mapOf = r => MAPS[r.state === 'lobby' ? LOBBY : ROOM];
const navOf = r => NAV[r.state === 'lobby' ? LOBBY : ROOM];
function syncBots(r) {
  const s = r.settings;
  const want = Math.max(0, Math.min(s.cpus, MAX - humans(r).length));
  const bots = [...r.players.values()].filter(p => p.bot);
  while (bots.length > want) { const b = bots.pop(); r.players.delete(b.id); bcast(r, { t: 'gone', id: b.id }); }
  const used = new Set(bots.map(b => b.name));
  for (let i = 0; i < BOTS.length && bots.length < want; i++) {
    const [name, color] = BOTS[i];
    if (used.has(name)) continue;
    const [skin, pet] = BOT_LOOK[i];
    const b = newEntity({ name, color, skin, pet, bot: true, brain: newBrain() });
    r.players.set(b.id, b); bots.push(b);
    if (r.state === 'hide' || r.state === 'seek') b.seeker = true;       // late CPUs join the seekers
    place(r, b);
    bcast(r, { t: 'join', p: fullPlayer(r, b) });
  }
  for (const b of bots) { b.diff = s.diff; b.speedMul = DIFF[s.diff].speed; }
}
function pubPlayer(r, p) { return { id: p.id, name: p.name, color: p.color, skin: p.skin, pet: p.pet, bot: p.bot, host: r.hostId === p.id, seeker: p.seeker }; }
const fullPlayer = (r, p) => ({ ...pubPlayer(r, p), x: r2(p.x), y: r2(p.y), z: r2(p.z), yaw: r2(p.yaw) });
function roomInfo(r) {
  return { code: r.code, public: r.public, name: r.name, host: r.hostId, state: r.state, settings: r.settings, solo: r.solo, players: [...r.players.values()].map(p => pubPlayer(r, p)) };
}
function pushLobby(r) { bcast(r, { t: 'room', room: roomInfo(r) }); }
function worldMsg(r) {
  return { t: 'world', map: r.state === 'lobby' ? LOBBY : ROOM, state: r.state, time: r.t, settings: r.settings, round: r.round, players: [...r.players.values()].map(p => fullPlayer(r, p)) };
}
function listRooms() {
  return [...rooms.values()].filter(r => r.public && humans(r).length > 0).map(r => ({
    code: r.code, name: r.name || (humans(r)[0]?.name + "'s lobby"), humans: humans(r).length, total: r.players.size, state: r.state, diff: DIFF[r.settings.diff].name,
  }));
}
function leave(p) {
  const r = p.room; if (!r) return;
  r.players.delete(p.id); p.room = null;
  bcast(r, { t: 'gone', id: p.id });
  if (!humans(r).length) { rooms.delete(r.code); return; }
  if (r.hostId === p.id) r.hostId = humans(r)[0].id;
  syncBots(r);
  sys(r, `${p.name} left`);
  pushLobby(r);
  checkRound(r);
}
function join(p, r) {
  if (p.room) leave(p);
  if (humans(r).length >= MAX) return send(p.ws, { t: 'err', msg: 'That lobby is full (8 googlies).' });
  p.room = r; r.players.set(p.id, p);
  if (!r.hostId || !r.players.has(r.hostId)) r.hostId = p.id;
  Object.assign(p, { seeker: r.state === 'hide' || r.state === 'seek', orig: false, tags: 0, caughtAt: -1, taunts: 0 });
  syncBots(r);
  place(r, p);
  send(p.ws, { t: 'joined', code: r.code });
  send(p.ws, worldMsg(r));
  bcast(r, { t: 'join', p: fullPlayer(r, p) });
  pushLobby(r);
  sys(r, r.state === 'lobby' ? `${p.name} joined` : `${p.name} joined — they're helping the seekers this round`);
}
function sys(r, text) { bcast(r, { t: 'chat', sys: true, text }); }

// ---------------------------------------------------------------- where everyone stands
function place(r, p) {
  const map = mapOf(r);
  const others = [...r.players.values()].filter(q => q !== p);
  let pt;
  if (r.state === 'lobby') {
    let best = null, bd = -1;
    for (const [x, z] of map.spawns) { const d = others.length ? Math.min(...others.map(q => Math.hypot(q.x - x, q.z - z))) : Math.random(); if (d + Math.random() > bd) { bd = d + Math.random(); best = [x, z]; } }
    pt = best; p.yaw = yawTo(-pt[0], -pt[1]);
  } else if (p.seeker) {
    const used = others.filter(q => q.seeker).length % map.seekSpots.length;
    pt = map.seekSpots[used]; p.yaw = Math.PI;          // nose to the wall, counting
  } else {
    pt = map.spawns[Math.floor(Math.random() * map.spawns.length)];
    pt = [pt[0] + (Math.random() - 0.5) * 0.8, pt[1] + (Math.random() - 0.5) * 0.8]; p.yaw = Math.random() * 6.28;
  }
  Object.assign(p, { x: pt[0], y: S.groundAt(map, pt[0], pt[1], S.PR, 20), z: pt[1], vx: 0, vy: 0, vz: 0, crouch: false, onGround: true });
  if (p.brain) p.brain = newBrain();
}
function startRound(r) {
  const all = [...r.players.values()];
  if (all.length < 2) { send(r.players.get(r.hostId)?.ws, { t: 'err', msg: 'You need at least 2 googlies — add a CPU or invite a friend.' }); return; }
  r.round++;
  const n = Math.min(all.length - 1, r.settings.seekers || (all.length >= 6 ? 2 : 1));
  let pool = shuffle(all.slice()).sort((a, b) => a.seekTurns - b.seekTurns);
  if (r.solo && r.role === 'seek') pool = [...humans(r), ...pool.filter(p => p.bot)];
  if (r.solo && r.role === 'hide') pool = [...pool.filter(p => p.bot), ...humans(r)];
  const seekers = new Set(pool.slice(0, n));
  for (const p of all) Object.assign(p, { seeker: seekers.has(p), orig: seekers.has(p), tags: 0, caughtAt: -1, caughtBy: 0, taunts: 0, lastTaunt: -9, reachT: 0 });
  for (const p of seekers) p.seekTurns++;
  r.state = 'hide'; r.t = r.settings.hide; r.seekT = 0; r.squeakT = SQUEAK_EVERY; r.sounds = []; r.winner = null;
  for (const p of all) place(r, p);
  bcast(r, worldMsg(r));
  pushLobby(r);
  const names = [...seekers].map(p => p.name).join(' and ');
  sys(r, `${names} ${seekers.size > 1 ? 'are' : 'is'} seeking. Everyone else: HIDE!`);
}
function beginSeek(r) {
  r.state = 'seek'; r.t = r.settings.seek; r.seekT = 0;
  for (const p of seekersOf(r)) if (p.brain) { p.brain.lookT = 1.2; p.brain.lookDir = Math.random() < 0.5 ? -1 : 1; }   // open eyes, turn round, look about
  bcast(r, { t: 'phase', state: 'seek', time: r.t });
  pushLobby(r);
}
function checkRound(r) {
  if (r.state !== 'hide' && r.state !== 'seek') return;
  if (!hidersOf(r).length) endRound(r, 'seekers');
  else if (!seekersOf(r).length) endRound(r, 'hiders');
}
function coinsFor(p, winner) {
  const items = [['Played a round', 10]];
  if (!p.orig && p.caughtAt < 0) items.push(['Never found — hiders win!', 100]);
  else if (!p.orig && p.caughtAt > 0) { const c = Math.min(40, Math.floor(p.caughtAt / 10) * 4); if (c) items.push([`Stayed hidden ${Math.round(p.caughtAt)} s`, c]); }
  if (winner === 'seekers') items.push(p.orig ? ['Seekers win!', 100] : ['Helped the seekers win', 30]);
  if (p.tags) items.push([`Found ${p.tags} hider${p.tags > 1 ? 's' : ''}`, p.tags * 20]);
  if (p.taunts) items.push([`Taunted ${p.taunts}×`, p.taunts * 5]);
  return items;
}
function endRound(r, winner) {
  if (r.state !== 'hide' && r.state !== 'seek') return;
  r.state = 'end'; r.t = END_SEC; r.winner = winner;
  const all = [...r.players.values()];
  const standings = all.map(p => ({ id: p.id, name: p.name, color: p.color, bot: p.bot, orig: p.orig, seeker: p.seeker, tags: p.tags, hid: p.orig ? -1 : p.caughtAt < 0 ? Math.round(r.seekT) : Math.round(p.caughtAt), found: p.caughtAt >= 0, by: p.caughtBy }))
    .sort((a, b) => (winner === 'hiders' ? (b.hid - a.hid) || (b.tags - a.tags) : (b.orig - a.orig) || (b.tags - a.tags) || (b.hid - a.hid)));
  bcast(r, { t: 'end', winner, standings, seekT: Math.round(r.seekT) });
  for (const p of all) if (!p.bot) { const items = coinsFor(p, winner); send(p.ws, { t: 'coins', items, total: items.reduce((a, b) => a + b[1], 0) }); }
  pushLobby(r);
}
function toLobby(r) {
  r.state = 'lobby'; r.t = 0;
  for (const p of r.players.values()) { p.seeker = false; place(r, p); }
  bcast(r, worldMsg(r));
  pushLobby(r);
}
function catchHider(r, q, by) {
  if (q.seeker || r.state !== 'seek') return;
  q.seeker = true; q.caughtAt = r.seekT; q.caughtBy = by.id; by.tags++;
  if (q.brain) q.brain = newBrain();
  bcast(r, { t: 'caught', tg: q.id, by: by.id, left: hidersOf(r).length });
  checkRound(r);
}
function tryTag(r, s) {
  if (r.state !== 'seek' || !s.seeker) return;
  const t = now(); if (t - s.lastTag < 0.45) return; s.lastTag = t; s.reachT = 0.35;
  const map = mapOf(r), eye = S.eyeOf(s);
  let best = null, bd = S.TAG_R;
  for (const q of r.players.values()) {
    if (q.seeker) continue;
    const d = Math.hypot(q.x - s.x, q.z - s.z, (q.y - s.y) * 0.8);
    if (d < bd && (S.seesBody(map, eye, q) || d < 1.1)) { bd = d; best = q; }
  }
  bcast(r, { t: 'reach', id: s.id });
  if (best) catchHider(r, best, s);
}
function taunt(r, p) {
  if (r.state !== 'seek' || p.seeker) return;
  const t = now(); if (t - p.lastTaunt < 3.5) return;
  p.lastTaunt = t; if (p.taunts < 5) p.taunts++;
  bcast(r, { t: 'taunt', id: p.id, k: Math.floor(Math.random() * 4) });
  r.sounds.push({ x: p.x, y: p.y, z: p.z, t: r.seekT, id: p.id });
}

function tick(r, dt) {
  if (r.state === 'hide') { r.t -= dt; if (r.t <= 0) beginSeek(r); }
  else if (r.state === 'seek') {
    r.t -= dt; r.seekT += dt;
    r.squeakT -= dt;
    if (r.squeakT <= 0) {
      r.squeakT = SQUEAK_EVERY;
      const ids = hidersOf(r).map(p => p.id);
      bcast(r, { t: 'squeak', ids });
      for (const p of hidersOf(r)) r.sounds.push({ x: p.x, y: p.y, z: p.z, t: r.seekT, id: p.id });
    }
    r.sounds = r.sounds.filter(s => r.seekT - s.t < 8);
    if (r.t <= 0) { r.t = 0; endRound(r, 'hiders'); }
  } else if (r.state === 'end') { r.t -= dt; if (r.t <= 0) toLobby(r); }
  const map = mapOf(r), nav = navOf(r);
  for (const p of r.players.values()) {
    p.reachT = Math.max(0, p.reachT - dt);
    if (p.bot) { try { botThink(r, p, dt, map, nav); } catch (e) { console.error('bot', e); } }
  }
  r.snapAcc += dt;
  if (r.snapAcc >= (r.state === 'lobby' ? 1 / 15 : 1 / 20)) {
    r.snapAcc = 0;
    const e = [];
    for (const p of r.players.values()) e.push([p.id, r2(p.x), r2(p.y), r2(p.z), r2(p.yaw), (p.crouch ? 1 : 0) | (p.onGround ? 2 : 0) | (p.seeker ? 4 : 0) | (p.reachT > 0 ? 8 : 0), r2(p.vx), r2(p.vz)]);
    bcast(r, { t: 'snap', st: r.state, tl: Math.max(0, Math.ceil(r.t)), e });
  }
}

// ---------------------------------------------------------------- computer players
function newBrain() { return { path: null, pathT: 0, goal: null, spot: null, danger: null, visT: 0, fleeT: -9, look: 0, lookT: 0, checked: new Set(), target: null, seenT: 0, lastSeen: null, lastSeenT: -9, heard: null, sense: new Map(), stuckT: 0, lastPos: null, stuck: 0, jump: false, wander: null, waitT: 0, tauntT: 3 + Math.random() * 25, hopT: 2 + Math.random() * 6, searchGoal: null }; }

/** Walk towards goal [x, z, y?] along the nav grid. Returns true when there. */
function walkTo(r, p, dt, map, nav, goal, { sprint = false, crouch = false } = {}) {
  const B = p.brain, t = now();
  const gy = goal[2] || 0;
  if (!B.path || !B.goal || Math.hypot(goal[0] - B.goal[0], goal[1] - B.goal[1]) > 0.8 || Math.abs(gy - (B.goal[2] || 0)) > 0.5 || t - B.pathT > 2.5) {
    B.goal = goal; B.pathT = t; B.path = S.findPath(nav, p.x, p.y, p.z, goal[0], gy, goal[1]);
    if (!B.path) { B.noPath = (B.noPath || 0) + 1; }
  }
  let f = { dx: 0, dz: 0, jump: false, crouch: false, done: false };
  if (B.path) f = S.followPath(p, B.path, nav);
  const there = f.done || (Math.hypot(goal[0] - p.x, goal[1] - p.z) < 0.5 && Math.abs(p.y - gy) < 0.6);
  // stuck? hop, then find another way
  if (!B.lastPos) B.lastPos = [p.x, p.z];
  B.stuckT += dt;
  if (B.stuckT > 0.8) {
    const moved = Math.hypot(p.x - B.lastPos[0], p.z - B.lastPos[1]);
    if (moved < 0.3 && (f.dx || f.dz) && !there) { B.jump = true; B.stuck++; if (B.stuck > 1) { B.path = null; } } else B.stuck = 0;
    B.stuckT = 0; B.lastPos = [p.x, p.z];
  }
  const dx = there ? 0 : f.dx, dz = there ? 0 : f.dz;
  S.stepPlayer(p, { dx, dz, jump: (f.jump || B.jump) && !there, sprint, crouch: crouch || f.crouch }, dt, map);
  B.jump = false;
  if (dx || dz) turnTo(p, yawTo(dx, dz), dt, 9);
  return there;
}
const turnTo = (p, yaw, dt, rate = 8) => { p.yaw += angDiff(yaw, p.yaw) * (1 - Math.exp(-rate * dt)); };
const standStill = (p, dt, map, crouch = false) => S.stepPlayer(p, { dx: 0, dz: 0, jump: false, sprint: false, crouch }, dt, map);

function botThink(r, p, dt, map, nav) {
  const B = p.brain, D = DIFF[p.diff ?? 1];
  if (r.state === 'lobby' || r.state === 'end') {
    // mill about: wander, bounce on things, stop for a chat
    B.waitT -= dt;
    if (B.waitT > 0) { standStill(p, dt, map); return; }
    if (!B.wander) { const k = Math.floor(Math.random() * 12); B.wander = map.shop && k === 0 ? [map.shop.x + 1.5, map.shop.z + 1] : [(Math.random() - 0.5) * (map.W - 6), (Math.random() - 0.5) * (map.D - 6)]; }
    B.hopT -= dt; if (B.hopT <= 0) { B.hopT = 2 + Math.random() * 7; B.jump = true; }
    if (walkTo(r, p, dt, map, nav, B.wander) || (B.noPath || 0) > 2) { B.wander = null; B.noPath = 0; B.waitT = 1 + Math.random() * 4; }
    return;
  }
  if (p.seeker) seekerThink(r, p, dt, map, nav, B, D); else hiderThink(r, p, dt, map, nav, B, D);
}

function spotTaken(r, p, s) {
  for (const q of r.players.values()) {
    if (q === p || q.seeker) continue;
    if (q.brain?.spot === s) return true;
    if (!q.bot && Math.hypot(q.x - s[0], q.z - s[1]) < 1.4) return true;
  }
  return false;
}
function pickSpot(r, p, D, away = null) {
  const map = mapOf(r), seek = map.seekSpots[0];
  let best = null, bs = -1e9;
  for (const s of map.hides) {
    if (spotTaken(r, p, s)) continue;
    const dMe = Math.hypot(s[0] - p.x, s[1] - p.z);
    let score = Math.random() * 1.2 + D.smart * s[3] * 1.5 + D.smart * Math.hypot(s[0] - seek[0], s[1] - seek[1]) * 0.015;
    if (away) { const dA = Math.hypot(s[0] - away.x, s[1] - away.z); if (dA < 9) continue; score += dA * 0.08 - dMe * 0.05; }
    if (score > bs) { bs = score; best = s; }
  }
  return best;
}
function hiderThink(r, p, dt, map, nav, B, D) {
  const t = now();
  if (!B.spot) { B.spot = pickSpot(r, p, D); B.path = null; }
  if (!B.spot) { standStill(p, dt, map, true); return; }
  // keep an eye out for seekers
  if (r.state === 'seek') {
    B.visT -= dt;
    if (B.visT <= 0) {
      B.visT = 0.25;
      const eye = S.eyeOf(p);
      let d0 = D.alarm, danger = null;
      for (const s of seekersOf(r)) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < d0 && S.seesBody(map, eye, s)) { d0 = d; danger = s; } }
      if (danger && t - B.fleeT > 1.6) {
        const s2 = pickSpot(r, p, D, danger);
        if (s2) { B.spot = s2; B.path = null; B.fleeT = t; }
      }
      B.danger = danger;
    }
  }
  const fleeing = t - B.fleeT < 4;
  const near = Math.hypot(B.spot[0] - p.x, B.spot[1] - p.z) < 1.3;
  const there = walkTo(r, p, dt, map, nav, [B.spot[0], B.spot[1], B.spot[4] || 0], { sprint: fleeing || r.state === 'hide' && r.t < 12, crouch: !!B.spot[2] && near });
  if ((B.noPath || 0) > 3) { B.spot = null; B.noPath = 0; return; }
  if (there) {
    // settled in: peek out at the room, and now and then get cheeky
    if (B.danger) turnTo(p, yawTo(B.danger.x - p.x, B.danger.z - p.z), dt, 5);
    if (r.state === 'seek' && !B.danger) {
      B.tauntT -= dt;
      if (B.tauntT <= 0) { B.tauntT = 8 + Math.random() * 20; if (Math.random() < D.taunt * 20) taunt(r, p); }
    }
  }
}

function seekerThink(r, p, dt, map, nav, B, D) {
  const t = now();
  if (r.state === 'hide') { standStill(p, dt, map); p.yaw = Math.PI; return; }   // counting with hands over eyes
  const hiders = hidersOf(r);
  // look for hiders every 0.2 s
  B.visT -= dt;
  if (B.visT <= 0) {
    B.visT = 0.18 + Math.random() * 0.05;
    const eye = S.eyeOf(p);
    let best = null, bd = 1e9;
    for (const q of hiders) {
      const d = Math.hypot(q.x - p.x, q.z - p.z), dy = Math.abs(q.y - p.y);
      // right next to you, you notice them even behind a curtain or in the laundry
      if (d < D.sense && dy < 2.2) { const k = (B.sense.get(q.id) || 0) + 0.2; B.sense.set(q.id, k); if (k > 0.8) { best = q; bd = d; break; } }
      else B.sense.delete(q.id);
      const still = Math.hypot(q.vx, q.vz) < 0.5;
      const range = D.view * (q.crouch && still ? 0.6 : still ? 0.92 : 1);
      if (d > range) continue;
      if (d > 3 && Math.abs(angDiff(yawTo(q.x - p.x, q.z - p.z), p.yaw)) > D.cone) continue;
      if (!S.seesBody(map, eye, q)) continue;
      const score = d - (B.target === q ? 4 : 0);
      if (score < bd) { bd = score; best = q; }
    }
    if (best) { if (B.target !== best) { B.target = best; B.seenT = 0; } B.lastSeen = [best.x, best.z, best.onGround ? best.y : 0]; B.lastSeenT = t; }
    else B.target = null;
  }
  const q = B.target && !B.target.seeker && r.players.has(B.target.id) ? B.target : null;
  if (q) B.seenT += dt;
  // tag!
  if (q && Math.hypot(q.x - p.x, q.z - p.z, (q.y - p.y) * 0.8) < 1.8 && t - p.lastTag > 0.5) { p.yaw = yawTo(q.x - p.x, q.z - p.z); tryTag(r, p); if (q.seeker) { B.target = null; B.searchGoal = null; } return; }
  let goal = null, sprint = false;
  if (q && B.seenT > D.react) { goal = [q.x, q.z, q.onGround ? q.y : B.lastSeen[2]]; sprint = true; }
  else if (q) { standStill(p, dt, map); turnTo(p, yawTo(q.x - p.x, q.z - p.z), dt, 6); return; }   // "…wait, was that someone?"
  else if (B.lastSeen && t - B.lastSeenT < 5) { goal = B.lastSeen; sprint = true; if (Math.hypot(goal[0] - p.x, goal[1] - p.z) < 0.8) B.lastSeen = null; }
  if (!goal) {
    // a squeak or a taunt? go and have a look
    const snd = r.sounds.find(s => !B.heardIds?.has(s.t * 1000 + s.id) && Math.hypot(s.x - p.x, s.z - p.z) < 34);
    if (snd) { B.heardIds ||= new Set(); B.heardIds.add(snd.t * 1000 + snd.id); if (Math.random() < D.hear) { B.heard = [snd.x + (Math.random() - 0.5) * (4 - 3 * D.smart), snd.z + (Math.random() - 0.5) * (4 - 3 * D.smart), snd.y]; B.searchGoal = null; } }
    if (B.heard) { goal = B.heard; sprint = true; if (Math.hypot(goal[0] - p.x, goal[1] - p.z) < 1.2) { B.heard = null; B.lookT = 1.4; } }
  }
  if (!goal) {
    // look around for a moment, then search the next hiding place
    if (B.lookT > 0) { B.lookT -= dt; B.look += dt * 2.6; p.yaw += dt * 2.6 * (B.lookDir || 1); standStill(p, dt, map); return; }
    if (!B.searchGoal) B.searchGoal = nextSearch(r, p, B, D, map);
    goal = B.searchGoal;
  }
  if (!goal) { standStill(p, dt, map); return; }
  const there = walkTo(r, p, dt, map, nav, goal, { sprint, crouch: false });
  if ((B.noPath || 0) > 2) { if (B.searchGoal) B.checked.add(B.searchGoal); B.searchGoal = null; B.heard = null; B.noPath = 0; }
  if (there && goal === B.searchGoal) { B.checked.add(B.searchGoal); B.searchGoal = null; B.lookT = 0.6 + Math.random() * (1.2 - D.smart * 0.5); B.lookDir = Math.random() < 0.5 ? -1 : 1; }
}
function nextSearch(r, p, B, D, map) {
  let pts = map.hides.filter(s => !B.checked.has(s));
  if (!pts.length) { B.checked.clear(); pts = map.hides.slice(); }
  if (D.smart === 0 && Math.random() < 0.5) return [(Math.random() - 0.5) * (map.W - 8), (Math.random() - 0.5) * (map.D - 8), 0];
  // other seekers are probably heading to their nearest spots: prefer ones nobody is going to
  const others = seekersOf(r).filter(s => s !== p && s.brain?.searchGoal).map(s => s.brain.searchGoal);
  pts = pts.filter(s => !others.includes(s)).length ? pts.filter(s => !others.includes(s)) : pts;
  pts.sort((a, b) => Math.hypot(a[0] - p.x, a[1] - p.z) - Math.hypot(b[0] - p.x, b[1] - p.z));
  const k = D.smart >= 1 ? 1 : D.smart > 0 ? 4 : pts.length;
  const s = pts[Math.floor(Math.random() * Math.min(k, pts.length))];
  return [s[0], s[1], s[4] || 0];
}

// ---------------------------------------------------------------- sockets
const wss = new WebSocketServer({ server, maxPayload: 16384 });
wss.on('connection', ws => {
  const p = newEntity({ ws });
  send(ws, { t: 'hello', id: p.id });
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const r = p.room;
    switch (m.t) {
      case 'me':
        p.name = clean(m.name, 14) || 'GOOGLY'; p.color = /^#[0-9a-f]{6}$/i.test(m.color) ? m.color : '#9b59ff';
        p.skin = clean(m.skin, 16) || 'none'; p.pet = clean(m.pet, 16) || 'none';
        if (r) { pushLobby(r); bcast(r, { t: 'look', p: pubPlayer(r, p) }); }
        break;
      case 'list': send(ws, { t: 'list', rooms: listRooms() }); break;
      case 'create': { const nr = makeRoom({ public: m.public, name: m.name }); join(p, nr); break; }
      case 'quick': {
        const nr = makeRoom({ solo: true, role: ['hide', 'seek', 'random'].includes(m.role) ? m.role : 'random', settings: { cpus: clampI(m.cpus, 1, 7), diff: clampI(m.diff, 0, 2), hide: clampI(m.hide ?? 30, 10, 60), seek: clampI(m.seek ?? 180, 60, 600) } });
        join(p, nr); startRound(nr); break;
      }
      case 'join': {
        const nr = rooms.get(String(m.code || '').toUpperCase().trim());
        if (!nr) send(ws, { t: 'err', msg: 'No lobby with that code. Check the letters and try again.' });
        else join(p, nr);
        break;
      }
      case 'leave': leave(p); send(ws, { t: 'left' }); break;
      case 'set':
        if (r && r.hostId === p.id) {
          const s = m.settings || {};
          if (s.cpus !== undefined) r.settings.cpus = clampI(s.cpus, 0, 7);
          if (s.diff !== undefined) r.settings.diff = clampI(s.diff, 0, 2);
          if (s.hide !== undefined) r.settings.hide = clampI(s.hide, 10, 60);
          if (s.seek !== undefined) r.settings.seek = clampI(s.seek, 60, 600);
          if (s.seekers !== undefined) r.settings.seekers = clampI(s.seekers, 0, 3);
          if (s.role !== undefined && ['hide', 'seek', 'random'].includes(s.role)) r.role = s.role;
          if (s.public !== undefined) r.public = !!s.public;
          if (r.state === 'lobby') syncBots(r);
          pushLobby(r);
        }
        break;
      case 'start': if (r && r.hostId === p.id && (r.state === 'lobby' || r.state === 'end')) startRound(r); break;
      case 'chat': if (r) { const text = clean(m.text, 120); if (text) bcast(r, { t: 'chat', from: p.name, color: p.color, text }); } break;
      case 'st':
        if (r && !(r.state === 'hide' && p.seeker)) {
          const map = mapOf(r);
          if (m.w !== (r.state === 'lobby' ? LOBBY : ROOM)) break;     // still on the old map
          const x = +m.x, y = +m.y, z = +m.z;
          if ([x, y, z].every(Number.isFinite)) {
            const d = Math.hypot(x - p.x, z - p.z);
            if (d < 12) { p.x = Math.max(-map.W / 2, Math.min(map.W / 2, x)); p.z = Math.max(-map.D / 2, Math.min(map.D / 2, z)); p.y = Math.max(0, Math.min(map.roof || 20, y)); }
            else send(ws, { t: 'tp', x: r2(p.x), y: r2(p.y), z: r2(p.z) });
            p.vx = +m.vx || 0; p.vz = +m.vz || 0;
          }
          p.yaw = +m.yaw || 0; p.crouch = !!m.cr; p.onGround = !!m.g;
        }
        break;
      case 'tag': if (r) tryTag(r, p); break;
      case 'taunt': if (r) taunt(r, p); break;
      case 'ping': send(ws, { t: 'pong', c: m.c }); if (Number.isFinite(m.rtt)) p.rtt = Math.min(1, Math.max(0, m.rtt)); break;
    }
  });
  ws.on('close', () => leave(p));
});
function clampI(v, a, b) { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : a; }

let last = now();
setInterval(() => {
  const t = now(), dt = Math.min(0.1, t - last); last = t;
  for (const r of rooms.values()) { try { tick(r, dt); } catch (e) { console.error('tick', e); } }
}, TICK * 1000);
server.listen(PORT, () => console.log(`Googly Seek on http://localhost:${PORT}`));
