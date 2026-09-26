// Googly Seek — browser client: menus, shop, the walk-around lobby, controls, prediction, drawing.
import * as THREE from 'three';
import { World } from './world.js';
import { Googly, SKINS } from './googly.js';
import { Pet, PETS } from './pets.js';
import { MAPS, ROOM, LOBBY, GAME_MAPS } from './maps.js';
import * as S from './sim.js';
import { sfx, music, unlockAudio, setMusic, setSfx, audioState, setListener } from './sfx.js';

const Q = new URLSearchParams(location.search);
if (Q.has('shim')) window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('gs.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('gs.' + k, JSON.stringify(v)); } catch { } },
};
const COLORS = ['#9b59ff', '#8a5a2b', '#e8452c', '#2f7bff', '#34c759', '#ffcc00', '#ff6fb5', '#00c7be', '#ff9500', '#f2f2f7', '#3a3a3c', '#5a2ab0', '#c8a078', '#7bd13b'];
const prof = {
  name: store.get('name', ''), color: store.get('color', '#9b59ff'), skin: store.get('skin', 'none'), pet: store.get('pet', 'none'),
  coins: store.get('coins', 50), owned: store.get('owned', ['none']), ownedPets: store.get('ownedPets', ['none']),
  sens: store.get('sens', 1), invy: store.get('invy', false), zoom: store.get('zoom', 3.8), role: store.get('role', 'random'),
};
if (Q.has('coins')) prof.coins = +Q.get('coins');
const isMac = !!window.webkit?.messageHandlers?.gp;
const mobile = matchMedia('(pointer: coarse)').matches && 'ontouchstart' in window;
if (mobile) document.body.classList.add('mobile');

const world = new World($('view'));
const clock = new THREE.Clock();
let G = null;              // the place we're in with other googlies (the Waiting Hall or the Giant Bedroom)
let room = null, myId = 0;
let pendingRoom = (Q.get('room') || '').toUpperCase().slice(0, 4);

// ------------------------------------------------------------------ screens
const SCREENS = ['scr-title', 'scr-solo', 'scr-online', 'scr-shop', 'scr-pause', 'scr-end', 'scr-help'];
let screen = 'scr-title', prevScreen = 'scr-title';
function show(id) { if (id !== screen) prevScreen = screen; screen = id; for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id); }
function toast(t, ms = 2400) { const e = $('toast'); e.textContent = t; e.style.opacity = 1; clearTimeout(toast.t); toast.t = setTimeout(() => e.style.opacity = 0, ms); }
document.querySelectorAll('.back').forEach(b => b.onclick = () => { sfx.click(); show(screen === 'scr-help' ? prevScreen : 'scr-title'); });
document.addEventListener('pointerdown', () => unlockAudio(), { capture: true });
document.addEventListener('keydown', () => unlockAudio(), { capture: true });

