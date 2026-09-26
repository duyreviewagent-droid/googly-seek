// Headless check: a solo round where the tester stands still as a hider; CPUs do everything else.
// Usage: node test/bots.mjs [diff 0-2] [cpus] [seekSeconds]   (URL=ws://localhost:PORT)
import WebSocket from 'ws';
const url = process.env.URL || 'ws://localhost:8123';
const diff = +(process.argv[2] ?? 1), cpus = +(process.argv[3] || 7), seek = +(process.argv[4] || 120);
const ws = new WebSocket(url);
let me, names = {}, t0 = Date.now(), pos = null, world = -1, caught = [], taunts = 0, squeaks = 0, reach = 0;
const sec = () => ((Date.now() - t0) / 1000).toFixed(1);
ws.on('open', () => { ws.send(JSON.stringify({ t: 'me', name: 'TESTER', color: '#8a5a2b' })); ws.send(JSON.stringify({ t: 'quick', cpus, diff, hide: 10, seek, role: process.env.ROLE || 'hide', map: +(process.env.MAP ?? -1) })); });
ws.on('message', raw => {
  const m = JSON.parse(raw);
  if (m.t === 'hello') me = m.id;
  if (m.t === 'world') { world = m.map; for (const p of m.players) names[p.id] = p.name + (p.seeker ? '(S)' : ''); pos = m.players.find(p => p.id === me); console.log(sec(), 'world', m.map, m.state, 'seekers:', m.players.filter(p => p.seeker).map(p => p.name).join(',')); }
  if (m.t === 'phase') console.log(sec(), 'phase', m.state);
  if (m.t === 'caught') { caught.push(sec()); console.log(sec(), `  ${names[m.by]} found ${names[m.tg]} (${m.left} left)`); }
  if (m.t === 'taunt') taunts++;
  if (m.t === 'squeak') squeaks++;
  if (m.t === 'reach') reach++;
  if (m.t === 'snap' && pos) ws.send(JSON.stringify({ t: 'st', w: world, x: pos.x, y: pos.y, z: pos.z, yaw: 0, g: 1 }));
  if (m.t === 'coins') console.log(sec(), 'my coins', JSON.stringify(m.items), '=', m.total);
  if (m.t === 'end') {
    console.log(sec(), `END winner=${m.winner} after ${m.seekT}s of seeking; taunts ${taunts} squeaks ${squeaks} reaches ${reach}`);
    console.log(m.standings.map(s => `${s.name}${s.orig ? '*' : ''}: tags ${s.tags} hid ${s.hid}`).join(' | '));
    setTimeout(() => process.exit(0), 300);
  }
});
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, (seek + 40) * 1000);