// ------------------------------------------------------------------ title: name, colour, coins
$('nm').value = prof.name;
$('nm').oninput = () => { prof.name = $('nm').value.replace(/[<>&"]/g, '').slice(0, 14); store.set('name', prof.name); sendMe(); };
function swatchHTML() { return COLORS.map(c => `<div data-c="${c}" style="background:${c}" class="sw ${c === prof.color ? 'on' : ''}"></div>`).join(''); }
function drawSwatches() {
  $('swatches').innerHTML = swatchHTML();
  $('swatches').querySelectorAll('div').forEach(d => d.onclick = () => setColor(d.dataset.c));
}
function setColor(c) { prof.color = c; store.set('color', c); sfx.click(); drawSwatches(); if (shopTab === 'colors') drawShop(); lookChanged(); }
drawSwatches();
function drawCoins() { for (const id of ['t-coins', 's-coins', 'h-coins']) $(id).textContent = prof.coins; }
function addCoins(n) { prof.coins += n; store.set('coins', prof.coins); drawCoins(); }
drawCoins();
function needName() { if (!prof.name.trim()) { $('nm').focus(); toast('Type your name first'); sfx.nope(); return true; } return false; }
$('b-online').onclick = () => { if (needName()) return; sfx.click(); if (pendingRoom) { send({ t: 'join', code: pendingRoom }); pendingRoom = ''; drawInvite(); return; } show('scr-online'); send({ t: 'list' }); };
$('b-solo').onclick = () => { if (needName()) return; sfx.click(); show('scr-solo'); };
$('b-help').onclick = () => { sfx.click(); show('scr-help'); };
$('b-shop').onclick = () => { sfx.shopOpen(); openShop(); };
const fsToggle = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => toast('Full screen not available here')); };
$('b-fs').onclick = $('p-fs').onclick = () => { sfx.click(); fsToggle(); };
function drawAudioBtns() { const a = audioState(); for (const id of ['b-music', 'p-music']) $(id).textContent = a.music ? '♪ Music: on' : '♪ Music: off'; for (const id of ['b-sfx', 'p-sfx']) $(id).textContent = a.sfx ? '🔊 Sound: on' : '🔈 Sound: off'; }
$('b-music').onclick = $('p-music').onclick = () => { setMusic(!audioState().music); drawAudioBtns(); };
$('b-sfx').onclick = $('p-sfx').onclick = () => { setSfx(!audioState().sfx); drawAudioBtns(); sfx.click(); };
drawAudioBtns();
function drawInvite() {
  $('invite').classList.toggle('hidden', !pendingRoom);
  $('invite').innerHTML = `You've been invited to lobby <b>${esc(pendingRoom)}</b> — type your name and press JOIN`;
  $('b-online').innerHTML = pendingRoom ? `JOIN ${esc(pendingRoom)}<small>your friend's lobby</small>` : 'PLAY ONLINE<small>lobbies · codes · invite friends</small>';
}
drawInvite();

// ------------------------------------------------------------------ solo setup
function seg(el, value, onPick) {
  const draw = v => el.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  el.querySelectorAll('button').forEach(b => b.onclick = () => { sfx.click(); draw(b.dataset.v); onPick(b.dataset.v); });
  draw(value);
}
seg($('solo-role'), prof.role, v => { prof.role = v; store.set('role', v); });
for (const id of ['solo-n', 'solo-d', 'solo-h', 'solo-s']) { const v = store.get(id, null); if (v !== null) $(id).value = v; $(id).onchange = () => store.set(id, $(id).value); }
$('solo-go').onclick = () => { sfx.click(); send({ t: 'quick', cpus: +$('solo-n').value, diff: +$('solo-d').value, hide: +$('solo-h').value, seek: +$('solo-s').value, role: prof.role, map: soloMap }); };
// map picker cards: a little top-down drawing of each place, plus "surprise me"
const GROUND = { wood: '#c8925a', kitchen: '#e8e0d0', grass: '#5aa84a' };
function mapThumb(m, cv) {
  const g = cv.getContext('2d'), W = cv.width = 200, H = cv.height = 110;
  if (!m) { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#7a3ae0'); gr.addColorStop(1, '#d9964a'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = '900 64px "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', W / 2, H / 2 + 4); return; }
  const k = Math.min(W / m.W, H / m.D);
  g.fillStyle = '#1a1030'; g.fillRect(0, 0, W, H);
  g.fillStyle = GROUND[m.ground] || '#888'; g.fillRect(W / 2 - m.W * k / 2, H / 2 - m.D * k / 2, m.W * k, m.D * k);
  for (const c of m.colliders) {
    if (c.m === 'wall') continue;
    g.fillStyle = c.soft ? (m.outdoor ? '#2f7a2a' : '#f0a6c0') : c.y > 2 ? 'rgba(90,50,30,.35)' : ['#8a5a2b', '#2a9df4', '#e84a5f', '#ffc93c', '#9b59ff'][Math.abs(Math.round(c.x * 3 + c.z)) % 5];
    const x = W / 2 + c.x * k, y = H / 2 + c.z * k;
    if (c.t === 'c') { g.beginPath(); g.arc(x, y, Math.max(1.2, c.r * k), 0, 7); g.fill(); } else g.fillRect(x - c.w * k / 2, y - c.d * k / 2, Math.max(1, c.w * k), Math.max(1, c.d * k));
  }
}
function mapCards(el, sel, onPick) {
  const opts = [-1, ...GAME_MAPS];
  el.innerHTML = opts.map(i => `<div class="mapc ${i === sel ? 'on' : ''}" data-i="${i}"><canvas></canvas><b>${i < 0 ? 'Surprise me' : esc(MAPS[i].name.replace('The Giant ', 'Giant '))}</b><small>${i < 0 ? 'A random place every round' : esc(MAPS[i].blurb)}</small></div>`).join('');
  el.querySelectorAll('.mapc').forEach(d => { const i = +d.dataset.i; mapThumb(i < 0 ? null : MAPS[i], d.querySelector('canvas')); d.onclick = () => onPick(i); });
}
let soloMap = store.get('soloMap', -1);
const drawSoloMaps = () => mapCards($('solo-maps'), soloMap, i => { soloMap = i; store.set('soloMap', i); sfx.click(); drawSoloMaps(); });
drawSoloMaps();

// ------------------------------------------------------------------ online browser
$('on-pub').onclick = () => { sfx.click(); send({ t: 'create', public: true }); };
$('on-priv').onclick = () => { sfx.click(); send({ t: 'create', public: false }); };
$('on-join').onclick = () => { const c = $('on-code').value.trim().toUpperCase(); if (c.length !== 4) return toast('Lobby codes are 4 letters'); sfx.click(); send({ t: 'join', code: c }); };
$('on-code').onkeydown = e => { if (e.key === 'Enter') $('on-join').click(); };
$('on-ref').onclick = () => { sfx.click(); send({ t: 'list' }); };
function drawRooms(list) {
  $('rooms').innerHTML = list.length ? list.map(r => `<div class="roomrow"><div><b>${esc(r.name)}</b><small>${esc(r.map)} · ${r.total}/8 googlies (${r.humans} human) · CPUs ${esc(r.diff)} · ${r.state === 'lobby' ? 'waiting in the hall' : 'round on — jump in as a seeker'}</small></div><button class="green" data-c="${r.code}">JOIN</button></div>`).join('')
    : `<div class="empty">No open lobbies right now. Make one and send your friends the code!</div>`;
  $('rooms').querySelectorAll('button').forEach(b => b.onclick = () => { sfx.click(); send({ t: 'join', code: b.dataset.c }); });
}
setInterval(() => { if (screen === 'scr-online' && !G) send({ t: 'list' }); }, 4000);

// ------------------------------------------------------------------ shop
let shopTab = 'skins', shopOpen = false;
seg($('shop-tab'), shopTab, v => { shopTab = v; drawShop(); });
function openShop() { shopOpen = true; show('scr-shop'); drawShop(); if (G) { keys.clear(); } }
function closeShop() { shopOpen = false; show(G ? null : 'scr-title'); }
$('shop-close').onclick = () => { sfx.click(); closeShop(); };
function drawShop() {
  drawCoins();
  const g = $('shop-grid');
  if (shopTab === 'colors') {
    g.innerHTML = COLORS.map(c => `<div class="item ${c === prof.color ? 'on' : ''}" data-c="${c}"><i class="sk" style="background:${c}"></i>Colour<small class="own">${c === prof.color ? 'WEARING' : 'free'}</small></div>`).join('');
    g.querySelectorAll('.item').forEach(d => d.onclick = () => setColor(d.dataset.c));
    return;
  }
  const pets = shopTab === 'pets', list = pets ? PETS : SKINS, owned = pets ? prof.ownedPets : prof.owned, cur = pets ? prof.pet : prof.skin;
  g.innerHTML = list.map(it => {
    const has = owned.includes(it.id) || it.price === 0, on = it.id === cur;
    const icon = pets ? `<span class="em">${it.emoji}</span>` : `<i class="sk" style="background:${it.dot(prof.color)}"></i>`;
    const tag = on ? `<small class="eq">${pets ? 'WITH YOU' : 'WEARING'}</small>` : has ? `<small class="own">owned · tap to use</small>` : `<small class="price"><i class="coin" style="width:12px;height:12px;vertical-align:-1px"></i> ${it.price}</small>`;
    return `<div class="item ${on ? 'on' : ''} ${has ? '' : 'locked'}" data-id="${it.id}">${icon}${it.name}${tag}</div>`;
  }).join('');
  g.querySelectorAll('.item').forEach(d => d.onclick = () => buy(pets, d.dataset.id));
}
function buy(pets, id) {
  const it = (pets ? PETS : SKINS).find(x => x.id === id), owned = pets ? prof.ownedPets : prof.owned;
  if (!owned.includes(id) && it.price > 0) {
    if (prof.coins < it.price) { sfx.nope(); toast(`You need ${it.price - prof.coins} more coins — win rounds to earn them!`); return; }
    addCoins(-it.price); owned.push(id); store.set(pets ? 'ownedPets' : 'owned', owned);
    sfx.buy(); toast(`You got ${it.name}!`);
  } else sfx.click();
  if (pets) { prof.pet = id; store.set('pet', id); } else { prof.skin = id; store.set('skin', id); }
  drawShop(); lookChanged();
}
function lookChanged() {
  sendMe();
  if (preview) { preview.fig.setLook(prof.color, prof.skin); setPet(preview, prof.pet); }
  const e = G?.ents.get(myId); if (e) { e.fig.setLook(prof.color, prof.skin); setPet(e, prof.pet); }
}

// ------------------------------------------------------------------ lobby panel
const amHost = () => room && room.host === myId;
function drawLobby() {
  if (!room) return;
  $('lb-code').textContent = room.code;
  $('lb-count').textContent = `· ${room.players.length}/8`;
  $('lb-players').innerHTML = room.players.map(p => `<div class="pl"><span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)}${p.id === myId ? ' (you)' : ''}${p.pet && p.pet !== 'none' ? ' ' + (PETS.find(x => x.id === p.pet)?.emoji || '') : ''}<span class="tag">${p.bot ? 'CPU' : p.host ? 'HOST' : 'PLAYER'}</span></div>`).join('');
  const s = room.settings, h = amHost();
  for (const [id, k] of [['lb-cpus', 'cpus'], ['lb-diff', 'diff'], ['lb-hide', 'hide'], ['lb-seek', 'seek'], ['lb-seekers', 'seekers']]) { $(id).value = String(s[k]); $(id).disabled = !h; }
  $('lb-pub').checked = room.public; $('lb-pub').disabled = !h;
  $('lb-rolewrap').classList.toggle('hidden', !room.solo);
  $('lb-role').value = prof.role;
  $('lb-hostctl').classList.toggle('hidden', !h);
  $('lb-summary').classList.toggle('hidden', h);
  if (h && drawLobby.map !== room.code + s.map) { drawLobby.map = room.code + s.map; mapCards($('lb-maps'), s.map, i => { sfx.click(); send({ t: 'set', settings: { map: i } }); }); }
  $('lb-summary').innerHTML = `Place: <b>${s.map < 0 ? 'Surprise me (random)' : esc(MAPS[s.map].name)}</b><br>CPUs: <b>${s.cpus}</b> (${['Easy', 'Normal', 'Hard'][s.diff]})<br>Hide: <b>${s.hide} s</b> · Seek: <b>${Math.round(s.seek / 60)} min</b> · Seekers: <b>${s.seekers || 'auto'}</b><br>${room.public ? 'Public lobby' : 'Private lobby'} · only the host can change these`;
  $('lb-start').classList.toggle('hidden', !h);
  $('lb-start').textContent = room.state === 'lobby' ? 'START ROUND' : 'ROUND RUNNING…';
  $('lb-start').disabled = room.state !== 'lobby';
  const hostName = room.players.find(p => p.id === room.host)?.name || 'the host';
  $('lb-wait').textContent = h ? (room.solo ? 'Walk around, visit the shop, then press START ROUND.' : 'You are the host. Invite friends with the code or link, then press START ROUND.') : `Waiting for ${hostName} to start the round… walk around while you wait!`;
}
for (const [id, k] of [['lb-cpus', 'cpus'], ['lb-diff', 'diff'], ['lb-hide', 'hide'], ['lb-seek', 'seek'], ['lb-seekers', 'seekers']]) $(id).onchange = () => send({ t: 'set', settings: { [k]: +$(id).value } });
$('lb-role').onchange = () => { prof.role = $('lb-role').value; store.set('role', prof.role); send({ t: 'set', settings: { role: prof.role } }); };
$('lb-pub').onchange = () => send({ t: 'set', settings: { public: $('lb-pub').checked } });
$('lb-start').onclick = () => { sfx.click(); send({ t: 'start' }); };
$('lb-leave').onclick = () => { sfx.click(); leaveAll(); };
$('lb-shop').onclick = () => { sfx.shopOpen(); openShop(); };
$('lb-hide').onclick = () => { sfx.click(); $('lobbyui').classList.add('collapsed'); };
$('lb-show').onclick = () => { sfx.click(); $('lobbyui').classList.remove('collapsed'); };
const inviteLink = () => `${location.origin}/?room=${room.code}`;
$('lb-copy').onclick = async () => {
  sfx.click();
  const link = inviteLink();
  try { await navigator.clipboard.writeText(link); toast('Invite link copied! Send it to your friends: ' + link, 4000); }
  catch { prompt('Send this link to your friends:', link); }
};
if (navigator.share) { $('lb-share').classList.remove('hidden'); $('lb-share').onclick = () => navigator.share({ title: 'Googly Seek', text: `Come play hide and seek — lobby code ${room.code}`, url: inviteLink() }).catch(() => { }); }
$('lb-form').onsubmit = e => { e.preventDefault(); const t = $('lb-msg').value.trim(); if (t) send({ t: 'chat', text: t }); $('lb-msg').value = ''; $('lb-msg').blur(); };
function addChat(m) {
  const line = m.sys ? `<div class="sys">${esc(m.text)}</div>` : `<div><b style="color:${esc(m.color)}">${esc(m.from)}:</b> ${esc(m.text)}</div>`;
  for (const id of ['lb-log', 'log']) { const el = $(id); el.insertAdjacentHTML('beforeend', line); while (el.children.length > 40) el.firstChild.remove(); el.scrollTop = 1e6; }
  if (!m.sys) sfx.chat();
}

// ------------------------------------------------------------------ network
let ws = null, pingT = 0, rtt = 0.1, wasConnected = false;
const send = m => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
function sendMe() { send({ t: 'me', name: prof.name.trim() || 'GOOGLY', color: prof.color, skin: prof.skin, pet: prof.pet }); }
function connect() {
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  ws.onopen = () => { wasConnected = true; sendMe(); autoStart(); };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } onMsg(m); };
  ws.onclose = () => {
    if (wasConnected) toast('Lost connection to the server — reconnecting…', 4000);
    wasConnected = false;
    if (G) leaveWorld(); room = null;
    if (!['scr-title', 'scr-shop', 'scr-help', 'scr-solo'].includes(screen)) show('scr-title');
    setTimeout(connect, 1500);
  };
}
function autoStart() {
  if (!Q.has('quick') && !Q.has('lobby')) return;
  if (!prof.name) prof.name = 'TESTER';
  sendMe();
  if (Q.has('lobby')) send({ t: 'create', public: false });
  else send({ t: 'quick', cpus: +(Q.get('cpus') || 5), diff: +(Q.get('diff') || 1), hide: +(Q.get('hide') || 30), seek: +(Q.get('seek') || 180), role: Q.get('role') || 'random', map: Q.has('map') ? +Q.get('map') : -1 });
}
setInterval(() => { pingT = performance.now(); send({ t: 'ping', c: pingT, rtt }); }, 2000);

function onMsg(m) {
  switch (m.t) {
    case 'hello': myId = m.id; break;
    case 'list': drawRooms(m.rooms); break;
    case 'pong': rtt = rtt * 0.7 + (performance.now() - m.c) / 1000 * 0.3; break;
    case 'err': toast(m.msg, 3500); sfx.nope(); break;
    case 'joined': sfx.join(); $('lb-log').innerHTML = ''; history.replaceState(null, '', '?room=' + m.code); break;
    case 'left': history.replaceState(null, '', location.pathname); break;
    case 'room': room = m.room; drawLobby(); break;
    case 'chat': addChat(m); break;
    case 'world': enterWorld(m); break;
    default: if (G) onGameMsg(m);
  }
}

// ------------------------------------------------------------------ entering a place
const me = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, onGround: true, crouch: false, duck: false, yaw: 0, camYaw: 0, camPitch: -0.2, seeker: false, stepT: 0 };
function enterWorld(m) {
  const wasEnd = G && G.state === 'end';
  const map = world.load(m.map);
  preview = null;
  G = { mapId: m.map, map, state: m.state, timeLeft: m.time, settings: m.settings, ents: new Map(), round: m.round, sendT: 0, beepAt: 99, hbT: 0, hints: [] };
  for (const p of m.players) addEnt(p);
  const mine = m.players.find(p => p.id === myId);
  if (mine) Object.assign(me, { x: mine.x, y: mine.y, z: mine.z, vx: 0, vy: 0, vz: 0, yaw: mine.yaw, camYaw: mine.yaw, camPitch: m.map === LOBBY ? -0.28 : -0.18, seeker: !!mine.seeker, crouch: false, duck: false, onGround: true });
  $('feed').innerHTML = '';
  if (m.map === LOBBY) {
    $('lobbyui').classList.remove('hidden'); $('hud').classList.remove('hidden'); $('hud').classList.add('lobby');
    if (screen !== 'scr-shop') show(null);
    unlock(); music.play('lobby');
    if (wasEnd) toast('Back in the Waiting Hall — walk around while you wait for the next round', 3000);
  } else {
    $('lobbyui').classList.add('hidden'); $('hud').classList.remove('hidden', 'lobby');
    shopOpen = false; show(null);
    music.play(m.state === 'seek' ? 'seek' : 'hide');
    if (m.state === 'hide') {
      if (me.seeker) { center('YOU ARE THE SEEKER', 2600, '#ff9ac0', `${G.map.name} · count to ${Math.round(m.time)}… no peeking!`); }
      else { center('HIDE!', 2600, '#ffd3a0', `${G.map.name} — find a good spot before the seeker opens their eyes`); sfx.hide(); }
    } else if (m.state === 'seek') center('YOU JOINED AS A SEEKER', 2600, '#ff9ac0', 'Help find the hiders!');
    if (!mobile && !Q.has('bot') && !Q.has('cam') && !Q.has('fakeend')) askLock();
    if (Q.has('fakeend')) setTimeout(() => { const ps = [...G.ents.values()]; showEnd({ winner: 'hiders', seekT: 180, standings: ps.map((e, i) => ({ id: e.id, name: e.name, color: e.color, bot: e.bot, orig: i === 0, found: i % 2 === 1, tags: i === 0 ? 3 : 0, hid: i === 0 ? -1 : i % 2 ? 40 + i * 9 : 180 })) }); showCoins({ total: 130, items: [['Played a round', 10], ['Never found — hiders win!', 100], ['Taunted 4×', 20]] }); }, 800);
  }
}
function leaveWorld() {
  if (!G) return;
  G = null;
  $('hud').classList.add('hidden'); $('clickto').classList.add('hidden'); $('board').classList.add('hidden'); $('lobbyui').classList.add('hidden');
  unlock();
  music.play('menu');
  showPreview();
}
function leaveAll() { send({ t: 'leave' }); leaveWorld(); room = null; show('scr-title'); }
function setPet(a, kind) {
  if (a.petKind === kind) return;
  if (a.pet) { a.pet.group.parent?.remove(a.pet.group); a.pet = null; }
  a.petKind = kind;
  if (kind && kind !== 'none') { a.pet = new Pet(kind); world.actors.add(a.pet.group); }
}
function addEnt(p) {
  const local = p.id === myId;
  const fig = new Googly({ color: p.color, name: p.name, skin: p.skin, local });
  fig.group.position.set(p.x, p.y, p.z); fig.group.rotation.y = p.yaw + Math.PI;
  world.actors.add(fig.group);
  const e = { id: p.id, name: p.name, color: p.color, bot: p.bot, seeker: !!p.seeker, fig, buf: [], x: p.x, y: p.y, z: p.z, yaw: p.yaw, flags: 2 | (p.seeker ? 4 : 0), vx: 0, vz: 0, pet: null, petKind: null };
  setPet(e, local ? prof.pet : p.pet);
  if (local) fig.onStep = v => sfx.step(null, v * 0.5, (G && G.mapId !== LOBBY) && me.crouch);
  else fig.onStep = v => { if (Math.hypot(e.x - me.x, e.z - me.z) < 22) sfx.step([e.x, e.y, e.z], v * 0.8, !!(e.flags & 1)); };
  G.ents.set(p.id, e);
  return e;
}
const ent = id => G?.ents.get(id);
const nameSpan = id => { const e = ent(id); return e ? `<span style="color:${esc(e.color)}">${esc(e.name)}</span>` : '???'; };
function center(text, ms = 1500, color = '#fff', small = '') { const c = $('center'); c.innerHTML = esc(text) + (small ? `<small>${esc(small)}</small>` : ''); c.style.color = color; c.style.opacity = 1; clearTimeout(center.t); center.t = setTimeout(() => c.style.opacity = 0, ms); }
function feed(html) { const d = document.createElement('div'); d.innerHTML = html; $('feed').prepend(d); while ($('feed').children.length > 6) $('feed').lastChild.remove(); }

function onGameMsg(m) {
  const t = performance.now() / 1000;
  switch (m.t) {
    case 'snap':
      G.timeLeft = m.tl;
      if (m.st !== G.state && m.st === 'seek' && G.state === 'hide') beginSeek();
      G.state = m.st;
      for (const a of m.e) {
        const e = ent(a[0]); if (!e) continue;
        e.buf.push({ t, x: a[1], y: a[2], z: a[3], yaw: a[4], flags: a[5], vx: a[6], vz: a[7] });
        if (e.buf.length > 30) e.buf.shift();
        e.seeker = !!(a[5] & 4);
        if (a[0] === myId) me.seeker = e.seeker;
      }
      break;
    case 'phase': if (m.state === 'seek') { G.timeLeft = m.time; beginSeek(); G.state = 'seek'; } break;
    case 'tp': Object.assign(me, { x: m.x, y: m.y, z: m.z, vx: 0, vy: 0, vz: 0 }); break;
    case 'join': if (!ent(m.p.id)) { addEnt(m.p); feed(`${nameSpan(m.p.id)} joined`); } break;
    case 'gone': { const e = ent(m.id); if (e) { world.actors.remove(e.fig.group); if (e.pet) world.actors.remove(e.pet.group); G.ents.delete(m.id); feed(`<span>${esc(e.name)} left</span>`); } break; }
    case 'look': { const e = ent(m.p.id); if (e && m.p.id !== myId) { e.fig.setLook(m.p.color, m.p.skin); e.color = m.p.color; setPet(e, m.p.pet); } break; }
    case 'reach': { const e = ent(m.id); if (e) { e.fig.reach(); if (m.id !== myId) sfx.reach([e.x, e.y + 1, e.z]); } break; }
    case 'caught': {
      const e = ent(m.tg), by = ent(m.by); if (!e) break;
      e.seeker = true; e.fig.caught();
      world.puff({ x: e.x, y: e.y + 1.2, z: e.z }, 0xff9ac0, 16, 3);
      feed(`${nameSpan(m.by)} 🔎 found ${nameSpan(m.tg)} · ${m.left} left`);
      if (m.tg === myId) { me.seeker = true; me.duck = false; sfx.found(); center(`FOUND BY ${by ? by.name : '???'}!`, 3200, '#ff9ac0', 'Now you are a seeker — help find the rest!'); }
      else if (m.by === myId) { sfx.gotcha([e.x, e.y + 1, e.z]); center(`GOTCHA, ${e.name}!`, 1600, '#ffd84a', '+20 coins'); }
      else sfx.gotcha([e.x, e.y + 1, e.z]);
      break;
    }
    case 'taunt': { const e = ent(m.id); if (e) { e.fig.taunt(); sfx.taunt([e.x, e.y + 1, e.z], m.k, m.id === myId); if (m.id !== myId && me.seeker) G.hints.push({ x: e.x, y: e.y, z: e.z, t: 2.5 }); } break; }
    case 'squeak':
      for (const id of m.ids) { const e = ent(id); if (e) { sfx.squeak([e.x, e.y + 1, e.z], id === myId); if (me.seeker) G.hints.push({ x: e.x, y: e.y, z: e.z, t: 2 }); } }
      if (m.ids.includes(myId)) toast('🐤 You squeaked! (every hider does, every 30 seconds)', 2200); else if (me.seeker) toast('🐤 Squeak! Listen — where did that come from?', 2200);
      break;
    case 'end': showEnd(m); break;
    case 'coins': showCoins(m); break;
  }
}
function beginSeek() {
  if (G.seekShown) return; G.seekShown = true;
  music.play('seek'); sfx.readyOrNot();
  center(me.seeker ? 'READY OR NOT, HERE I COME!' : 'THE SEEKER IS COMING!', 2200, me.seeker ? '#ff9ac0' : '#ffd3a0', me.seeker ? 'Get close to a hider and click to tag them' : 'Stay still… stay quiet…');
}

// ------------------------------------------------------------------ input
const keys = new Set(); let locked = false, macLocked = false, chatting = false;
const look = { dx: 0, dy: 0 };
const typing = e => e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'range' || e.target.tagName === 'SELECT';
addEventListener('keydown', e => {
  if (chatting) { if (e.key === 'Escape') closeChat(); return; }
  if (typing(e)) { if (e.key === 'Escape') e.target.blur(); return; }
  if (G && ['Tab', ' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
  keys.add(e.code);
  if (!G) return;
  if (e.code === 'KeyM') { setMusic(!audioState().music); drawAudioBtns(); toast(audioState().music ? 'Music on' : 'Music off', 900); }
  if (G.mapId === LOBBY) {
    if (e.code === 'Enter' || e.code === 'KeyT') { e.preventDefault(); $('lobbyui').classList.remove('collapsed'); $('lb-msg').focus(); keys.clear(); }
    if (e.code === 'KeyE' && onShopMat() && !shopOpen) { sfx.shopOpen(); openShop(); }
    if (e.code === 'Escape' && shopOpen) closeShop();
    return;
  }
  if (e.code === 'KeyC' && !e.repeat) { me.duck = !me.duck; }
  if (e.code === 'KeyF') doTaunt();
  if (e.code === 'KeyE') doTag();
  if (e.code === 'KeyT' || e.code === 'Enter') { e.preventDefault(); openChat(); }
  if (e.code === 'Escape' && macLocked) { unlock(); pause(); }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); });
const canvas = $('view');
let drag = null;
canvas.addEventListener('mousedown', e => {
  if (!G) return;
  if (G.mapId === LOBBY || shopOpen) { drag = { x: e.clientX, y: e.clientY }; return; }
  if (!locked && !macLocked && !mobile) { askLock(); return; }
  if (e.button === 0) doTag();
});
addEventListener('mousemove', e => {
  if (locked) { look.dx += e.movementX; look.dy += e.movementY; }
  else if (drag) { look.dx += (e.clientX - drag.x) * 1.4; look.dy += (e.clientY - drag.y) * 1.4; drag = { x: e.clientX, y: e.clientY }; }
});
addEventListener('mouseup', () => { drag = null; });
canvas.addEventListener('wheel', e => { if (!G) return; prof.zoom = Math.max(1.8, Math.min(8, prof.zoom * (1 + Math.sign(e.deltaY) * 0.1))); store.set('zoom', prof.zoom); }, { passive: true });
addEventListener('contextmenu', e => { if (G) e.preventDefault(); });
window.__look = (dx, dy) => { if (macLocked) { look.dx += dx; look.dy += dy; } };
window.__unlocked = () => { if (macLocked) { macLocked = false; if (G && G.mapId !== LOBBY) pause(); } };
window.__mouse = (b, down) => { if (!macLocked) return; if (b === 0 && down) doTag(); };
function askLock() {
  if (!G || G.mapId === LOBBY) return;
  if (isMac) { window.webkit.messageHandlers.gp.postMessage('lock'); macLocked = true; $('clickto').classList.add('hidden'); if (screen === 'scr-pause') show(null); return; }
  $('clickto').classList.remove('hidden');
}
$('clickto').onclick = () => { unlockAudio(); if (isMac) return askLock(); canvas.requestPointerLock?.(); };
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (locked) { $('clickto').classList.add('hidden'); if (screen === 'scr-pause') show(null); }
  else if (G && G.mapId !== LOBBY && !chatting && screen !== 'scr-end') pause();
});
function unlock() { if (document.pointerLockElement) document.exitPointerLock(); if (macLocked) { macLocked = false; window.webkit?.messageHandlers?.gp?.postMessage('unlock'); } }
function pause() { if (!G) return; keys.clear(); show('scr-pause'); $('clickto').classList.add('hidden'); }
$('p-resume').onclick = () => { sfx.click(); show(null); if (isMac) askLock(); else canvas.requestPointerLock?.(); };
$('p-leave').onclick = () => { sfx.click(); leaveAll(); };
$('sens').value = prof.sens; $('sens').oninput = () => { prof.sens = +$('sens').value; store.set('sens', prof.sens); };
$('invy').checked = prof.invy; $('invy').onchange = () => { prof.invy = $('invy').checked; store.set('invy', prof.invy); };
function openChat() { chatting = true; keys.clear(); $('chatform').classList.remove('hidden'); $('chatin').focus(); }
function closeChat() { chatting = false; $('chatform').classList.add('hidden'); $('chatin').blur(); $('chatin').value = ''; }
$('chatform').onsubmit = e => { e.preventDefault(); const t = $('chatin').value.trim(); if (t) send({ t: 'chat', text: t }); closeChat(); };
function doTag() {
  if (!G || G.mapId === LOBBY || !me.seeker || G.state !== 'seek') return;
  const t = performance.now(); if (t - (doTag.last || 0) < 450) return; doTag.last = t;
  send({ t: 'tag' }); ent(myId)?.fig.reach(); sfx.reach(null);
}
function doTaunt() {
  if (!G || G.mapId === LOBBY || me.seeker || G.state !== 'seek') return;
  const t = performance.now(); if (t - (doTaunt.last || 0) < 3600) return; doTaunt.last = t;
  send({ t: 'taunt' });
}
const onShopMat = () => G && G.mapId === LOBBY && G.map.shop && Math.hypot(me.x - G.map.shop.x, me.z - G.map.shop.z) < G.map.shop.r;

// touch controls
const touch = { mx: 0, mz: 0, jump: false, stickId: null, lookId: null, lx: 0, ly: 0 };
if (mobile) {
  const stick = $('stick'), knob = $('knob');
  stick.addEventListener('touchstart', e => { touch.stickId = e.changedTouches[0].identifier; e.preventDefault(); }, { passive: false });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === touch.stickId) { const r = stick.getBoundingClientRect(), dx = (t.clientX - r.left - r.width / 2) / (r.width / 2), dy = (t.clientY - r.top - r.height / 2) / (r.height / 2), l = Math.min(1, Math.hypot(dx, dy)), a = Math.atan2(dy, dx); touch.mx = Math.cos(a) * l; touch.mz = -Math.sin(a) * l; knob.style.left = 45 + Math.cos(a) * l * 45 + 'px'; knob.style.top = 45 + Math.sin(a) * l * 45 + 'px'; }
      if (t.identifier === touch.lookId) { look.dx += (t.clientX - touch.lx) * 2.2; look.dy += (t.clientY - touch.ly) * 2.2; touch.lx = t.clientX; touch.ly = t.clientY; }
    }
  }, { passive: false });
  addEventListener('touchend', e => { for (const t of e.changedTouches) { if (t.identifier === touch.stickId) { touch.stickId = null; touch.mx = touch.mz = 0; knob.style.left = knob.style.top = '45px'; } if (t.identifier === touch.lookId) touch.lookId = null; } });
  canvas.addEventListener('touchstart', e => { const t = e.changedTouches[0]; if (t.clientX > innerWidth * 0.35) { touch.lookId = t.identifier; touch.lx = t.clientX; touch.ly = t.clientY; } }, { passive: true });
  $('t-jump').addEventListener('touchstart', e => { e.preventDefault(); touch.jump = true; }, { passive: false });
  $('t-jump').addEventListener('touchend', () => { touch.jump = false; });
  $('t-cr').addEventListener('touchstart', e => { e.preventDefault(); me.duck = !me.duck; }, { passive: false });
  $('t-act').addEventListener('touchstart', e => { e.preventDefault(); if (me.seeker) doTag(); else doTaunt(); }, { passive: false });
  $('t-menu').addEventListener('touchstart', e => { e.preventDefault(); if (G?.mapId === LOBBY) $('lobbyui').classList.toggle('collapsed'); else pause(); }, { passive: false });
}

// ------------------------------------------------------------------ the local googly
const V = new THREE.Vector3(), V2 = new THREE.Vector3();
const camPos = new THREE.Vector3();
function localInput() {
  const k = c => keys.has(c);
  if (Q.has('bot')) return botInput();
  let mx = (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0) + touch.mx;
  let mz = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0) + touch.mz;
  if (shopOpen || screen === 'scr-pause') mx = mz = 0;
  return { mx, mz, jump: k('Space') || touch.jump, sprint: k('ShiftLeft') || k('ShiftRight'), crouch: k('ControlLeft') || k('ControlRight') };
}
// ?bot=1: the local googly runs around by itself (for testing and screenshots)
const botS = { t: 0, mx: 0, mz: 1 };
function botInput() { botS.t -= 1 / 60; if (botS.t <= 0) { botS.t = 1 + Math.random() * 2; botS.mx = Math.random() * 2 - 1; me.camYaw += (Math.random() - 0.5) * 2; } if (me.seeker && Math.random() < 0.05) doTag(); return { mx: botS.mx * 0.4, mz: 1, jump: Math.random() < 0.01, sprint: true, crouch: false }; }

function updateLocal(dt) {
  const inp = localInput();
  // look
  const sens = 0.0024 * prof.sens;
  me.camYaw -= look.dx * sens; me.camPitch -= look.dy * sens * (prof.invy ? -1 : 1); look.dx = look.dy = 0;
  me.camPitch = Math.max(-1.25, Math.min(0.9, me.camPitch));
  const frozen = G.mapId !== LOBBY && G.state === 'hide' && me.seeker;
  const s = Math.sin(me.camYaw), c = Math.cos(me.camYaw);
  let dx = inp.mx * c - inp.mz * s, dz = -inp.mx * s - inp.mz * c;
  if (frozen) dx = dz = 0;
  const crouch = !frozen && (me.duck || inp.crouch) && G.mapId !== LOBBY;
  const n = Math.ceil(dt / (1 / 90));
  for (let i = 0; i < n; i++) S.stepPlayer(me, { dx, dz, jump: inp.jump && i === 0 && !frozen, sprint: inp.sprint, crouch }, dt / n, G.map);
  if (!crouch && me.crouch) me.duck = true;           // stuck under something: stay ducked
  if (me.jumped) { me.jumped = false; sfx.jump(null); }
  if (me.bounced) { me.bounced = false; sfx.boing(null); }
  if (me.landed) { sfx.land(Math.min(1, me.landed / 14)); me.landed = 0; }
  const moving = Math.hypot(dx, dz) > 0.1;
  if (frozen) me.yaw = Math.PI;
  else if (moving) me.yaw += (((Math.atan2(-dx, -dz) - me.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * (1 - Math.exp(-12 * dt));
  G.sendT -= dt;
  if (G.sendT <= 0) { G.sendT = G.mapId === LOBBY ? 1 / 15 : 1 / 30; send({ t: 'st', w: G.mapId, x: +me.x.toFixed(3), y: +me.y.toFixed(3), z: +me.z.toFixed(3), vx: +me.vx.toFixed(2), vz: +me.vz.toFixed(2), yaw: +me.yaw.toFixed(3), cr: me.crouch ? 1 : 0, g: me.onGround ? 1 : 0 }); }
}

// ------------------------------------------------------------------ everyone's googly + pet
function updateEnts(dt) {
  const rt = performance.now() / 1000 - 0.1;
  const inRoom = G.mapId !== LOBBY, st = G.state;
  for (const e of G.ents.values()) {
    let speed, crouch, onGround;
    if (e.id === myId) {
      e.x = me.x; e.y = me.y; e.z = me.z; e.yaw = me.yaw; e.seeker = me.seeker;
      speed = Math.hypot(me.vx, me.vz); crouch = me.crouch; onGround = me.onGround;
      const d = camPos.distanceTo(V.set(me.x, me.y + 1.1, me.z));
      e.fig.root.visible = d > 0.8;
    } else {
      const b = e.buf;
      if (b.length) {
        let i = b.length - 1; while (i > 0 && b[i - 1].t > rt) i--;
        const B = b[i], A = b[Math.max(0, i - 1)];
        const k = B.t === A.t ? 1 : Math.max(0, Math.min(1.2, (rt - A.t) / (B.t - A.t)));
        e.x = A.x + (B.x - A.x) * k; e.y = A.y + (B.y - A.y) * k; e.z = A.z + (B.z - A.z) * k;
        e.yaw = A.yaw + (((B.yaw - A.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, k);
        e.flags = B.flags; e.vx = B.vx; e.vz = B.vz;
        if (Math.hypot(e.x - e.fig.group.position.x, e.z - e.fig.group.position.z) > 6) e.pet && (e.pet.pos = null);
      }
      speed = Math.hypot(e.vx, e.vz); crouch = !!(e.flags & 1); onGround = !!(e.flags & 2);
    }
    const f = e.fig;
    f.group.position.set(e.x, e.y, e.z); f.group.rotation.y = e.yaw + Math.PI;
    f.setSeeker(inRoom && e.seeker);
    let pose = 'idle';
    if (inRoom && st === 'hide' && e.seeker) pose = 'count';
    if (inRoom && st === 'end' && G.winner) pose = (G.winner === 'seekers') === e.seeker ? 'cheer' : 'sad';
    f.update(dt, { speed, crouch, onGround, pose });
    // hiders' name tags are secret from seekers
    if (f.tag) f.tag.visible = !(inRoom && me.seeker && !e.seeker && st !== 'end');
    if (e.pet) e.pet.update(dt, e.x, e.y, e.z, e.yaw, speed, crouch || pose === 'count');
  }
  // squeak/taunt hints for seekers: a little floating "?" where the sound came from
  for (const h of G.hints) {
    if (!h.sprite) { h.sprite = hintSprite(); h.sprite.position.set(h.x, h.y + 2.4, h.z); world.fx.add(h.sprite); }
    h.t -= dt; h.sprite.material.opacity = Math.min(1, h.t) * 0.9; h.sprite.position.y += dt * 0.4;
    if (h.t <= 0) world.fx.remove(h.sprite);
  }
  G.hints = G.hints.filter(h => h.t > 0);
}
let hintTex = null;
function hintSprite() {
  if (!hintTex) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill(); g.fillStyle = '#5a2a9a'; g.font = '900 90px "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 64, 70); hintTex = new THREE.CanvasTexture(c); hintTex.colorSpace = THREE.SRGBColorSpace; }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: hintTex, transparent: true, depthTest: false })); s.scale.set(0.9, 0.9, 1); s.renderOrder = 20; return s;
}

// ------------------------------------------------------------------ camera + HUD
function updateCamera(dt) {
  const cam = world.camera;
  if (Q.has('cam')) { const v = Q.get('cam').split(',').map(Number); cam.position.set(v[0], v[1], v[2]); cam.lookAt(v[3], v[4], v[5]); cam.fov = +(Q.get('fov') || 60); cam.updateProjectionMatrix(); camPos.copy(cam.position); return; }
  if (shopOpen) {
    // face-to-face with yourself so you can see the new skin or pet
    const fwd = V2.set(-Math.sin(me.yaw), 0, -Math.cos(me.yaw)), right = V.set(Math.cos(me.yaw), 0, -Math.sin(me.yaw));
    const want = new THREE.Vector3(me.x, me.y + 1.35, me.z).addScaledVector(fwd, 3.1).addScaledVector(right, innerWidth > 900 ? 1.3 : 0);
    camPos.lerp(want, 1 - Math.exp(-6 * dt)); cam.position.copy(camPos);
    cam.lookAt(me.x + right.x * (innerWidth > 900 ? 1.0 : 0), me.y + 0.95, me.z + right.z * (innerWidth > 900 ? 1.0 : 0));
    cam.fov = 50; cam.updateProjectionMatrix(); setListener(camPos.x, camPos.y, camPos.z, me.yaw); return;
  }
  const lobby = G.mapId === LOBBY;
  const pivot = V.set(me.x, me.y + (me.crouch ? 1.0 : 1.5), me.z);
  const dist = lobby ? Math.max(4.5, prof.zoom + 1.5) : prof.zoom;
  const cp = Math.cos(me.camPitch), fwd = V2.set(-Math.sin(me.camYaw) * cp, Math.sin(me.camPitch), -Math.cos(me.camYaw) * cp);
  const want = pivot.clone().addScaledVector(fwd, -dist);
  const hit = S.segMap(G.map, pivot.x, pivot.y, pivot.z, want.x, want.y, want.z);
  const pos = hit ? pivot.clone().lerp(want, Math.max(0, hit.t - 0.08 / dist)) : want;
  camPos.copy(pos);
  cam.position.copy(camPos);
  cam.lookAt(pivot.clone().addScaledVector(fwd, 4));
  cam.fov += ((mobile ? 72 : 68) - cam.fov) * (1 - Math.exp(-10 * dt)); cam.updateProjectionMatrix();
  setListener(camPos.x, camPos.y, camPos.z, me.camYaw);
}
function tagCandidate() {
  if (!me.seeker || G.state !== 'seek') return null;
  const eye = S.eyeOf(me);
  let best = null, bd = S.TAG_R - 0.15;
  for (const e of G.ents.values()) {
    if (e.id === myId || e.seeker) continue;
    const d = Math.hypot(e.x - me.x, e.z - me.z, (e.y - me.y) * 0.8);
    if (d < bd && (S.seesBody(G.map, eye, { x: e.x, y: e.y, z: e.z, crouch: !!(e.flags & 1) }) || d < 1.1)) { bd = d; best = e; }
  }
  return best;
}
function updateHUD(dt) {
  const lobby = G.mapId === LOBBY;
  drawCoins();
  if (lobby) {
    $('prompt').innerHTML = onShopMat() && !shopOpen ? 'Press <b>E</b> to open the SHOP' + (mobile ? ' (or tap SHOP in the panel)' : '') : '';
    return;
  }
  const st = G.state, tl = Math.max(0, G.timeLeft | 0);
  $('timer').className = 'pill ' + (st === 'hide' ? 'hide' : st === 'seek' ? 'seek' : '');
  $('phase').textContent = st === 'hide' ? 'HIDE!' : st === 'seek' ? 'SEEK' : 'ROUND OVER';
  $('clock').textContent = `${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`;
  // countdown beeps
  if (st === 'hide' && tl <= 5 && tl > 0 && tl !== G.beepAt) { G.beepAt = tl; sfx.beep(false); }
  if (st === 'seek' && tl <= 10 && tl > 0 && tl !== G.beepAt) { G.beepAt = tl; sfx.tick(tl <= 3); }
  music.intensity = st === 'seek' ? Math.max(0, 1 - tl / 40) : 0;
  // blindfold for seekers while they count
  const blind = st === 'hide' && me.seeker;
  $('blind').classList.toggle('hidden', !blind);
  if (blind) $('blind-t').textContent = `COUNTING… ${Math.max(1, Math.ceil(G.timeLeft))}`;
  // role badge
  const r = $('role');
  r.className = 'pill ' + (me.seeker ? 'seeker' : 'hider');
  r.innerHTML = me.seeker ? `🔎 SEEKER<small>${st === 'hide' ? 'counting…' : 'find them all! click to tag'}</small>` : `🙈 HIDER<small>${st === 'hide' ? 'hide before time runs out!' : 'stay hidden · F to taunt (+5)'}</small>`;
  // who's left
  const all = [...G.ents.values()], hiders = all.filter(e => !e.seeker), seekers = all.filter(e => e.seeker);
  $('left').innerHTML = `<small>HIDERS LEFT</small> <b>${hiders.length}</b><div class="dots">${all.sort((a, b) => a.seeker - b.seeker).map(e => `<span class="d ${e.seeker ? 'found' : ''}" title="${esc(e.name)}" style="background:${esc(e.color)}"></span>`).join('')}</div><small>${seekers.length} SEEKER${seekers.length === 1 ? '' : 'S'}</small>`;
  // prompts
  let pr = '';
  const cand = tagCandidate();
  if (cand) pr = `CLICK to tag <b>${esc(cand.name)}</b>!`;
  else if (!me.seeker && st === 'hide' && me.onGround && !me.crouch && S.lowCeiling(G.map, me.x, me.y, me.z)) pr = 'Press C to duck under here';
  else if (!me.seeker && st === 'hide' && tl <= 10) pr = 'Hurry — hide!';
  $('prompt').innerHTML = pr;
  $('keys').textContent = me.seeker ? 'WASD move · Mouse look · Click / E tag · Space jump · Shift sprint · Scroll zoom · Tab scores · T chat · Esc menu'
    : 'WASD move · Mouse look · C duck · Space jump · Shift sprint · F taunt · Scroll zoom · Tab scores · T chat · Esc menu';
  $('t-act').textContent = me.seeker ? 'TAG' : 'TAUNT';
  // heartbeat when a seeker is close
  let near = 1e9;
  if (!me.seeker && st === 'seek') for (const e of seekers) near = Math.min(near, Math.hypot(e.x - me.x, e.z - me.z, (e.y - me.y) * 0.5));
  const fear = near < 14 ? 1 - near / 14 : 0;
  $('vign').style.opacity = fear * (0.55 + Math.sin(performance.now() / 1000 * (4 + fear * 6)) * 0.15);
  G.hbT -= dt;
  if (fear > 0 && G.hbT <= 0) { G.hbT = 1.1 - fear * 0.7; sfx.heartbeat(0.4 + fear * 0.6); }
  // scoreboard
  const showBoard = keys.has('Tab');
  $('board').classList.toggle('hidden', !showBoard);
  if (showBoard) $('board').innerHTML = `<table><tr><th>GOOGLY</th><th>ROLE</th><th class="r">PING</th></tr>${all.sort((a, b) => a.seeker - b.seeker).map(e => `<tr class="${e.id === myId ? 'me' : ''}"><td><span class="dot" style="background:${esc(e.color)}"></span> ${esc(e.name)}${e.bot ? ' <small>(CPU)</small>' : ''}</td><td>${e.seeker ? '🔎 seeker' : '🙈 hiding'}</td><td class="r">${e.id === myId ? Math.round(rtt * 1000) + 'ms' : e.bot ? '—' : ''}</td></tr>`).join('')}</table><p class="tiny">${esc(G.map.name)} · lobby ${esc(room?.code || '')}</p>`;
}

// ------------------------------------------------------------------ end of round
function showEnd(m) {
  G.state = 'end'; G.winner = m.winner;
  unlock();
  const iWon = (m.winner === 'seekers') === me.seeker;
  $('end-title').innerHTML = m.winner === 'hiders' ? '🙈 THE HIDERS WIN!' : '🔎 THE SEEKERS WIN!';
  $('end-sub').textContent = m.winner === 'hiders' ? `Time's up — somebody stayed hidden the whole ${Math.round(m.seekT / 60 * 10) / 10} minutes!` : `Everyone was found in ${m.seekT} seconds.`;
  const fmt = s => s < 0 ? '—' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  $('end-list').innerHTML = `<div class="stand head"><span>#</span><span>GOOGLY</span><span>ROLE</span><span class="r">FOUND</span><span class="r">HID FOR</span></div>` + m.standings.map((s, i) => `<div class="stand ${i === 0 ? 'first' : ''}"><span>${i + 1}</span><span class="n"><span class="dot" style="background:${esc(s.color)}"></span>${esc(s.name)}${s.bot ? ' <small>(CPU)</small>' : ''}${s.id === myId ? ' <small>(you)</small>' : ''}</span><span class="${s.orig ? 'role-s' : 'role-h'}">${s.orig ? '🔎 seeker' : s.found ? '🙈 found' : '🙈 never found!'}</span><span class="r">${s.tags}</span><span class="r">${fmt(s.hid)}</span></div>`).join('');
  $('end-coins').classList.add('hidden');
  $('end-again').classList.toggle('hidden', !amHost());
  if (iWon) { sfx.win(); world.confetti({ x: me.x, y: me.y + 2, z: me.z }, 60); } else sfx.lose();
  music.play('end');
  show('scr-end');
  let n = 11; $('end-t').textContent = `Back to the Waiting Hall in ${n}…`;
  clearInterval(showEnd.iv); showEnd.iv = setInterval(() => { n--; $('end-t').textContent = n > 0 ? `Back to the Waiting Hall in ${n}…` : 'Back to the Waiting Hall…'; if (n <= 0 || !G) clearInterval(showEnd.iv); }, 1000);
}
function showCoins(m) {
  addCoins(m.total);
  const el = $('end-coins'); el.classList.remove('hidden');
  el.innerHTML = `<span class="coins"><i class="coin"></i>+${m.total} coins</span><br><ul>${m.items.map(([k, v]) => `<li><span>${esc(k)}</span><b>+${v}</b></li>`).join('')}</ul><br><small>You have ${prof.coins} coins · spend them in the SHOP</small>`;
  setTimeout(() => sfx.coin(Math.ceil(m.total / 20)), 700);
}
$('end-again').onclick = () => { sfx.click(); send({ t: 'start' }); };
$('end-lobby').onclick = () => { sfx.click(); show(null); };
$('end-leave').onclick = () => { sfx.click(); leaveAll(); };

// ------------------------------------------------------------------ title backdrop: you (and your pet) in the Giant Bedroom, a purple googly chasing a brown one
let preview = null;
const PV = { cam: new THREE.Vector3(-14, 2.4, 4), look: new THREE.Vector3(1, 1.3, 1.5), at: new THREE.Vector3(-7.6, 0, 5.3) };
function showPreview() {
  world.load(ROOM);
  const fig = new Googly({ color: prof.color, skin: prof.skin, local: true });
  fig.group.position.copy(PV.at); world.actors.add(fig.group);
  preview = { fig, pet: null, petKind: null, t: +(Q.get('pt') || 0), chase: [] };
  setPet(preview, prof.pet);
  for (const [color, name] of [['#8a5a2b', 'runner'], ['#9b59ff', 'chaser']]) { const g = new Googly({ color, local: true }); world.actors.add(g.group); preview.chase.push({ g, name }); }
  preview.chase[1].g.setSeeker(true);
}
function menuUpdate(dt) {
  if (!preview) return;
  const P = preview; P.t += dt;
  const fig = P.fig, at = PV.at, cam = world.camera, wide = innerWidth > 900;
  const face = Math.atan2(PV.cam.x - at.x, PV.cam.z - at.z);
  fig.group.rotation.y = face + Math.sin(P.t * 0.5) * 0.3;
  if (Math.sin(P.t * 0.9) > 0.985 && fig.tauntT <= 0) fig.taunt();
  fig.update(dt, { speed: 0, pose: 'idle' });
  if (P.pet) P.pet.update(dt, at.x, 0, at.z, face + Math.PI, 0, false);
  // the chase: a purple seeker after a brown googly, round and round the rug
  const loop = a => [0.5 + Math.cos(a) * 6.0, 1.5 + Math.sin(a) * 4.0];
  const base = -P.t * 0.7;
  P.chase.forEach((c, i) => {
    const a = base + i * 0.6, [x, z] = loop(a), [x2, z2] = loop(a - 0.01);
    c.g.group.position.set(x, 0, z); c.g.group.rotation.y = Math.atan2(x2 - x, z2 - z);
    if (i === 1) c.g.reachT = 0.2;
    c.g.update(dt, { speed: 6.2, onGround: true });
  });
  if (Q.has('cam')) { updateCameraFixed(); return; }
  if (shopOpen) {
    // close-up, googly on the right of the screen
    const to = V.set(PV.cam.x - at.x, 0, PV.cam.z - at.z).normalize(), right = V2.set(-to.z, 0, to.x);
    cam.position.set(at.x + to.x * 3.3 + right.x * (wide ? 1.2 : 0), 1.45, at.z + to.z * 3.3 + right.z * (wide ? 1.2 : 0));
    cam.lookAt(at.x + right.x * (wide ? 1.25 : 0), 0.95, at.z + right.z * (wide ? 1.25 : 0));
    cam.fov = 46;
  } else {
    const sway = Math.sin(P.t * 0.15) * 0.8;
    cam.position.set(PV.cam.x + sway, PV.cam.y, PV.cam.z - sway * 0.5);
    cam.lookAt(PV.look.x + (wide ? 0 : -2.5), PV.look.y, PV.look.z);
    cam.fov = 52;
  }
  cam.updateProjectionMatrix();
  setListener(cam.position.x, cam.position.y, cam.position.z, 0);
}
function updateCameraFixed() { const v = Q.get('cam').split(',').map(Number), cam = world.camera; cam.position.set(v[0], v[1], v[2]); cam.lookAt(v[3], v[4], v[5]); cam.fov = +(Q.get('fov') || 60); cam.updateProjectionMatrix(); }

// ------------------------------------------------------------------ main loop
function frame() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  if (G) {
    updateLocal(dt);
    updateEnts(dt);
    updateCamera(dt);
    updateHUD(dt);
  } else menuUpdate(dt);
  world.update(dt, t);
  world.renderer.render(world.scene, world.camera);
  if (Q.has('dbg')) { const d = $('dbg') || document.body.appendChild(Object.assign(document.createElement('pre'), { id: 'dbg', style: 'position:fixed;left:0;bottom:140px;z-index:99;color:#0f0;background:#000a;font-size:12px' })); d.textContent = JSON.stringify({ myId, map: G?.mapId, state: G?.state, me: [me.x, me.y, me.z, me.camYaw, me.camPitch].map(v => +v.toFixed(2)), cam: world.camera.position.toArray().map(v => +v.toFixed(2)), ents: G ? [...G.ents.values()].map(e => [e.name, +e.x.toFixed(1), +e.z.toFixed(1)]) : [] }); }
  requestAnimationFrame(frame);
}
if (!Q.has('icon')) {
  showPreview(); connect(); frame();
  if (Q.has('shop')) { openShop(); if (Q.get('shop') === 'pets') { shopTab = 'pets'; seg($('shop-tab'), 'pets', v => { shopTab = v; drawShop(); }); drawShop(); } }
  if (Q.has('pet')) { prof.pet = Q.get('pet'); lookChanged(); }
  if (Q.has('skin')) { prof.skin = Q.get('skin'); lookChanged(); }
}

// test hooks
window.__gs = { get G() { return G; }, me, world, send, get room() { return room; }, prof };
if (Q.has('icon')) import('./icon.js').then(m => m.renderIcon());
