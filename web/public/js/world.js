// Draws the Giant Bedroom and the Waiting Hall. Every texture is painted on a canvas at load — nothing to download.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MAPS } from './maps.js';

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const texCache = new Map();
function tex(key, w, h, draw, rep = [1, 1]) {
  let base = texCache.get(key);
  if (!base) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    base = new THREE.CanvasTexture(c); base.colorSpace = THREE.SRGBColorSpace; base.anisotropy = 8;
    base.wrapS = base.wrapT = THREE.RepeatWrapping;
    texCache.set(key, base);
  }
  if (rep[0] === 1 && rep[1] === 1) return base;
  const t = base.clone(); t.repeat.set(rep[0], rep[1]); t.needsUpdate = true;
  return t;
}
const noiseFill = (g, w, h, n, cols, size = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(Math.random() * w, Math.random() * h, size, size); } };
const std = o => new THREE.MeshStandardMaterial(o);
const phys = o => new THREE.MeshPhysicalMaterial(o);
const FABRIC = ['#e84a5f', '#2a9df4', '#ffc93c', '#6ab04c', '#9b59ff', '#ff8c42', '#f78fb3', '#3dc1d3', '#f5f6fa', '#2f3542'];

// ------------------------------------------------------------------ textures
const T = {
  floor: rep => tex('floor', 1024, 1024, (g, w, h) => {
    const r = rng(7);
    for (let y = 0; y < h; y += 64) {
      let x = -r() * 300;
      while (x < w) {
        const len = 260 + r() * 360, tone = 150 + r() * 40;
        g.fillStyle = `rgb(${tone + 30},${tone * 0.72},${tone * 0.42})`; g.fillRect(x, y, len, 63);
        for (let k = 0; k < 26; k++) { g.strokeStyle = `rgba(90,50,20,${0.08 + r() * 0.14})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const yy = y + r() * 63; g.moveTo(x, yy); g.bezierCurveTo(x + len * 0.3, yy + (r() - 0.5) * 8, x + len * 0.7, yy + (r() - 0.5) * 8, x + len, yy + (r() - 0.5) * 4); g.stroke(); }
        if (r() < 0.25) { g.fillStyle = 'rgba(80,40,15,.35)'; g.beginPath(); g.ellipse(x + r() * len, y + 32, 6 + r() * 6, 3 + r() * 3, 0, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(40,20,5,.55)'; g.fillRect(x + len - 2, y, 2, 64);
        x += len;
      }
      g.fillStyle = 'rgba(40,20,5,.6)'; g.fillRect(0, y + 62, w, 2);
    }
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,255,255,.04)'); gr.addColorStop(1, 'rgba(0,0,0,.05)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, rep),
  wallpaper: rep => tex('wallpaper', 512, 512, (g, w, h) => {
    g.fillStyle = '#bcd8f2'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x, 0, 22, h); }
    const star = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); };
    const r = rng(3);
    for (let i = 0; i < 26; i++) star(r() * w, r() * h, 6 + r() * 8, ['#fff7c2', '#ffffff', '#ffd6e7'][i % 3]);
    for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); const x = r() * w, y = r() * h; g.arc(x, y, 7, 0, 7); g.arc(x + 9, y - 4, 9, 0, 7); g.arc(x + 20, y, 7, 0, 7); g.fill(); }
    noiseFill(g, w, h, 3000, ['rgba(0,0,0,.025)', 'rgba(255,255,255,.04)'], 2);
  }, rep),
  hallpaper: rep => tex('hallpaper', 256, 256, (g, w, h) => {
    g.fillStyle = '#ffe3a8'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { g.fillStyle = x % 64 ? '#ffd27a' : '#ffc4d8'; g.fillRect(x, 0, 16, h); }
    g.fillStyle = 'rgba(255,255,255,.5)'; for (let y = 16; y < h; y += 64) for (let x = 8; x < w; x += 32) { g.beginPath(); g.arc(x, y + (x % 64 ? 32 : 0), 4, 0, 7); g.fill(); }
  }, rep),
  tiles: rep => tex('tiles', 256, 256, (g, w, h) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#7a4ad8' : '#f4efe6'; g.fillRect(x * 64, y * 64, 64, 64); }
    noiseFill(g, w, h, 4000, ['rgba(0,0,0,.05)', 'rgba(255,255,255,.06)'], 2);
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  }, rep),
  wood: (rep, tone = 0) => tex('wood' + tone, 512, 512, (g, w, h) => {
    const base = [[196, 146, 96], [120, 78, 46], [236, 214, 180], [150, 60, 60]][tone];
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, w, h);
    const r = rng(11 + tone);
    for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(${base[0] * 0.55},${base[1] * 0.5},${base[2] * 0.45},${0.12 + r() * 0.2})`; g.lineWidth = 1 + r() * 3; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 20, w * 0.6, y + (r() - 0.5) * 20, w, y + (r() - 0.5) * 10); g.stroke(); }
    noiseFill(g, w, h, 3000, ['rgba(0,0,0,.04)', 'rgba(255,255,255,.04)'], 2);
  }, rep),
  quilt: () => tex('quilt', 512, 512, (g, w) => {
    const r = rng(5), cs = ['#ff8fa3', '#ffd166', '#8ecae6', '#b5e48c', '#cdb4db', '#ffb4a2', '#90e0ef'];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      g.fillStyle = cs[Math.floor(r() * cs.length)]; g.fillRect(x * 64, y * 64, 64, 64);
      const k = r();
      g.fillStyle = 'rgba(255,255,255,.55)';
      if (k < 0.3) { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(x * 64 + 8 + i * 16, y * 64 + 8 + j * 16, 3, 0, 7); g.fill(); } }
      else if (k < 0.6) { for (let i = 0; i < 64; i += 12) g.fillRect(x * 64 + i, y * 64, 5, 64); }
      else if (k < 0.8) { g.beginPath(); g.moveTo(x * 64 + 32, y * 64 + 12); g.lineTo(x * 64 + 52, y * 64 + 32); g.lineTo(x * 64 + 32, y * 64 + 52); g.lineTo(x * 64 + 12, y * 64 + 32); g.fill(); }
      g.strokeStyle = 'rgba(80,40,40,.35)'; g.setLineDash([4, 4]); g.lineWidth = 2; g.strokeRect(x * 64 + 3, y * 64 + 3, 58, 58); g.setLineDash([]);
    }
  }),
  fabric: (a, b, key = '') => tex('fab' + a + b + key, 256, 256, (g, w, h) => {
    g.fillStyle = a; g.fillRect(0, 0, w, h);
    g.fillStyle = b; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 32, h);
    for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(0,0,0,${0.03 + (y % 6 ? 0 : 0.03)})`; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 3) { g.fillStyle = 'rgba(255,255,255,.03)'; g.fillRect(x, 0, 1, h); }
  }),
  rug: () => tex('rug', 512, 512, (g, w) => {
    g.fillStyle = '#00000000'; g.clearRect(0, 0, w, w);
    const cs = ['#e84a5f', '#ff8c42', '#ffc93c', '#6ab04c', '#2a9df4', '#9b59ff', '#f78fb3', '#f5f6fa'];
    for (let i = 0; i < 16; i++) { g.fillStyle = cs[i % cs.length]; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - i * 15, 0, 7); g.fill(); }
    noiseFill(g, w, w, 20000, ['rgba(0,0,0,.08)', 'rgba(255,255,255,.08)'], 2);
    g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 2, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
  }),
  cardboard: (label = '') => tex('card' + label, 512, 512, (g, w, h) => {
    g.fillStyle = '#c49a64'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 6) { g.fillStyle = 'rgba(120,80,40,.08)'; g.fillRect(x, 0, 3, h); }
    noiseFill(g, w, h, 5000, ['rgba(90,60,30,.12)', 'rgba(255,240,210,.08)'], 2);
    g.fillStyle = 'rgba(200,170,110,.85)'; g.fillRect(0, h * 0.44, w, h * 0.12);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, h * 0.45, w, 6);
    g.fillStyle = '#5a3a1a'; g.font = '900 54px "Arial Black", sans-serif'; g.textAlign = 'center';
    if (label) g.fillText(label, w / 2, h * 0.3);
    g.font = '900 30px "Arial Black", sans-serif'; g.fillText('↑ THIS WAY UP ↑', w / 2, h * 0.8);
    g.strokeStyle = '#5a3a1a'; g.lineWidth = 5; g.strokeRect(w * 0.08, h * 0.64, 70, 60); g.beginPath(); g.moveTo(w * 0.08 + 12, h * 0.64 + 30); g.lineTo(w * 0.08 + 58, h * 0.64 + 30); g.stroke();
  }),
  block: (letter, col) => tex('block' + letter + col, 256, 256, (g, w, h) => {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 14; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#fff'; g.font = '900 170px "Arial Black", Futura, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letter, w / 2, h / 2 + 8);
    g.fillStyle = 'rgba(0,0,0,.15)'; g.fillText(letter, w / 2 + 6, h / 2 + 14); g.fillStyle = '#fff'; g.fillText(letter, w / 2, h / 2 + 8);
    noiseFill(g, w, h, 1200, ['rgba(0,0,0,.05)', 'rgba(255,255,255,.05)'], 2);
  }),
  spines: seed => tex('spines' + seed, 512, 256, (g, w, h) => {
    const r = rng(seed); let x = 0;
    while (x < w) {
      const bw = 22 + r() * 40, col = ['#b83b3b', '#2f5d8a', '#3f7d4a', '#d9a441', '#6a3f8f', '#1f1f2a', '#c96a2a', '#2a8a8a', '#e0d6c0'][Math.floor(r() * 9)];
      const top = r() * h * 0.25;
      g.fillStyle = col; g.fillRect(x, top, bw - 2, h - top);
      g.fillStyle = 'rgba(255,215,120,.8)'; g.fillRect(x + 3, top + 18, bw - 8, 5); g.fillRect(x + 3, h - 30, bw - 8, 5);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 2, top, 4, h - top);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + bw - 5, top, 3, h - top);
      x += bw;
    }
  }),
  fur: col => tex('fur' + col, 256, 256, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.28; g.strokeStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); g.stroke(); } }),
  weave: () => tex('weave', 256, 256, (g, w, h) => { g.fillStyle = '#f0f0ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a3a3a55'; for (let y = 8; y < h; y += 32) for (let x = 8; x < w; x += 32) { g.beginPath(); g.roundRect(x, y, 16, 16, 5); g.fill(); } }),
  dollhouse: () => tex('dollhouse', 512, 512, (g, w, h) => {
    g.fillStyle = '#ffb3c7'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 24) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, y, w, 3); }
    const win = (x, y) => { g.fillStyle = '#fff'; g.fillRect(x - 6, y - 6, 92, 112); g.fillStyle = '#9ad4ff'; g.fillRect(x, y, 80, 100); g.fillStyle = '#fff'; g.fillRect(x + 37, y, 6, 100); g.fillRect(x, y + 47, 80, 6); g.fillStyle = '#ff6fa0'; g.fillRect(x - 12, y - 6, 8, 112); g.fillRect(x + 84, y - 6, 8, 112); };
    win(70, 60); win(360, 60);
  }),
  poster: kind => tex('poster' + kind, 256, 356, (g, w, h) => {
    if (kind === 0) { // googly poster
      g.fillStyle = '#2a1a4a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#9b59ff'; g.beginPath(); g.ellipse(w / 2, h * 0.55, 70, 95, 0, 0, 7); g.fill();
      for (const s of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2 + s * 28, h * 0.44, 24, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(w / 2 + s * 28 + 6, h * 0.44 + 10, 11, 0, 7); g.fill(); }
      g.fillStyle = '#ffd23a'; g.font = '900 40px Futura, "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText('GOOGLY', w / 2, 56); g.fillText('SEEK', w / 2, h - 26);
    } else if (kind === 1) { // rocket
      g.fillStyle = '#0b1a3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 80; i++) { g.fillStyle = '#fff'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.fillStyle = '#eee'; g.beginPath(); g.moveTo(w / 2, 50); g.quadraticCurveTo(w / 2 + 50, 140, w / 2 + 34, 250); g.lineTo(w / 2 - 34, 250); g.quadraticCurveTo(w / 2 - 50, 140, w / 2, 50); g.fill();
      g.fillStyle = '#e84a5f'; g.beginPath(); g.moveTo(w / 2 - 34, 250); g.lineTo(w / 2 - 70, 300); g.lineTo(w / 2 - 30, 280); g.fill(); g.beginPath(); g.moveTo(w / 2 + 34, 250); g.lineTo(w / 2 + 70, 300); g.lineTo(w / 2 + 30, 280); g.fill();
      g.fillStyle = '#6ad0ff'; g.beginPath(); g.arc(w / 2, 150, 20, 0, 7); g.fill(); g.fillStyle = '#ffb000'; g.beginPath(); g.moveTo(w / 2 - 22, 260); g.lineTo(w / 2, 340); g.lineTo(w / 2 + 22, 260); g.fill();
    } else { // dinosaur
      g.fillStyle = '#d9f0c8'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#4a9a3a'; g.beginPath(); g.ellipse(w / 2, 220, 80, 50, 0, 0, 7); g.fill(); g.fillRect(w / 2 + 40, 120, 30, 100); g.beginPath(); g.ellipse(w / 2 + 70, 118, 36, 22, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(w / 2 - 70, 220); g.lineTo(w / 2 - 125, 250); g.lineTo(w / 2 - 60, 240); g.fill(); for (const x of [-40, 0, 30]) g.fillRect(w / 2 + x, 250, 18, 40);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2 + 80, 112, 8, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(w / 2 + 82, 114, 4, 0, 7); g.fill();
      g.fillStyle = '#2a5a1a'; g.font = '900 34px "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText('RAWR!', w / 2, 60);
    }
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  }),
  sky: () => tex('skywin', 256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6fb3ff'); gr.addColorStop(0.7, '#cfe8ff'); gr.addColorStop(1, '#9fd08a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(255,255,255,.9)'; const x = Math.random() * w, y = 30 + Math.random() * 100; g.beginPath(); g.arc(x, y, 14, 0, 7); g.arc(x + 18, y - 6, 18, 0, 7); g.arc(x + 36, y, 13, 0, 7); g.fill(); } g.fillStyle = '#3f7d3a'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(i * 24, h - 30 + Math.random() * 10, 26, 0, 7); g.fill(); } }),
  bark: () => tex('bark', 128, 512, (g, w, h) => {
    g.fillStyle = '#5a3e28'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const x = Math.random() * w; g.strokeStyle = ['#2a1c12', '#7a5a3e', '#3a2818'][i % 3]; g.lineWidth = 2 + Math.random() * 5; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y < h; y += 30) g.lineTo(x + (Math.random() - 0.5) * 8, y); g.stroke(); }
  }),
  logEnd: () => tex('logEnd', 128, 128, (g, w) => { g.fillStyle = '#d8aa72'; g.fillRect(0, 0, w, w); for (let r = 60; r > 2; r -= 5) { g.strokeStyle = r % 10 ? '#b88a58' : '#9a6e44'; g.lineWidth = 1.5; g.beginPath(); g.arc(w / 2, w / 2, r, 0, 7); g.stroke(); } g.strokeStyle = '#5a3e28'; g.lineWidth = 8; g.beginPath(); g.arc(w / 2, w / 2, 60, 0, 7); g.stroke(); }),
  ktiles: rep => tex('ktiles', 256, 256, (g, w, h) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#c8643a' : '#f4ecd8'; g.fillRect(x * 64, y * 64, 64, 64); }
    noiseFill(g, w, h, 5000, ['rgba(0,0,0,.05)', 'rgba(255,255,255,.07)'], 2);
    g.strokeStyle = 'rgba(80,60,40,.35)'; g.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  }, rep),
  kitchenpaper: rep => tex('kpaper', 512, 512, (g, w, h) => {
    g.fillStyle = '#d8f0e0'; g.fillRect(0, 0, w, h);
    const r = rng(21);
    for (let i = 0; i < 16; i++) { const x = r() * w, y = r() * h; g.fillStyle = '#ffe066'; g.beginPath(); g.ellipse(x, y, 14, 10, r(), 0, 7); g.fill(); g.fillStyle = '#6ab04c'; g.beginPath(); g.ellipse(x + 12, y - 10, 7, 3, -0.6, 0, 7); g.fill(); }
    for (let i = 0; i < 10; i++) { const x = r() * w, y = r() * h; g.fillStyle = '#ff8c8c'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.fillStyle = '#6ab04c'; g.fillRect(x - 1, y - 14, 2, 6); }
    noiseFill(g, w, h, 3000, ['rgba(0,0,0,.02)', 'rgba(255,255,255,.05)'], 2);
  }, rep),
  subway: rep => tex('subway', 256, 256, (g, w, h) => { g.fillStyle = '#b8c4c8'; g.fillRect(0, 0, w, h); for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) { g.fillStyle = '#f8fbfb'; g.fillRect(x * 64 + (y % 2) * 32 + 2, y * 32 + 2, 60, 28); } }, rep),
  grass: rep => tex('grass', 512, 512, (g, w, h) => {
    g.fillStyle = '#4f9a3c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30000; i++) { const x = Math.random() * w, y = Math.random() * h; g.strokeStyle = ['#5fae48', '#3f8a30', '#6cbc52', '#468f36'][i % 4]; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 3, y - 4 - Math.random() * 6); g.stroke(); }
    g.globalAlpha = 1; for (let i = 0; i < 30; i++) { g.fillStyle = ['#fff', '#ffe066', '#ffb3c7'][i % 3]; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 2.5, 0, 7); g.fill(); }
  }, rep),
  planks: rep => tex('planks', 512, 256, (g, w, h) => {
    for (let x = 0; x < w; x += 42) { const t = 140 + Math.random() * 40; g.fillStyle = `rgb(${t + 20},${t * 0.72},${t * 0.45})`; g.fillRect(x, 0, 40, h); for (let k = 0; k < 20; k++) { g.fillStyle = 'rgba(70,40,15,.18)'; g.fillRect(x + Math.random() * 40, Math.random() * h, 1, 20 + Math.random() * 60); } g.fillStyle = 'rgba(30,15,5,.5)'; g.fillRect(x + 40, 0, 2, h); g.fillStyle = '#333'; g.fillRect(x + 18, 30, 4, 4); g.fillRect(x + 18, h - 34, 4, 4); }
  }, rep),
  brick: rep => tex('brick', 512, 512, (g, w, h) => {
    g.fillStyle = '#d8d0c4'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 16; row++) for (let col = -1; col < 9; col++) { const x = col * 64 + (row % 2) * 32, y = row * 32; g.fillStyle = `rgb(${160 + Math.random() * 40},${70 + Math.random() * 20},${50 + Math.random() * 15})`; g.fillRect(x + 2, y + 2, 60, 28); }
    noiseFill(g, w, h, 8000, ['rgba(0,0,0,.1)', 'rgba(255,255,255,.06)'], 2);
  }, rep),
  leaves: col => tex('leaves' + col, 256, 256, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { const x = Math.random() * w, y = Math.random() * h; g.fillStyle = Math.random() < 0.5 ? 'rgba(0,40,0,.25)' : 'rgba(200,255,150,.18)'; g.beginPath(); g.ellipse(x, y, 7, 3.5, Math.random() * 6, 0, 7); g.fill(); } }),
  sand: rep => tex('sand', 256, 256, (g, w, h) => { g.fillStyle = '#ecd49a'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 20000, ['#d8bc80', '#f6e2b0', '#c8a868'], 2); }, rep),
  steel: () => tex('steelk', 256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#c8ccd0'); gr.addColorStop(0.5, '#eef0f2'); gr.addColorStop(1, '#b8bcc0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(Math.random() * w, Math.random() * h, 40, 1); } }),
  sign: (text, bg, fg) => tex('sign' + text, 512, 128, (g, w, h) => { g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 24); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 8; g.stroke(); g.fillStyle = fg; g.font = '900 70px Futura, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4); }),
};

export class World {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: /shot|icon/.test(location.search) });
    this.lq = /lq=1/.test(location.search);
    this.renderer.setPixelRatio(this.lq ? 0.6 : Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.env;
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.05, 400);
    this.canvas = canvas;
    this.parts = []; this.mapId = -1;
    this.resize();
    addEventListener('resize', () => this.resize());
    new ResizeObserver(() => this.resize()).observe(canvas);
  }
  resize() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  clear() { if (this.level) { this.scene.remove(this.level); this.level.traverse(o => { o.geometry?.dispose?.(); }); } this.parts = []; this.swings = this.butterflies = this.flag = this.duck = this.clockHands = this.spinCoin = this.shopRing = null; }

  load(id) {
    if (this.mapId === id && this.level) { // same place: just drop the players (callers re-add them)
      for (const o of [...this.actors.children]) this.actors.remove(o);
      return this.map;
    }
    this.clear();
    this.mapId = id;
    const map = this.map = MAPS[id];
    const L = this.level = new THREE.Group(); this.scene.add(L);
    this.fx = new THREE.Group(); L.add(this.fx);
    this.actors = new THREE.Group(); L.add(this.actors);
    this.scene.background = new THREE.Color(0x1a1420);
    this.scene.fog = null;
    this.room(L, map);
    for (const c of map.colliders) this.drawCollider(L, c, map);
    [this.bedroomDressing, this.hallDressing, this.kitchenDressing, this.yardDressing][id].call(this, L, map);
    L.traverse(o => { if (o.isMesh && o.material && !o.userData.noShadow) { o.receiveShadow = true; } });
    return map;
  }

  // ------------------------------------------------------------------ the room shell: floor, walls, ceiling, window, door
  room(L, map) {
    if (map.outdoor) return this.yardShell(L, map);
    const W = map.W, D = map.D, H = map.roof, hall = map.ground === 'hall', kitchen = map.ground === 'kitchen';
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std({ map: hall ? T.tiles([W / 4, D / 4]) : kitchen ? T.ktiles([W / 6, D / 6]) : T.floor([W / 16, D / 16]), roughness: hall || kitchen ? 0.4 : 0.55, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2; L.add(floor);
    const paper = hall ? T.hallpaper : kitchen ? T.kitchenpaper : T.wallpaper;
    const wallMat = (w) => std({ map: paper([w / 8, H / 8]), roughness: 0.9 });
    const skirt = std({ map: T.wood([4, 1], 2), roughness: 0.6 });
    const addWall = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat(w)); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; L.add(m); return m; };
    // the back wall (z = -D/2) may have a window
    const win = map.window, wx0 = win?.x0, wx1 = win?.x1, wy0 = win?.y0, wy1 = win?.y1;
    if (win) {
      addWall(W / 2 + wx0, H, (-W / 2 + wx0) / 2, H / 2, -D / 2, 0);
      addWall(W / 2 - wx1, H, (W / 2 + wx1) / 2, H / 2, -D / 2, 0);
      addWall(wx1 - wx0, wy0, (wx0 + wx1) / 2, wy0 / 2, -D / 2, 0);
      addWall(wx1 - wx0, H - wy1, (wx0 + wx1) / 2, (H + wy1) / 2, -D / 2, 0);
      // outer shell so the sun only gets in through the glass
      const shell = new THREE.Mesh(new THREE.BoxGeometry(W + 4, H + 4, 1), std({ color: 0x333333 })); shell.position.set(0, H / 2, -D / 2 - 1.2); shell.visible = false; shell.castShadow = true; L.add(shell);
      const shellHole = []; void shellHole;
      this.windowView(L, map, wx0, wx1, wy0, wy1);
    } else addWall(W, H, 0, H / 2, -D / 2, 0);
    addWall(W, H, 0, H / 2, D / 2, Math.PI);
    addWall(D, H, -W / 2, H / 2, 0, Math.PI / 2);
    addWall(D, H, W / 2, H / 2, 0, -Math.PI / 2);
    // skirting boards
    for (const [w, x, z, ry] of [[W, 0, -D / 2 + 0.1, 0], [W, 0, D / 2 - 0.1, Math.PI], [D, -W / 2 + 0.1, 0, Math.PI / 2], [D, W / 2 - 0.1, 0, -Math.PI / 2]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, 0.2), skirt); b.position.set(x, 0.4, z); b.rotation.y = ry; L.add(b);
    }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std({ color: hall ? 0xfff4e0 : 0xf4f1ea, roughness: 0.95 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; L.add(ceil);
    // lights
    const hemi = new THREE.HemisphereLight(0xfff4e6, 0x6a5040, hall ? 1.2 : 0.95); L.add(hemi);
    this.scene.environmentIntensity = 0.45;
    if (!hall) {
      const sun = new THREE.DirectionalLight(0xfff1d6, 3.2);
      const wc = (wx0 + wx1) / 2;
      sun.position.set(wc - 14, 30, -60); sun.target.position.set(wc + 4, 0, 6);
      sun.castShadow = true; sun.shadow.mapSize.set(this.lq ? 1024 : 4096, this.lq ? 1024 : 4096); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
      Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 40, bottom: -40, near: 10, far: 140 });
      L.add(sun); L.add(sun.target);
      // ceiling lamp + bedside lamp
      if (kitchen) for (const x of [-12, 12]) { const l = new THREE.PointLight(0xfff0d8, 150, 60, 1.35); l.position.set(x, H - 2.2, 1); L.add(l); }
      else {
        const lamp = new THREE.PointLight(0xffe6c0, 220, 70, 1.35); lamp.position.set(0, H - 2.2, 2); L.add(lamp);
        const bed = new THREE.PointLight(0xffc27a, 40, 20, 1.6); bed.position.set(-14.6, 7.4, -21); L.add(bed);
      }
    } else {
      const key = new THREE.DirectionalLight(0xfff0dc, 2.2); key.position.set(10, 20, 14); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03;
      Object.assign(key.shadow.camera, { left: -22, right: 22, top: 16, bottom: -16, near: 1, far: 60 }); L.add(key);
      for (const x of [-9, 9]) { const l = new THREE.PointLight(0xffe0b0, 90, 40, 1.4); l.position.set(x, H - 1.5, 0); L.add(l); }
    }
  }
  windowView(L, map, x0, x1, y0, y1) {
    const z = -map.D / 2, cx = (x0 + x1) / 2;
    const frameM = std({ color: 0xf6f3ec, roughness: 0.5 });
    const bar = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), frameM); m.position.set(x, y, z + 0.05); m.castShadow = true; L.add(m); };
    bar(x1 - x0 + 0.6, 0.4, cx, y0); bar(x1 - x0 + 0.6, 0.4, cx, y1); bar(0.4, y1 - y0, x0, (y0 + y1) / 2); bar(0.4, y1 - y0, x1, (y0 + y1) / 2);
    bar(0.25, y1 - y0, cx, (y0 + y1) / 2); bar(x1 - x0, 0.25, cx, (y0 + y1) / 2);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 1.4, 0.3, 1.4), frameM); sill.position.set(cx, y0 - 0.1, z + 0.6); sill.castShadow = true; L.add(sill);
    const view = new THREE.Mesh(new THREE.PlaneGeometry(40, 26), new THREE.MeshBasicMaterial({ map: T.sky(), toneMapped: false })); view.position.set(cx, 8, z - 12); L.add(view);
    view.userData.noShadow = true;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), phys({ color: 0xdff2ff, roughness: 0.02, transmission: 0.95, transparent: true, opacity: 0.12 })); glass.position.set(cx, (y0 + y1) / 2, z); L.add(glass);
    glass.userData.noShadow = true;
    // curtain rod
    if (map.id === 0) { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 22, 12), std({ color: 0x8a6a3a, metalness: 0.6, roughness: 0.4 })); rod.rotation.z = Math.PI / 2; rod.position.set(0, 15.2, z + 1.6); L.add(rod); }
    // warm sunbeam on the floor, faked with a soft glow patch
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(14, 16), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.08, depthWrite: false })); beam.rotation.x = -Math.PI / 2; beam.position.set(cx + 2, 0.02, -12); L.add(beam);
  }

  // ------------------------------------------------------------------ furniture, one collider at a time
  drawCollider(L, c, map) {
    const m = c.m, top = c.y + c.h;
    const box = (w, h, d, mat, x = c.x, y = c.y, z = c.z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y + h / 2, z); o.castShadow = true; L.add(o); return o; };
    const rbox = (w, h, d, r, mat, x = c.x, y = c.y, z = c.z) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat); o.position.set(x, y + h / 2, z); o.castShadow = true; L.add(o); return o; };
    const cyl = (r0, r1, h, mat, x = c.x, y = c.y, z = c.z, seg = 24) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); o.position.set(x, y + h / 2, z); o.castShadow = true; L.add(o); return o; };
    const wood = (tone = 0, rep = [1, 1]) => std({ map: T.wood(rep, tone), roughness: 0.55 });
    const r = rng(Math.floor(c.x * 131 + c.z * 71 + c.h * 17 + 1000));
    switch (m) {
      case 'wall': break;
      case 'bedleg': cyl(c.r * 0.8, c.r, c.h, wood(3)); break;
      case 'bed': {
        box(c.w, 0.5, c.d, wood(3, [2, 1]));
        rbox(c.w - 0.3, 0.9, c.d - 0.3, 0.3, std({ color: 0xf6f4ef, roughness: 0.9 }), c.x, c.y + 0.45, c.z);
        // quilt draped over the top and down the sides
        const q = std({ map: T.quilt(), roughness: 0.95 });
        const quilt = rbox(c.w + 0.25, 0.35, c.d - 2.6, 0.15, q, c.x, c.y + 1.2, c.z + 1.3);
        void quilt;
        for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, c.d - 2.6), q); side.position.set(c.x + s * (c.w / 2 + 0.12), c.y + 0.95, c.z + 1.3); side.castShadow = true; L.add(side); }
        break;
      }
      case 'skirt': { const q = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h + 0.3, 0.12), std({ map: T.quilt(), roughness: 0.95 })); q.position.set(c.x, c.y + (c.h + 0.3) / 2, c.z); q.castShadow = true; L.add(q); break; }
      case 'pillow': {
        for (const s of [-1, 1]) { const p = new THREE.Mesh(new RoundedBoxGeometry(c.w / 2 - 0.3, c.h, c.d, 4, 0.5), std({ color: s < 0 ? 0xffffff : 0xcfe6ff, roughness: 0.95 })); p.position.set(c.x + s * c.w / 4, c.y + c.h / 2, c.z); p.rotation.x = -0.15; p.castShadow = true; L.add(p); }
        break;
      }
      case 'headboard': {
        box(c.w, c.h - 1, c.d, wood(3, [2, 1]));
        const arch = new THREE.Mesh(new THREE.CylinderGeometry(c.w / 2, c.w / 2, c.d, 40, 1, false, -Math.PI / 2, Math.PI), wood(3, [2, 1])); arch.rotation.x = Math.PI / 2; arch.scale.set(1, 1, 0.16); arch.position.set(c.x, c.y + c.h - 1, c.z); arch.castShadow = true; L.add(arch);
        const heart = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), std({ color: 0xff7aa2, roughness: 0.5 })); heart.scale.set(1, 1, 0.3); heart.position.set(c.x, c.y + c.h - 0.4, c.z + 0.4); L.add(heart);
        break;
      }
      case 'books': {
        // a stack of giant books, spines facing out
        let y = c.y; const cols = ['#b83b3b', '#2f5d8a', '#3f7d4a', '#d9a441', '#6a3f8f', '#c96a2a'];
        while (y < top - 0.05) {
          const hh = Math.min(top - y, 0.36 + r() * 0.2), ww = c.w - r() * 0.3, dd = c.d - r() * 0.3;
          const cover = std({ color: cols[Math.floor(r() * cols.length)], roughness: 0.6 }), pages = std({ color: 0xf2ead8, roughness: 0.9 });
          const b = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, dd), [cover, pages, cover, cover, pages, cover]);
          b.position.set(c.x + (r() - 0.5) * 0.15, y + hh / 2, c.z + (r() - 0.5) * 0.15); b.rotation.y = (r() - 0.5) * 0.12; b.castShadow = true; L.add(b);
          y += hh;
        }
        break;
      }
      case 'nightstand': {
        box(c.w, c.h, c.d, wood(2, [1, 1]));
        for (const y of [1.3, 2.9]) { const f = new THREE.Mesh(new THREE.BoxGeometry(c.w - 0.5, 1.2, 0.08), std({ color: 0xe8d6b8, roughness: 0.6 })); f.position.set(c.x, c.y + y, c.z + c.d / 2 + 0.04); L.add(f); const k = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), std({ color: 0xd4a52a, metalness: 0.8, roughness: 0.3 })); k.position.set(c.x, c.y + y, c.z + c.d / 2 + 0.18); L.add(k); }
        break;
      }
      case 'lamp': {
        cyl(0.7, 0.8, 0.3, std({ color: 0x3a8a9a, roughness: 0.4 }));
        cyl(0.1, 0.1, c.h - 0.6, std({ color: 0xd4a52a, metalness: 0.8, roughness: 0.3 }), c.x, c.y + 0.3);
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.3, 1.4, 24, 1, true), std({ color: 0xfff2c8, emissive: 0xffc070, emissiveIntensity: 0.6, side: THREE.DoubleSide, roughness: 0.8 }));
        shade.position.set(c.x, c.y + c.h + 0.1, c.z); L.add(shade);
        break;
      }
      case 'curtain': {
        const g = new THREE.PlaneGeometry(c.w, c.h, 40, 1), p = g.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 4.2) * 0.22); }
        g.computeVertexNormals();
        const cm = std({ map: T.fabric('#f0a6c0', '#f7c8d8', 'curt'), roughness: 0.95, side: THREE.DoubleSide });
        const cur = new THREE.Mesh(g, cm); cur.position.set(c.x, c.y + c.h / 2, c.z); cur.castShadow = true; L.add(cur);
        break;
      }
      case 'radiator': {
        const wm = std({ color: 0xf2f2f0, roughness: 0.35, metalness: 0.2 });
        for (let x = -c.w / 2 + 0.3; x < c.w / 2; x += 0.55) box(0.36, c.h, c.d, wm, c.x + x);
        box(c.w, 0.2, c.d * 0.6, wm, c.x, c.y + 0.3); box(c.w, 0.2, c.d * 0.6, wm, c.x, c.y + c.h - 0.5);
        break;
      }
      case 'doll': case 'dollfront': box(c.w, c.h, c.d, std({ map: T.dollhouse(), roughness: 0.7 })); break;
      case 'dollfloor': box(c.w, c.h, c.d, wood(0, [2, 1])); break;
      case 'dollroof': {
        const shape = new THREE.Shape(); shape.moveTo(-c.w / 2 - 0.5, 0); shape.lineTo(c.w / 2 + 0.5, 0); shape.lineTo(0, 3.4); shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: c.d + 0.6, bevelEnabled: false }); geo.translate(0, 0, -(c.d + 0.6) / 2);
        const roof = new THREE.Mesh(geo, std({ color: 0x9b3a5a, roughness: 0.6 })); roof.position.set(c.x, c.y, c.z); roof.castShadow = true; L.add(roof);
        box(c.w, c.h, c.d, std({ color: 0x9b3a5a }));
        const chim = box(0.8, 1.6, 0.8, std({ color: 0xc86a4a }), c.x + 2.5, c.y + 1.2, c.z); void chim;
        break;
      }
      case 'dollsofa': { rbox(c.w, c.h * 0.6, c.d, 0.15, std({ color: 0x3aa0d8, roughness: 0.8 })); rbox(c.w, c.h, 0.3, 0.12, std({ color: 0x3aa0d8, roughness: 0.8 }), c.x, c.y, c.z - c.d / 2 + 0.15); break; }
      case 'tent': {
        const fab = std({ map: T.fabric('#ffd166', '#ef476f', 'tent'), roughness: 0.9, side: THREE.DoubleSide });
        const cone = new THREE.Mesh(new THREE.ConeGeometry(c.r + 0.3, 7.5, 6, 1, true, 0.5, Math.PI * 2 - 1.0), fab); cone.position.set(c.x, 3.75, c.z); cone.castShadow = true; L.add(cone);
        // door flaps tied back
        for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 4.5), fab); f.position.set(c.x + s * 1.7, 2.25, c.z + 2.9); f.rotation.y = s * 0.7; L.add(f); }
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 9, 8), wood(1)); pole.position.set(c.x, 4.5, c.z); L.add(pole);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.6), std({ color: 0x118ab2, side: THREE.DoubleSide })); flag.position.set(c.x + 0.5, 8.6, c.z); L.add(flag);
        const blanket = new THREE.Mesh(new THREE.CircleGeometry(c.r * 0.8, 24), std({ color: 0x8ecae6, roughness: 1 })); blanket.rotation.x = -Math.PI / 2; blanket.position.set(c.x, 0.03, c.z); L.add(blanket);
        break;
      }
      case 'wardrobe': box(c.w, c.h, c.d, wood(0, [Math.max(1, c.w / 6), c.h / 6])); break;
      case 'wplinth': box(c.w, c.h, c.d, wood(1)); break;
      case 'wdoor': case 'wdoorOpen': {
        box(c.w, c.h, c.d, wood(0, [1, 2]));
        const along = c.w > c.d, face = along ? [0, 0, c.d / 2 + 0.05] : [c.w / 2 + 0.05, 0, 0];
        const panel = new THREE.Mesh(new THREE.BoxGeometry(along ? c.w - 1 : 0.06, c.h - 2, along ? 0.06 : c.d - 1), wood(2)); panel.position.set(c.x + face[0], c.y + c.h / 2, c.z + face[2]); L.add(panel);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), std({ color: 0xd4a52a, metalness: 0.8, roughness: 0.3 }));
        knob.position.set(c.x + (along ? c.w / 2 - 0.6 : face[0] + 0.15), c.y + c.h * 0.45, c.z + (along ? face[2] + 0.15 : -c.d / 2 + 0.6)); L.add(knob);
        break;
      }
      case 'clothes': {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 8.6, 8), std({ color: 0xc0c0c8, metalness: 0.9, roughness: 0.3 })); rail.rotation.z = Math.PI / 2; rail.position.set(26, c.y + c.h + 0.3, c.z); L.add(rail);
        for (let x = c.x - c.w / 2 + 0.4; x < c.x + c.w / 2; x += 0.7) {
          const col = FABRIC[Math.floor(r() * FABRIC.length)], hgt = 3 + r() * 2.2;
          const shirt = new THREE.Mesh(new RoundedBoxGeometry(0.35, hgt, c.d * 0.9, 2, 0.12), std({ map: T.fabric(col, col, 's'), roughness: 0.95 })); shirt.position.set(x, c.y + c.h - hgt / 2, c.z); shirt.castShadow = true; L.add(shirt);
          const hang = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 12, Math.PI), std({ color: 0x8a6a3a })); hang.position.set(x, c.y + c.h + 0.05, c.z); hang.rotation.y = Math.PI / 2; L.add(hang);
        }
        break;
      }
      case 'coat': { const coat = rbox(c.w, c.h, c.d, 0.3, std({ map: T.fabric('#6a4a2a', '#5a3e22', 'coat'), roughness: 0.95 })); coat.rotation.y = 0.05; for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), std({ color: 0x222222 })); b.position.set(c.x - c.w / 2 - 0.05, c.y + c.h * 0.4 + i * 1.3, c.z); L.add(b); } break; }
      case 'shoebox': { box(c.w, c.h, c.d, std({ map: T.cardboard('SHOES'), roughness: 0.8 })); box(c.w + 0.1, 0.25, c.d + 0.1, std({ color: 0xe84a5f, roughness: 0.6 }), c.x, top - 0.2); break; }
      case 'deskleg': cyl(c.r, c.r, c.h, wood(0)); break;
      case 'desk': {
        box(c.w, c.h, c.d, wood(0, [2, 2]));
        // laptop, pencil cup, globe
        const lap = new THREE.Group(); lap.position.set(c.x - 0.5, top, c.z - 1); L.add(lap);
        const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.8), std({ color: 0xc8ccd4, metalness: 0.8, roughness: 0.3 })); base.position.y = 0.06; lap.add(base);
        const scr = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 0.08), std({ color: 0xc8ccd4, metalness: 0.8, roughness: 0.3 })); scr.position.set(0, 0.9, 0.9); scr.rotation.x = 0.25; lap.add(scr);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.4), new THREE.MeshBasicMaterial({ color: 0x9ad4ff, toneMapped: false })); glow.position.set(0, 0.88, 0.85); glow.rotation.set(0.25, Math.PI, 0); lap.add(glow);
        lap.rotation.y = -Math.PI / 2;
        const cup = cyl(0.4, 0.35, 1.0, std({ color: 0xff8c42, roughness: 0.5 }), c.x + 1.8, top, c.z + 3.5); void cup;
        for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), std({ color: FABRIC[i] })); p.position.set(c.x + 1.8 + (r() - 0.5) * 0.3, top + 1.1, c.z + 3.5 + (r() - 0.5) * 0.3); p.rotation.set((r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4); L.add(p); }
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16), std({ color: 0x3a8adf, roughness: 0.4 })); globe.position.set(c.x + 1.5, top + 1.5, c.z - 4.3); L.add(globe);
        cyl(0.5, 0.6, 0.2, wood(1), c.x + 1.5, top, c.z - 4.3); cyl(0.05, 0.05, 0.7, wood(1), c.x + 1.5, top + 0.2, c.z - 4.3);
        break;
      }
      case 'chairleg': cyl(c.r, c.r, c.h, std({ color: 0xe84a5f, roughness: 0.4 })); break;
      case 'chair': rbox(c.w, c.h, c.d, 0.12, std({ color: 0xe84a5f, roughness: 0.4 })); break;
      case 'chairback': rbox(c.w, c.h, c.d, 0.15, std({ color: 0xe84a5f, roughness: 0.4 })); break;
      case 'bin': {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r * 0.85, c.h, 24, 1, true), std({ color: 0x6ab04c, roughness: 0.5, side: THREE.DoubleSide })); b.position.set(c.x, c.h / 2, c.z); b.castShadow = true; L.add(b);
        for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), std({ color: 0xf6f4ef, flatShading: true })); p.position.set(c.x + (r() - 0.5) * 0.8, c.h - 0.2 + r() * 0.3, c.z + (r() - 0.5) * 0.8); L.add(p); }
        break;
      }
      case 'shelf': case 'board': box(c.w, c.h, c.d, wood(1, [1, Math.max(1, c.d / 4)])); break;
      case 'bookrow': {
        const sp = T.spines(c.seed || 1), cover = std({ color: 0x5a3a2a, roughness: 0.7 });
        const face = std({ map: sp, roughness: 0.7 }); face.map = sp.clone(); face.map.repeat.set(Math.max(0.3, c.d / 4), 1); face.map.needsUpdate = true;
        const b = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), [face, cover, cover, cover, cover, cover]); b.position.set(c.x, c.y + c.h / 2, c.z); b.castShadow = true; L.add(b);
        break;
      }
      case 'bookflat': { const cover = std({ color: 0x2f5d8a, roughness: 0.6 }), pages = std({ color: 0xf2ead8, roughness: 0.9 }); const b = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), [pages, cover, cover, cover, pages, pages]); b.position.set(c.x, c.y + c.h / 2, c.z); b.castShadow = true; L.add(b); break; }
      case 'teddy': {
        const fur = std({ map: T.fur('#a8703a'), roughness: 1 }), light = std({ map: T.fur('#e0b080'), roughness: 1 });
        const g = new THREE.Group(); g.position.set(c.x, 0, c.z); g.rotation.y = Math.PI / 2 + 0.3; L.add(g);
        const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; g.add(o); return o; };
        add(new THREE.SphereGeometry(2, 24, 18), fur, 0, 1.9, 0, 1, 1.05, 0.9);
        add(new THREE.SphereGeometry(1.1, 18, 12), light, 0, 1.7, 1.2, 1, 1.1, 0.5);
        add(new THREE.SphereGeometry(1.35, 24, 18), fur, 0, 4.4, 0.2);
        add(new THREE.SphereGeometry(0.6, 16, 12), light, 0, 4.1, 1.35, 1, 0.8, 0.7);
        add(new THREE.SphereGeometry(0.2, 10, 8), std({ color: 0x1a1008, roughness: 0.3 }), 0, 4.3, 1.85);
        for (const s of [-1, 1]) {
          add(new THREE.SphereGeometry(0.5, 14, 10), fur, s * 1.0, 5.4, 0, 1, 1, 0.5); add(new THREE.SphereGeometry(0.28, 10, 8), light, s * 1.0, 5.4, 0.18, 1, 1, 0.4);
          add(new THREE.SphereGeometry(0.2, 12, 10), std({ color: 0x111111, roughness: 0.2 }), s * 0.5, 4.75, 1.18);
          add(new THREE.SphereGeometry(0.75, 14, 10), fur, s * 2.0, 2.3, 0.6, 0.7, 1.2, 0.7);
          add(new THREE.SphereGeometry(0.85, 14, 10), fur, s * 1.1, 0.6, 1.5, 0.8, 0.7, 1.2); add(new THREE.SphereGeometry(0.45, 12, 8), light, s * 1.1, 0.6, 2.4, 1, 1, 0.3);
        }
        const bow = add(new THREE.TorusGeometry(0.35, 0.14, 8, 16), std({ color: 0xe84a5f, roughness: 0.5 }), 0, 3.3, 1.3); bow.scale.set(1.6, 0.8, 1);
        break;
      }
      case 'ball': {
        const b = new THREE.Mesh(new THREE.SphereGeometry(c.r, 32, 20), phys({ map: tex('ballstripe', 256, 128, (g, w, h) => { const cs = ['#e84a5f', '#ffc93c', '#2a9df4', '#f5f6fa', '#6ab04c', '#ff8c42']; for (let i = 0; i < 6; i++) { g.fillStyle = cs[i]; g.fillRect(i * w / 6, 0, w / 6 + 1, h); } }), roughness: 0.25, clearcoat: 1 }));
        b.position.set(c.x, c.r, c.z); b.rotation.set(0.4, 0.3, 0.2); b.castShadow = true; L.add(b); break;
      }
      case 'ablock': case 'ablock2': case 'ablockS': {
        const n = m === 'ablock2' ? 2 : 1, hh = c.h / n;
        for (let i = 0; i < n; i++) {
          const letters = 'ABCGOSEKYZ', col = ['#e84a5f', '#2a9df4', '#ffc93c', '#6ab04c', '#9b59ff'][Math.floor(r() * 5)];
          const mats = [0, 1, 2, 3, 4, 5].map(k => std({ map: T.block(letters[Math.floor(r() * letters.length)], k === 2 ? col : ['#e84a5f', '#2a9df4', '#ffc93c', '#6ab04c', '#9b59ff'][(k + i) % 5]), roughness: 0.6 }));
          const b = new THREE.Mesh(new RoundedBoxGeometry(c.w, hh, c.d, 2, 0.08), mats); b.position.set(c.x, c.y + hh * i + hh / 2, c.z); b.rotation.y = (r() - 0.5) * 0.15; b.castShadow = true; L.add(b);
        }
        break;
      }
      case 'traincar': case 'engine': {
        const col = m === 'engine' ? 0xe84a5f : [0x2a9df4, 0xffc93c][Math.floor(r() * 2)];
        rbox(c.w, c.h - 0.5, c.d, 0.1, std({ color: col, roughness: 0.4 }), c.x, c.y + 0.4);
        if (m === 'engine') { cyl(0.35, 0.45, 1.0, std({ color: 0x222222 }), c.x + 0.9, top - 0.1); rbox(1.4, 1.0, c.d + 0.1, 0.1, std({ color: 0x2f3542 }), c.x - 0.8, top - 0.9); }
        else { for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), std({ color: FABRIC[(i * 3) % FABRIC.length] })); b.position.set(c.x - 0.8 + i * 0.8, top - 0.1, c.z); L.add(b); } }
        for (const x of [-c.w / 2 + 0.6, c.w / 2 - 0.6]) for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16), std({ color: 0x222222, roughness: 0.5 })); w.rotation.x = Math.PI / 2; w.position.set(c.x + x, 0.4, c.z + s * c.d / 2); L.add(w); }
        break;
      }
      case 'toybox': box(c.w, c.h, c.d, std({ map: T.fabric('#2a9df4', '#3aa9ff', 'toy'), roughness: 0.6 })); break;
      case 'beanbag': { const b = new THREE.Mesh(new THREE.SphereGeometry(c.r, 32, 20), std({ map: T.fabric('#e84a5f', '#d63c52', 'bean'), roughness: 0.9 })); b.scale.set(1, c.h / c.r / 1.7, 1); b.position.set(c.x, c.h * 0.5, c.z); b.castShadow = true; L.add(b); const dent = new THREE.Mesh(new THREE.SphereGeometry(c.r * 0.6, 20, 12), std({ color: 0xd63c52, roughness: 0.9 })); dent.scale.set(1, 0.4, 1); dent.position.set(c.x - 0.5, c.h * 0.85, c.z - 0.3); L.add(dent); break; }
      case 'cardboard': box(c.w, c.h, c.d, std({ map: T.cardboard(c.d > c.w ? '' : 'TOYS'), roughness: 0.85 })); break;
      case 'cardboardTop': box(c.w + 0.1, c.h, c.d + 0.1, std({ map: T.cardboard(''), roughness: 0.85 })); break;
      case 'flap': { const f = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, 0.08), std({ map: T.cardboard(''), roughness: 0.85 })); f.position.set(c.x, c.y + c.h / 2, c.z); f.rotation.x = 0.15; f.castShadow = true; L.add(f); break; }
      case 'dresser': {
        box(c.w, c.h, c.d, wood(2, [2, 1]));
        for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(c.w - 0.8, 1.1, 0.1), std({ color: 0xa8d8ea, roughness: 0.6 })); f.position.set(c.x, 0.65 + i * 1.3, c.z - c.d / 2 - 0.05); L.add(f); }
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 0.2), phys({ color: 0xffffff, metalness: 1, roughness: 0.05 })); mirror.position.set(c.x + 1, top + 3, c.z + c.d / 2 - 0.3); L.add(mirror);
        const frame = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.2, 8, 4), wood(1)); frame.rotation.z = Math.PI / 4; frame.scale.set(1, 1, 1); frame.position.copy(mirror.position); L.add(frame);
        break;
      }
      case 'drawer': {
        const d = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), [wood(2), wood(2), std({ color: 0xf2e8d8 }), wood(2), std({ color: 0xa8d8ea, roughness: 0.6 }), wood(2)]); d.position.set(c.x, c.y + c.h / 2, c.z); d.castShadow = true; L.add(d);
        const k = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), std({ color: 0xd4a52a, metalness: 0.8, roughness: 0.3 })); k.position.set(c.x, c.y + c.h / 2, c.z - c.d / 2 - 0.12); L.add(k);
        const sock = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.8, 4, 8), std({ color: FABRIC[Math.floor(r() * 8)] })); sock.rotation.z = Math.PI / 2; sock.position.set(c.x + (r() - 0.5) * 4, top + 0.12, c.z + (r() - 0.5) * 0.4); L.add(sock);
        break;
      }
      case 'piggy': {
        const pink = phys({ color: 0xff9ec0, roughness: 0.2, clearcoat: 1 });
        const b = new THREE.Mesh(new THREE.SphereGeometry(c.r, 20, 14), pink); b.scale.set(1.2, 0.9, 1); b.position.set(c.x, c.y + c.r * 0.9, c.z); b.castShadow = true; L.add(b);
        const sn = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 14), pink); sn.rotation.z = Math.PI / 2; sn.position.set(c.x + c.r * 1.3, c.y + c.r * 0.9, c.z); L.add(sn);
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.1), std({ color: 0x222222 })); slot.position.set(c.x, c.y + c.r * 1.72, c.z); L.add(slot);
        break;
      }
      case 'basket': box(c.w, c.h, c.d, std({ map: T.weave(), roughness: 0.6, transparent: false })); break;
      case 'basketTop': box(c.w, c.h, c.d, std({ map: T.weave(), roughness: 0.6 })); break;
      case 'laundry': {
        for (let i = 0; i < 26; i++) {
          const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (c.r - 0.3), col = FABRIC[Math.floor(r() * FABRIC.length)];
          const sz = 0.7 + r() * 0.9, y = Math.max(0.2, (1 - d / c.r) * c.h * 0.8 + r() * 0.3);
          const o = new THREE.Mesh(i % 3 ? new THREE.SphereGeometry(sz, 12, 8) : new RoundedBoxGeometry(sz * 2, sz * 0.5, sz * 1.4, 2, 0.2), std({ map: T.fabric(col, col === '#f5f6fa' ? '#dfe4ea' : col, 'l'), roughness: 0.95 }));
          o.position.set(c.x + Math.cos(a) * d, y * 0.8, c.z + Math.sin(a) * d); o.scale.y = 0.55; o.rotation.set(r(), r() * 3, r()); o.castShadow = true; L.add(o);
        }
        break;
      }
      case 'plant': case 'plantS': {
        const k = m === 'plantS' ? 0.6 : 1;
        cyl(c.r, c.r * 0.75, c.h, std({ color: 0xc8643a, roughness: 0.8 }));
        const soil = new THREE.Mesh(new THREE.CircleGeometry(c.r * 0.95, 20), std({ color: 0x3a2a1a })); soil.rotation.x = -Math.PI / 2; soil.position.set(c.x, c.h - 0.05, c.z); L.add(soil);
        const leaf = std({ color: 0x3f9a3a, roughness: 0.7, side: THREE.DoubleSide });
        for (let i = 0; i < 14; i++) {
          const g = new THREE.Group(); g.position.set(c.x, c.h, c.z); g.rotation.y = i * 2.4; L.add(g);
          const len = (3 + r() * 3) * k, l = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6), leaf); l.scale.set(0.5 * k, 0.06, len / 2); l.position.set(0, len * 0.45, len * 0.35); l.rotation.x = -0.9 + r() * 0.4; l.castShadow = true; g.add(l);
        }
        break;
      }
      case 'lego': {
        const mat = phys({ color: c.col || '#e84a5f', roughness: 0.3, clearcoat: 1 });
        box(c.w, c.h, c.d, mat);
        for (let i = -c.w / 2 + 0.25; i < c.w / 2; i += 0.5) for (let j = -c.d / 2 + 0.25; j < c.d / 2; j += 0.5) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 12), mat); s.position.set(c.x + i, top + 0.06, c.z + j); L.add(s); }
        break;
      }
      // ---------------- kitchen
      case 'worktop': box(c.w, c.h, c.d, std({ map: tex('marble', 512, 256, (g, w, h) => { g.fillStyle = '#f2f0ec'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(120,120,130,${0.08 + Math.random() * 0.15})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.3) * 60; y += (Math.random() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); } }, [3, 1]), roughness: 0.25 })); break;
      case 'cabinet': {
        box(c.w, c.h, c.d, std({ color: 0x5a9a8a, roughness: 0.5 }));
        const n = Math.max(1, Math.round(c.w / 4)), dw = c.w / n;
        for (let i = 0; i < n; i++) {
          const x = c.x - c.w / 2 + dw * (i + 0.5);
          const f = new THREE.Mesh(new THREE.BoxGeometry(dw - 0.3, c.h - 0.8, 0.12), std({ color: 0x6ab0a0, roughness: 0.45 })); f.position.set(x, c.y + c.h / 2 + 0.1, c.z + c.d / 2 + 0.06); L.add(f);
          const k = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), std({ color: 0xd8d8e0, metalness: 0.9, roughness: 0.2 })); k.position.set(x + dw / 2 - 0.5, c.y + c.h * 0.7, c.z + c.d / 2 + 0.2); L.add(k);
        }
        break;
      }
      case 'cupdoor': { box(c.w, c.h, c.d, std({ color: 0x6ab0a0, roughness: 0.45 })); break; }
      case 'pan': { cyl(c.r, c.r * 0.9, c.h, std({ color: 0x2a2a30, metalness: 0.6, roughness: 0.4 })); const hnd = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 1.8), std({ color: 0x1a1a1a })); hnd.position.set(c.x + 0.3, c.h - 0.2, c.z + c.r + 0.8); L.add(hnd); break; }
      case 'potS': case 'bigpot': cyl(c.r, c.r * 0.95, c.h, std({ color: m === 'bigpot' ? 0xe84a5f : 0xc8ccd4, metalness: m === 'bigpot' ? 0.1 : 0.8, roughness: 0.3 })); if (m === 'bigpot') { const lid = new THREE.Mesh(new THREE.SphereGeometry(c.r, 24, 8, 0, 6.3, 0, 0.5), std({ color: 0xc83a4f, roughness: 0.3 })); lid.position.set(c.x, top - c.r * 0.88, c.z); L.add(lid); for (const sd of [-1, 1]) { const h2 = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.12, 8, 12, Math.PI), std({ color: 0x222222 })); h2.position.set(c.x + sd * (c.r + 0.1), top - 0.6, c.z); h2.rotation.set(0, sd > 0 ? Math.PI / 2 : -Math.PI / 2, 0); L.add(h2); } } break;
      case 'jar': { const j = cyl(c.r, c.r, c.h, phys({ color: 0xdff2ff, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.55 })); j.castShadow = true; cyl(c.r + 0.1, c.r + 0.1, 0.4, std({ color: 0xe84a5f }), c.x, top - 0.1); for (let i = 0; i < 7; i++) { const ck = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 16), std({ map: T.fur('#c98a4a'), roughness: 0.9 })); ck.position.set(c.x + (r() - 0.5) * 1.2, c.y + 0.2 + i * 0.35, c.z + (r() - 0.5) * 1.2); ck.rotation.set(r() * 0.8, 0, r() * 0.8); L.add(ck); } break; }
      case 'breadbox': { rbox(c.w, c.h, c.d, 0.4, std({ color: 0xe8c07a, roughness: 0.5 })); const lbl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), std({ map: T.sign('BREAD', '#8a5a2b', '#fff') })); lbl.position.set(c.x, c.y + c.h * 0.6, c.z + c.d / 2 + 0.01); L.add(lbl); break; }
      case 'mixer': { const red = phys({ color: 0xe84a5f, roughness: 0.25, clearcoat: 1 }); rbox(c.r * 2, 0.6, c.r * 2.4, 0.2, red, c.x, c.y, c.z); cyl(0.5, 0.5, c.h - 1, red, c.x, c.y + 0.6, c.z - 0.8); rbox(1.2, 1.0, c.r * 2.6, 0.3, red, c.x, top - 1, c.z); const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 10, 0, 6.3, Math.PI / 2, Math.PI / 2), std({ color: 0xd8dce0, metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide })); bowl.position.set(c.x, c.y + 1.5, c.z + 0.2); L.add(bowl); break; }
      case 'stool': rbox(c.w, c.h, c.d, 0.12, std({ color: 0xffc93c, roughness: 0.4 })); break;
      case 'oven': {
        box(c.w, c.h, c.d, std({ map: T.steel(), metalness: 0.7, roughness: 0.3 }));
        const door = new THREE.Mesh(new THREE.BoxGeometry(c.w - 0.6, 3.2, 0.15), std({ color: 0x1a1a22, roughness: 0.1, metalness: 0.4 })); door.position.set(c.x, 2.2, c.z + c.d / 2 + 0.08); L.add(door);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(c.w - 1.6, 2), new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.35 })); glow.position.set(c.x, 2.2, c.z + c.d / 2 + 0.17); L.add(glow);
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, c.w - 1), std({ color: 0xd8d8e0, metalness: 0.9, roughness: 0.2 })); bar.rotation.z = Math.PI / 2; bar.position.set(c.x, 4.1, c.z + c.d / 2 + 0.4); L.add(bar);
        for (const [dx, dz] of [[-1.4, -1.2], [1.4, -1.2], [-1.4, 1.2], [1.4, 1.2]]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.1, 6, 20), std({ color: 0x222222 })); b.rotation.x = Math.PI / 2; b.position.set(c.x + dx, top + 0.06, c.z + dz); L.add(b); }
        for (let i = 0; i < 4; i++) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 12), std({ color: 0x222222 })); k.rotation.x = Math.PI / 2; k.position.set(c.x - 1.8 + i * 1.2, 5.2, c.z + c.d / 2 + 0.1); L.add(k); }
        break;
      }
      case 'fridge': {
        const white = phys({ color: 0xf6f8fa, roughness: 0.25, clearcoat: 0.6 });
        rbox(c.w, c.h, c.d, 0.4, white);
        const seam = new THREE.Mesh(new THREE.BoxGeometry(c.w - 0.2, 0.08, 0.05), std({ color: 0x9aa0a8 })); seam.position.set(c.x, 10, c.z + c.d / 2 + 0.02); L.add(seam);
        for (const y of [12.5, 6]) { const hd = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 0.3), std({ color: 0xc8ccd4, metalness: 0.9, roughness: 0.2 })); hd.position.set(c.x - c.w / 2 + 0.8, y, c.z + c.d / 2 + 0.25); L.add(hd); }
        // magnets and a drawing stuck on the door
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3), std({ map: T.poster(0) })); pic.position.set(c.x + 1, 6.5, c.z + c.d / 2 + 0.03); pic.rotation.z = 0.08; L.add(pic);
        for (let i = 0; i < 6; i++) { const mg = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 12), std({ color: FABRIC[i] })); mg.rotation.x = Math.PI / 2; mg.position.set(c.x - 1.8 + r() * 3.6, 3 + r() * 11, c.z + c.d / 2 + 0.06); L.add(mg); }
        break;
      }
      case 'bucket': { cyl(c.r, c.r * 0.85, c.h, std({ color: 0xffc93c, roughness: 0.4 })); const mop = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 13, 8), std({ color: 0x8a6a3a })); mop.position.set(c.x + 0.9, 6.5, c.z - 0.5); mop.rotation.z = 0.18; mop.castShadow = true; L.add(mop); break; }
      case 'towel': { const t2 = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, 0.1), std({ map: tex('towel', 128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#e84a5f'; for (let i = 0; i < w; i += 32) { g.fillRect(i, 0, 14, h); g.fillRect(0, i, w, 14); } }), roughness: 1 })); t2.position.set(c.x, c.y + c.h / 2, c.z); L.add(t2); break; }
      case 'tableleg': cyl(c.r, c.r * 0.8, c.h, wood(0)); break;
      case 'ktable': {
        box(c.w, c.h, c.d, wood(0, [2, 1]));
        const cloth = std({ map: tex('gingham', 256, 256, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(220,50,70,.55)'; for (let i = 0; i < w; i += 32) { g.fillRect(i, 0, 16, h); g.fillRect(0, i, w, 16); } }, [4, 3]), roughness: 0.95 });
        const topc = new THREE.Mesh(new THREE.BoxGeometry(c.w + 0.4, 0.08, c.d + 0.4), cloth); topc.position.set(c.x, top + 0.04, c.z); topc.castShadow = true; L.add(topc);
        // breakfast: plates, a juice jug, a fruit bowl
        for (const [dx, dz] of [[-5, -2.5], [5, -2.5], [-5, 2.5], [5, 2.5]]) cyl(1.1, 1.0, 0.15, std({ color: 0xffffff, roughness: 0.3 }), c.x + dx, top + 0.08, c.z + dz);
        const jug = cyl(0.7, 0.8, 2.2, phys({ color: 0xffa040, roughness: 0.1, transmission: 0.4, transparent: true, opacity: 0.8 }), c.x - 1, top + 0.08, c.z); void jug;
        for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), std({ color: [0xe84a5f, 0xffc93c, 0x6ab04c, 0xff8c42, 0xe84a5f][i], roughness: 0.4 })); f.position.set(c.x + 2 + (r() - 0.5) * 1.4, top + 0.6 + (i > 2 ? 0.7 : 0), c.z + (r() - 0.5) * 1.4); f.castShadow = true; L.add(f); }
        break;
      }
      case 'cloth': { const g2 = new THREE.PlaneGeometry(c.w, c.h, 30, 1), p2 = g2.attributes.position; for (let i = 0; i < p2.count; i++) p2.setZ(i, Math.sin(p2.getX(i) * 2.5) * 0.12 * (0.5 - p2.getY(i) / c.h)); g2.computeVertexNormals(); const cm = std({ map: tex('gingham', 256, 256, () => { }), roughness: 0.95, side: THREE.DoubleSide }); const cl = new THREE.Mesh(g2, cm); cm.map = texCache.get('gingham').clone(); cm.map.repeat.set(4, 1); cm.map.needsUpdate = true; cl.position.set(c.x, c.y + c.h / 2, c.z); cl.castShadow = true; L.add(cl); break; }
      case 'pantry': box(c.w, c.h, c.d, wood(2, [1, 2])); break;
      case 'pshelf': {
        box(c.w, c.h, c.d, wood(2));
        for (let z = c.z - c.d / 2 + 0.8; z < c.z + c.d / 2 - 0.5; z += 1.4) { const can = cyl(0.5, 0.5, 1.4, std({ map: tex('can' + (Math.round(z) % 3), 64, 64, (g, w, h) => { g.fillStyle = ['#e84a5f', '#2a9df4', '#6ab04c'][Math.abs(Math.round(z)) % 3]; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(0, h * 0.35, w, h * 0.3); }), roughness: 0.4 }), c.x - 0.6 + (r() - 0.5) * 0.4, top, z); void can; }
        break;
      }
      case 'pdoor': box(c.w, c.h, c.d, wood(2, [1, 2])); { const k = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), std({ color: 0xd4a52a, metalness: 0.8, roughness: 0.3 })); k.position.set(c.x + c.w / 2 - 0.6, 6, c.z + 0.3); L.add(k); } break;
      case 'sack': { const sk = new THREE.Mesh(new THREE.SphereGeometry(c.r, 18, 12), std({ map: T.fabric('#e8d8b8', '#dccaa6', 'sack'), roughness: 1 })); sk.scale.set(1, c.h / c.r / 1.6, 1); sk.position.set(c.x, c.h * 0.55, c.z); sk.castShadow = true; L.add(sk); const lb = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), std({ map: T.sign('FLOUR', '#fff', '#8a5a2b') })); lb.position.set(c.x + c.r - 0.02, c.h * 0.55, c.z); lb.rotation.y = Math.PI / 2; L.add(lb); break; }
      case 'trashcan': { cyl(c.r, c.r * 0.9, c.h - 0.3, std({ map: T.steel(), metalness: 0.8, roughness: 0.3 })); cyl(c.r + 0.1, c.r + 0.1, 0.3, std({ color: 0x9aa0a8, metalness: 0.8, roughness: 0.3 }), c.x, top - 0.3); break; }
      case 'cereal': case 'cereal2': {
        const art = tex('cereal' + m, 256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, m === 'cereal' ? '#ffc93c' : '#2a9df4'); gr.addColorStop(1, m === 'cereal' ? '#ff8c42' : '#9b59ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 54px "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText(m === 'cereal' ? 'GOOGLY' : 'CRUNCH', w / 2, 90); g.fillText(m === 'cereal' ? 'O\'s' : 'PUFFS', w / 2, 150); g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, 330, 90, 0, 7); g.fill(); for (let i = 0; i < 9; i++) { g.strokeStyle = '#d9964a'; g.lineWidth = 12; g.beginPath(); g.arc(w / 2 + (Math.random() - 0.5) * 110, 330 + (Math.random() - 0.5) * 90, 16, 0, 7); g.stroke(); } });
        const b = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), std({ map: art, roughness: 0.6 })); b.position.set(c.x, c.y + c.h / 2, c.z); b.castShadow = true; L.add(b);
        if (m === 'cereal2') b.rotation.z = 0.04;
        break;
      }
      case 'bag': case 'bagTop': box(c.w, c.h, c.d, std({ map: tex('paperbag', 256, 256, (g, w, h) => { g.fillStyle = '#c8a070'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(90,60,30,.12)' : 'rgba(255,240,200,.1)'; g.fillRect(Math.random() * w, Math.random() * h, 3, 1); } g.strokeStyle = 'rgba(90,60,30,.4)'; g.lineWidth = 2; for (let x = 30; x < w; x += 70) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } }), roughness: 0.9 })); break;
      case 'apple': case 'orange': { const f = new THREE.Mesh(new THREE.SphereGeometry(c.r, 20, 14), phys({ color: m === 'apple' ? 0xd8283a : 0xff8c1a, roughness: 0.3, clearcoat: 0.6 })); f.position.set(c.x, c.r, c.z); f.castShadow = true; L.add(f); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4), std({ color: 0x5a3a1a })); st.position.set(c.x, c.r * 2 + 0.1, c.z); L.add(st); if (m === 'apple') { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), std({ color: 0x4a9a3a })); lf.scale.set(1, 0.3, 0.6); lf.position.set(c.x + 0.2, c.r * 2 + 0.2, c.z); L.add(lf); } break; }
      case 'dogbed': { const ring = new THREE.Mesh(new THREE.TorusGeometry(c.r - 0.5, 0.6, 12, 32), std({ map: T.fabric('#8a5a2b', '#7a4a1b', 'dog'), roughness: 1 })); ring.rotation.x = Math.PI / 2; ring.position.set(c.x, 0.6, c.z); ring.castShadow = true; L.add(ring); const cush = new THREE.Mesh(new THREE.CylinderGeometry(c.r - 0.5, c.r - 0.5, 0.4, 28), std({ color: 0xe8d8b8, roughness: 1 })); cush.position.set(c.x, 0.2, c.z); L.add(cush); const bone = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.8, 4, 8), std({ color: 0xf6f0e0 })); bone.rotation.z = Math.PI / 2; bone.position.set(c.x + 0.4, 0.5, c.z - 0.4); L.add(bone); break; }
      case 'bowl': { const b = new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r * 0.8, c.h, 24, 1, true), std({ color: 0x2a9df4, roughness: 0.3, side: THREE.DoubleSide })); b.position.set(c.x, c.h / 2, c.z); L.add(b); cyl(c.r * 0.8, c.r * 0.8, 0.05, std({ color: 0x2a9df4 }), c.x, 0.01, c.z); cyl(c.r * 0.7, c.r * 0.7, 0.1, std({ color: 0x8a5a2b, roughness: 1 }), c.x, 0.1, c.z); break; }
      // ---------------- backyard
      case 'trunk': {
        cyl(c.r * 0.9, c.r * 1.25, c.h, std({ map: tex('barkY', 128, 512, (g, w, h) => { g.fillStyle = '#6a4a32'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { const x = Math.random() * w; g.strokeStyle = ['#3a2818', '#8a6a4a', '#4a3322'][i % 3]; g.lineWidth = 2 + Math.random() * 5; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y < h; y += 30) g.lineTo(x + (Math.random() - 0.5) * 8, y); g.stroke(); } }, [2, 4]), roughness: 0.95 }));
        const leaf = std({ map: T.leaves('#3f8a30'), roughness: 0.9 });
        for (let i = 0; i < 9; i++) { const a = i * 2.4, d = i ? 4 + r() * 3 : 0, cl = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + r() * 2.5, 1), leaf); cl.position.set(c.x + Math.cos(a) * d, c.h - 3 + r() * 4, c.z + Math.sin(a) * d); cl.castShadow = true; L.add(cl); }
        break;
      }
      case 'deckpost': cyl(c.r, c.r, c.h, wood(1)); break;
      case 'deck': box(c.w, c.h, c.d, std({ map: T.planks([c.w / 6, c.d / 3]), roughness: 0.8 })); break;
      case 'hut': box(c.w, c.h, c.d, std({ map: T.planks([Math.max(c.w, c.d) / 5, c.h / 5]), roughness: 0.85 })); break;
      case 'hutroof': case 'shedroof': case 'doghroof': {
        const col = m === 'hutroof' ? 0xc84a3a : m === 'shedroof' ? 0x3a5a7a : 0xe84a5f;
        const shape = new THREE.Shape(); shape.moveTo(-c.w / 2 - 0.4, 0); shape.lineTo(c.w / 2 + 0.4, 0); shape.lineTo(0, c.w * 0.32); shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: c.d + 0.6, bevelEnabled: false }); geo.translate(0, 0, -(c.d + 0.6) / 2);
        const roof = new THREE.Mesh(geo, std({ color: col, roughness: 0.7 })); roof.position.set(c.x, c.y, c.z); roof.castShadow = true; L.add(roof);
        box(c.w, c.h, c.d, std({ color: col, roughness: 0.7 }));
        break;
      }
      case 'logstep': { const lg = new THREE.Mesh(new THREE.CylinderGeometry(c.w / 2, c.w / 2 + 0.1, c.h, 16), [std({ map: T.bark(), roughness: 0.95 }), std({ map: T.logEnd(), roughness: 0.9 }), std({ map: T.logEnd(), roughness: 0.9 })]); lg.position.set(c.x, c.h / 2, c.z); lg.castShadow = true; L.add(lg); break; }
      case 'shed': box(c.w, c.h, c.d, std({ map: T.planks([Math.max(c.w, c.d) / 5, c.h / 5]), color: 0x9ac8e8, roughness: 0.85 })); break;
      case 'mower': { rbox(c.w, c.h * 0.5, c.d, 0.2, std({ color: 0xe84a5f, roughness: 0.4 })); for (const [dx, dz] of [[-1.5, -1], [1.5, -1], [-1.5, 1], [1.5, 1]]) { const w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 14), std({ color: 0x222222 })); w2.rotation.x = Math.PI / 2; w2.position.set(c.x + dx, 0.5, c.z + dz * 1.2); L.add(w2); } const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4), std({ color: 0x222222 })); hd.position.set(c.x + 2.5, 2.2, c.z); hd.rotation.z = 0.7; L.add(hd); break; }
      case 'shedshelf': { box(c.w, c.h, c.d, wood(1)); for (let i = 0; i < 4; i++) cyl(0.5, 0.5, 1.1, std({ color: FABRIC[i + 2], roughness: 0.4 }), c.x - 0.1, top, c.z - 1.4 + i * 0.95); break; }
      case 'swingpost': {
        cyl(c.r, c.r, c.h, std({ color: 0x2a9df4, metalness: 0.5, roughness: 0.4 }));
        if (c.z < -5) {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 8.6, 12), std({ color: 0x2a9df4, metalness: 0.5, roughness: 0.4 })); bar.rotation.x = Math.PI / 2; bar.position.set(c.x, c.h, c.z + 4); bar.castShadow = true; L.add(bar);
          this.swings = [];
          for (const dz of [2, 6]) { const sw = new THREE.Group(); sw.position.set(c.x, c.h, c.z + dz); L.add(sw); for (const s2 of [-0.8, 0.8]) { const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6.8), std({ color: 0x8a8a8a })); rope.position.set(s2, -3.4, 0); sw.add(rope); } const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 0.9), std({ color: 0xffc93c, roughness: 0.5 })); seat.position.y = -6.8; seat.castShadow = true; sw.add(seat); this.swings.push(sw); }
        }
        break;
      }
      case 'slidetop': {
        box(c.w, 0.3, c.d, std({ color: 0xffc93c, roughness: 0.4 }), c.x, top - 0.3);
        for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) cyl(0.12, 0.12, top, std({ color: 0x6ab04c, metalness: 0.4 }), c.x + dx, 0, c.z + dz);
        // the slide itself: a smooth red chute over the step colliders
        const len = Math.hypot(8.1, top), ch = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, len), phys({ color: 0xe84a5f, roughness: 0.2, clearcoat: 1 }));
        ch.position.set(c.x, top / 2 - 0.05, c.z + c.d / 2 + 8.1 / 2); ch.rotation.x = Math.atan2(top, 8.1); ch.castShadow = true; L.add(ch);
        for (const s2 of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, len), phys({ color: 0xc83a4f, roughness: 0.3 })); rail.position.set(c.x + s2 * 1.1, top / 2 + 0.2, c.z + c.d / 2 + 8.1 / 2); rail.rotation.x = ch.rotation.x; L.add(rail); }
        break;
      }
      case 'slidestep': break;   // hidden under the chute
      case 'ladder': rbox(c.w, c.h, c.d, 0.1, std({ color: 0x6ab04c, roughness: 0.4 })); break;
      case 'sandwall': box(c.w, c.h, c.d, wood(0)); break;
      case 'castle': { const sm = std({ map: T.sand([1, 1]), roughness: 1 }); cyl(c.r, c.r * 1.1, c.h * 0.6, sm); for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28; cyl(0.4, 0.45, c.h, sm, c.x + Math.cos(a) * c.r * 0.8, 0, c.z + Math.sin(a) * c.r * 0.8); } const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), std({ color: 0xe84a5f, side: THREE.DoubleSide })); fl.position.set(c.x + 0.3, c.h + 0.8, c.z); L.add(fl); cyl(0.03, 0.03, 1, wood(1), c.x, c.h * 0.6, c.z); break; }
      case 'pail': { const b = new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r * 0.8, c.h, 20, 1, true), std({ color: 0x2a9df4, side: THREE.DoubleSide })); b.position.set(c.x, c.h / 2, c.z); L.add(b); break; }
      case 'poolwall': rbox(c.w, c.h, c.d, 0.35, phys({ color: 0x3ad0ff, roughness: 0.2, clearcoat: 1 })); break;
      case 'dogh': box(c.w, c.h, c.d, std({ map: T.planks([1, 1]), color: 0xffd8a0, roughness: 0.85 })); break;
      case 'bush': { const lm = std({ map: T.leaves('#3a8a2a'), roughness: 0.9 }); for (let i = 0; i < 7; i++) { const a = i * 2.3, d = i ? c.r * 0.45 : 0; const bl = new THREE.Mesh(new THREE.IcosahedronGeometry(c.r * (i ? 0.62 : 0.8), 1), lm); bl.position.set(c.x + Math.cos(a) * d, c.h * (i ? 0.45 : 0.55), c.z + Math.sin(a) * d); bl.scale.y = 0.85; bl.castShadow = true; L.add(bl); } for (let i = 0; i < 6; i++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), std({ color: [0xff6fb5, 0xffffff, 0xffe066][i % 3] })); const a = r() * 6.28; fl.position.set(c.x + Math.cos(a) * c.r * 0.95, c.h * (0.4 + r() * 0.4), c.z + Math.sin(a) * c.r * 0.95); L.add(fl); } break; }
      case 'tallgrass': {
        const gm = std({ color: 0x5aa83a, roughness: 0.9, side: THREE.DoubleSide });
        const blade = new THREE.ConeGeometry(0.12, 1, 3);
        const n = 700, inst = new THREE.InstancedMesh(blade, gm, n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
        for (let i = 0; i < n; i++) { const hh = c.h * (0.75 + r() * 0.5); e.set((r() - 0.5) * 0.4, r() * 6, (r() - 0.5) * 0.4); q.setFromEuler(e); M.compose(new THREE.Vector3(c.x + (r() - 0.5) * c.w, hh / 2, c.z + (r() - 0.5) * c.d), q, new THREE.Vector3(1, hh, 1)); inst.setMatrixAt(i, M); inst.setColorAt(i, new THREE.Color().setHSL(0.26 + r() * 0.05, 0.55, 0.3 + r() * 0.15)); }
        inst.castShadow = true; L.add(inst); break;
      }
      case 'leaves': { for (let i = 0; i < 60; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * c.r, lf = new THREE.Mesh(new THREE.CircleGeometry(0.5 + r() * 0.3, 5), std({ color: [0xd8742a, 0xc84a2a, 0xe8b03a, 0x9a5a2a][i % 4], side: THREE.DoubleSide, roughness: 1 })); lf.position.set(c.x + Math.cos(a) * d, Math.max(0.05, (1 - d / c.r) * c.h * r()), c.z + Math.sin(a) * d); lf.rotation.set(r() * 3, r() * 3, r() * 3); L.add(lf); } const mound = new THREE.Mesh(new THREE.SphereGeometry(c.r, 20, 10, 0, 6.3, 0, Math.PI / 2), std({ color: 0xc8742a, roughness: 1 })); mound.scale.y = c.h / c.r * 0.85; mound.position.set(c.x, 0, c.z); L.add(mound); break; }
      case 'ptleg': cyl(c.r, c.r, c.h, wood(1)); break;
      case 'ptable': case 'bench': box(c.w, c.h, c.d, std({ map: T.planks([c.w / 4, 1]), roughness: 0.8 })); break;
      case 'grill': { const bk = std({ color: 0x1a1a1e, metalness: 0.6, roughness: 0.4 }); const bowlG = new THREE.Mesh(new THREE.SphereGeometry(c.r, 24, 12), bk); bowlG.position.set(c.x, c.h - 1, c.z); bowlG.castShadow = true; L.add(bowlG); for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28; const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, c.h - 1), bk); lg.position.set(c.x + Math.cos(a) * 0.9, (c.h - 1) / 2, c.z + Math.sin(a) * 0.9); lg.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2); L.add(lg); } break; }
      case 'barrow': { const tray = new THREE.Mesh(new RoundedBoxGeometry(c.w, 1.2, c.d, 3, 0.3), std({ color: 0x2a9df4, metalness: 0.4, roughness: 0.4 })); tray.position.set(c.x, 1.4, c.z); tray.castShadow = true; L.add(tray); const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.3, 18), std({ color: 0x222222 })); wh.rotation.z = Math.PI / 2; wh.position.set(c.x, 0.7, c.z - c.d / 2 + 0.3); L.add(wh); for (const s2 of [-1, 1]) { const h2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3), wood(1)); h2.rotation.x = Math.PI / 2 - 0.2; h2.position.set(c.x + s2 * 1, 1.4, c.z + c.d / 2 + 1); L.add(h2); } break; }
      case 'gnome': { cyl(c.r, c.r * 1.1, c.h * 0.5, std({ color: 0x2a6adf, roughness: 0.5 })); const face = new THREE.Mesh(new THREE.SphereGeometry(c.r * 0.7, 14, 10), std({ color: 0xffd0b0 })); face.position.set(c.x, c.h * 0.6, c.z); L.add(face); const beard = new THREE.Mesh(new THREE.ConeGeometry(c.r * 0.7, 1.2, 12), std({ color: 0xffffff, roughness: 1 })); beard.rotation.x = Math.PI; beard.position.set(c.x, c.h * 0.42, c.z + 0.3); L.add(beard); const hat = new THREE.Mesh(new THREE.ConeGeometry(c.r * 0.8, 1.6, 14), std({ color: 0xe84a5f })); hat.position.set(c.x, c.h * 0.6 + 1.2, c.z); hat.castShadow = true; L.add(hat); break; }
      case 'flowerbed': box(c.w, c.h, c.d, std({ color: 0x5a3a22, roughness: 1 })); break;
      case 'flower': {
        cyl(c.r, c.r, c.h, std({ color: 0x3f8a30 }), c.x, c.y);
        const col = [0xff6fb5, 0xffe066, 0xe84a5f, 0x9b59ff, 0xffffff][Math.abs(Math.round(c.x)) % 5];
        for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, pt = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), std({ color: col, roughness: 0.6 })); pt.scale.set(1, 0.25, 0.55); pt.position.set(c.x + Math.cos(a) * 1.0, top + 0.2, c.z + Math.sin(a) * 1.0); pt.rotation.y = -a; pt.castShadow = true; L.add(pt); }
        const ctr = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), std({ color: 0xffb000 })); ctr.position.set(c.x, top + 0.25, c.z); L.add(ctr);
        const lf = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), std({ color: 0x4a9a3a, side: THREE.DoubleSide })); lf.scale.set(0.4, 0.05, 1.2); lf.position.set(c.x + 0.6, c.h * 0.4, c.z); lf.rotation.z = 0.5; L.add(lf);
        break;
      }
      // ---------------- lobby things
      case 'counter': {
        rbox(c.w, c.h, c.d, 0.15, std({ color: 0x7a4ad8, roughness: 0.5 }));
        box(c.w + 0.4, 0.2, c.d + 0.4, wood(0), c.x, top);
        const aw = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, c.w + 1, 16, 1, true, 0, Math.PI), std({ map: T.fabric('#ff6fb5', '#ffffff', 'awn'), side: THREE.DoubleSide, roughness: 0.9 })); aw.rotation.z = Math.PI / 2; aw.position.set(c.x, 5.6, c.z + 0.2); L.add(aw);
        for (const s of [-1, 1]) cyl(0.12, 0.12, 5.4, wood(1), c.x + s * c.w / 2, 0, c.z + 1.1);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), std({ map: T.sign('SHOP', '#ffd23a', '#5a2a9a'), roughness: 0.5 })); sign.position.set(c.x, 7.4, c.z - 0.6); L.add(sign);
        // goodies on the counter: a coin pile and a pet bed
        for (let i = 0; i < 12; i++) { const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16), std({ color: 0xffc83a, metalness: 1, roughness: 0.25 })); coin.position.set(c.x - 2 + (i % 4) * 0.1, top + 0.24 + i * 0.08, c.z); L.add(coin); }
        break;
      }
      case 'tramp': {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(c.r, 0.18, 10, 36), std({ color: 0x2a9df4, roughness: 0.4 })); ring.rotation.x = Math.PI / 2; ring.position.set(c.x, top, c.z); ring.castShadow = true; L.add(ring);
        const mat = new THREE.Mesh(new THREE.CircleGeometry(c.r - 0.1, 36), std({ color: 0x1a1a22, roughness: 0.9 })); mat.rotation.x = -Math.PI / 2; mat.position.set(c.x, top - 0.05, c.z); L.add(mat);
        for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; cyl(0.07, 0.07, top, std({ color: 0x888888, metalness: 0.8 }), c.x + Math.cos(a) * (c.r - 0.2), 0, c.z + Math.sin(a) * (c.r - 0.2)); }
        break;
      }
      case 'fountain': {
        const stone = std({ color: 0xd8d0c4, roughness: 0.8 });
        const b = new THREE.Mesh(new THREE.TorusGeometry(c.r - 0.2, 0.3, 10, 32), stone); b.rotation.x = Math.PI / 2; b.position.set(c.x, top - 0.3, c.z); b.castShadow = true; L.add(b);
        cyl(c.r - 0.2, c.r - 0.2, top - 0.3, stone);
        const water = new THREE.Mesh(new THREE.CircleGeometry(c.r - 0.3, 32), phys({ color: 0x6ad0ff, roughness: 0.05, transmission: 0.3, transparent: true, opacity: 0.85 })); water.rotation.x = -Math.PI / 2; water.position.set(c.x, top - 0.25, c.z); L.add(water);
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.22, 32), phys({ color: 0xffc83a, metalness: 0.7, roughness: 0.25, clearcoat: 1, emissive: 0x6a4400, emissiveIntensity: 0.6 })); coin.rotation.x = Math.PI / 2; coin.position.set(c.x, top + 1.6, c.z); L.add(coin);
        this.spinCoin = coin;
        cyl(0.12, 0.12, 0.8, stone, c.x, top - 0.3, c.z);
        break;
      }
      case 'giftbox': { box(c.w, c.h, c.d, std({ color: 0x6ab04c, roughness: 0.5 })); box(0.4, c.h + 0.02, c.d + 0.02, std({ color: 0xffd23a }), c.x); box(c.w + 0.02, c.h + 0.02, 0.4, std({ color: 0xffd23a }), c.x, c.y, c.z); break; }
      default: box(c.w || c.r * 2 || 1, c.h, c.d || c.r * 2 || 1, std({ color: 0x888888 }));
    }
  }

  bedroomDressing(L, map) {
    const D = map.D, W = map.W, r = rng(99);
    // round rug in the middle
    const rug = new THREE.Mesh(new THREE.CircleGeometry(11, 64), std({ map: T.rug(), roughness: 1, transparent: true })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.03, 3); L.add(rug);
    // train track loop around the rug edge
    const rail = std({ color: 0x8a5a2a, roughness: 0.7 });
    const track = new THREE.Mesh(new THREE.TorusGeometry(8.4, 0.12, 6, 80), rail); track.rotation.x = Math.PI / 2; track.position.set(1, 0.08, 3); L.add(track);
    const track2 = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.12, 6, 80), rail); track2.rotation.x = Math.PI / 2; track2.position.set(1, 0.08, 3); L.add(track2);
    // posters, clock and a light switch on the walls
    const poster = (k, x, y, z, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5.8), std({ map: T.poster(k), roughness: 0.7 })); p.position.set(x, y, z); p.rotation.y = ry; L.add(p); };
    poster(0, -W / 2 + 0.06, 8.5, -14, Math.PI / 2); poster(1, W / 2 - 0.06, 9, 10, -Math.PI / 2); poster(2, -6, 8.5, D / 2 - 0.06, Math.PI);
    const clock = new THREE.Group(); clock.position.set(W / 2 - 0.15, 11, -2); clock.rotation.y = -Math.PI / 2; L.add(clock);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.2, 40), std({ color: 0xffffff, roughness: 0.4 })); face.rotation.x = Math.PI / 2; clock.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.15, 8, 40), std({ color: 0xe84a5f })); clock.add(rim);
    this.clockHands = [0.9, 1.2].map((l, i) => { const h = new THREE.Mesh(new THREE.BoxGeometry(0.1, l, 0.05), std({ color: 0x111111 })); h.geometry.translate(0, l / 2, 0); h.position.z = 0.15 + i * 0.02; clock.add(h); return h; });
    this.door(L, map, 14);
    // ceiling lamp
    const shade = new THREE.Mesh(new THREE.SphereGeometry(2.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: 0xfff6e0, emissive: 0xffe6b0, emissiveIntensity: 0.9, side: THREE.DoubleSide })); shade.rotation.x = Math.PI; shade.position.set(0, map.roof - 0.9, 2); L.add(shade);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9), std({ color: 0xffffff })); cord.position.set(0, map.roof - 0.45, 2); L.add(cord);
    // toys scattered: stars, a crayon, slippers, socks, marbles
    const slip = std({ color: 0xff6fb5, roughness: 0.9 });
    for (const [x, z, a] of [[-12, -7, 0.4], [-10.5, -6.2, 0.1]]) { const s = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.5, 2.8, 3, 0.25), slip); s.position.set(x, 0.25, z); s.rotation.y = a; s.castShadow = true; L.add(s); const pom = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), std({ color: 0xffffff, roughness: 1 })); pom.position.set(x + Math.sin(a) * 1.1, 0.6, z + Math.cos(a) * 1.1); L.add(pom); }
    for (let i = 0; i < 18; i++) { const mb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), phys({ color: FABRIC[i % FABRIC.length], roughness: 0.05, transmission: 0.5, clearcoat: 1 })); mb.position.set(-3 + r() * 16, 0.22, -8 + r() * 6); L.add(mb); }
    const crayon = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 3.2, 12), std({ color: 0x2a9df4, roughness: 0.6 })); crayon.rotation.set(Math.PI / 2, 0, 0.8); crayon.position.set(18, 0.25, 8); L.add(crayon);
    // toy box lid (open, leaning back) and toys inside
    const lid = new THREE.Mesh(new THREE.BoxGeometry(7, 0.3, 5), std({ map: T.fabric('#2a9df4', '#3aa9ff', 'toy'), roughness: 0.6 })); lid.position.set(-10, 3.3, 16.9); lid.rotation.x = -1.2; lid.castShadow = true; L.add(lid);
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.5 + r() * 0.4, 14, 10), phys({ color: FABRIC[i], roughness: 0.3, clearcoat: 1 })); b.position.set(-9 + r() * 2.5, 0.6, 12 + r() * 2.6); b.castShadow = true; L.add(b); }
  }
  door(L, map, x) {
    const D = map.D;
    // the door (seekers count here)
    const doorX = x, dw = 8, dh = 13;
    const door = new THREE.Mesh(new THREE.BoxGeometry(dw, dh, 0.3), std({ map: T.wood([1, 2], 2), roughness: 0.55 })); door.position.set(doorX, dh / 2, D / 2 - 0.1); L.add(door);
    for (const [w, h, x, y] of [[dw + 1, 0.6, doorX, dh + 0.3], [0.6, dh, doorX - dw / 2 - 0.3, dh / 2], [0.6, dh, doorX + dw / 2 + 0.3, dh / 2]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), std({ color: 0xf6f3ec })); f.position.set(x, y, D / 2 - 0.15); L.add(f); }
    for (const [w, h, y] of [[5.6, 4.6, 9.2], [5.6, 5.6, 3.6]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), std({ map: T.wood([1, 1], 0) })); p.position.set(doorX, y, D / 2 - 0.3); L.add(p); }
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 10), std({ color: 0xd4a52a, metalness: 0.9, roughness: 0.25 })); knob.position.set(doorX - dw / 2 + 0.9, 6, D / 2 - 0.5); L.add(knob);
    // "count here" tape on the floor
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), std({ map: T.sign('COUNT TO 30', '#ffd23a', '#222'), roughness: 0.8, transparent: true })); tape.rotation.x = -Math.PI / 2; tape.rotation.z = Math.PI; tape.position.set(x, 0.04, D / 2 - 3.6); L.add(tape);
  }
  kitchenDressing(L, map) {
    const D = map.D, W = map.W, r = rng(7);
    this.door(L, map, 14);
    // tiled splashback, a sink with a tap, and a rug in front of it
    const sb = new THREE.Mesh(new THREE.PlaneGeometry(33, 3.5), std({ map: T.subway([8, 1]), roughness: 0.3 })); sb.position.set(-12.5, 7.75, -D / 2 + 0.06); L.add(sb);
    const sink = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 3.2), std({ color: 0xb8bcc0, metalness: 0.9, roughness: 0.2 })); sink.position.set(-12, 6.03, -19.6); L.add(sink);
    const tap = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.14, 8, 16, Math.PI), std({ color: 0xd8dce0, metalness: 1, roughness: 0.15 })); tap.position.set(-12, 6.9, -21.3); L.add(tap);
    const tapPost = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.2), tap.material); tapPost.position.set(-12.9, 6.6, -21.3); L.add(tapPost);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(10, 4.5), std({ map: T.fabric('#2a9df4', '#f5f6fa', 'krug'), roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(-12, 0.03, -13.5); L.add(rug);
    // ceiling lamps
    for (const x of [-12, 12]) { const shade = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.6, 28, 1, true), std({ color: 0xffc93c, emissive: 0xffe6b0, emissiveIntensity: 0.5, side: THREE.DoubleSide })); shade.position.set(x, map.roof - 2.4, 1); L.add(shade); const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6), std({ color: 0x222222 })); cord.position.set(x, map.roof - 0.8, 1); L.add(cord); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff6e0 })); bulb.position.set(x, map.roof - 3.1, 1); L.add(bulb); }
    // wall clock + hanging utensils
    const clock = new THREE.Group(); clock.position.set(W / 2 - 0.15, 11, 2); clock.rotation.y = -Math.PI / 2; L.add(clock);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.2, 40), std({ color: 0xffffff, roughness: 0.4 })); face.rotation.x = Math.PI / 2; clock.add(face);
    clock.add(new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.15, 8, 40), std({ color: 0x2a9df4 })));
    this.clockHands = [0.9, 1.2].map((l, i) => { const h = new THREE.Mesh(new THREE.BoxGeometry(0.1, l, 0.05), std({ color: 0x111111 })); h.geometry.translate(0, l / 2, 0); h.position.z = 0.15 + i * 0.02; clock.add(h); return h; });
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 8), std({ color: 0xc8ccd4, metalness: 0.9, roughness: 0.2 })); rail.rotation.z = Math.PI / 2; rail.position.set(4, 11.5, -D / 2 + 0.4); L.add(rail);
    for (let i = 0; i < 5; i++) { const u = new THREE.Mesh(i % 2 ? new THREE.CylinderGeometry(0.08, 0.08, 2.6) : new THREE.BoxGeometry(0.6, 2.6, 0.08), std({ color: [0xe84a5f, 0x8a5a2b, 0xc8ccd4, 0x2a9df4, 0xffc93c][i], roughness: 0.4 })); u.position.set(1 + i * 1.5, 10.2, -D / 2 + 0.45); L.add(u); }
    // crumbs and cheerios on the floor
    for (let i = 0; i < 26; i++) { const o = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.08, 6, 12), std({ color: 0xd9964a, roughness: 0.8 })); o.rotation.x = Math.PI / 2 + (r() - 0.5); o.position.set(10 + r() * 10, 0.08, -8 + r() * 8); L.add(o); }
  }
  yardShell(L, map) {
    const W = map.W, D = map.D;
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(W * 3, D * 3), std({ map: T.grass([W * 3 / 10, D * 3 / 10]), roughness: 0.95 })); grass.rotation.x = -Math.PI / 2; L.add(grass);
    // sky dome with clouds
    const skyTex = tex('skyYard', 16, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3f86d8'); gr.addColorStop(0.45, '#9cc8ee'); gr.addColorStop(0.5, '#dfeaf2'); gr.addColorStop(1, '#5a7a4a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    L.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })));
    const cloud = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false });
    const r = rng(33);
    for (let i = 0; i < 14; i++) { const g = new THREE.Group(), a = r() * 6.28, d = 150 + r() * 90; g.position.set(Math.cos(a) * d, 60 + r() * 50, Math.sin(a) * d); for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(8 + r() * 8, 12, 8), cloud); p.position.set(k * 9 - 18, r() * 4, r() * 6); g.add(p); } g.lookAt(0, g.position.y, 0); L.add(g); }
    this.scene.background = new THREE.Color(0x9cc8ee); this.scene.fog = new THREE.Fog(0xcfe0ee, 90, 280);
    // wooden fence on three sides, the back of the house on the south side
    const fm = std({ map: T.planks([W / 8, 1]), roughness: 0.85 }), fh = 9;
    for (const [w, x, z, ry] of [[W, 0, -D / 2 - 0.3, 0], [D, -W / 2 - 0.3, 0, Math.PI / 2], [D, W / 2 + 0.3, 0, Math.PI / 2]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(w, fh, 0.5), fm); f.position.set(x, fh / 2, z); f.rotation.y = ry; f.castShadow = true; L.add(f);
      for (let k = -w / 2; k <= w / 2; k += 6) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, fh + 0.8, 0.9), std({ map: T.wood([1, 2], 1) })); post.position.set(x + (ry ? 0 : k), (fh + 0.8) / 2, z + (ry ? k : 0)); post.castShadow = true; L.add(post); }
    }
    const house = new THREE.Mesh(new THREE.BoxGeometry(W + 2, 26, 2), std({ map: T.brick([W / 10, 26 / 10]), roughness: 0.9 })); house.position.set(0, 13, D / 2 + 1.2); house.castShadow = true; L.add(house);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 6, 2, 10), std({ color: 0x5a3a3a, roughness: 0.8 })); roof.position.set(0, 26.5, D / 2 + 3); roof.rotation.x = 0.5; L.add(roof);
    // the back door (seekers count here) and windows
    const door = new THREE.Mesh(new THREE.BoxGeometry(8, 13, 0.4), std({ map: T.wood([1, 2], 2), color: 0x7ab8e8, roughness: 0.6 })); door.position.set(0, 6.5, D / 2 + 0.05); L.add(door);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), std({ color: 0xd4a52a, metalness: 0.9, roughness: 0.25 })); knob.position.set(-2.8, 6, D / 2 - 0.3); L.add(knob);
    const step = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 3), std({ color: 0xa8a098, roughness: 0.9 })); step.position.set(0, 0.2, D / 2 - 1); step.userData.noShadow = false; L.add(step);
    for (const x of [-20, 20]) { const wf = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 0.4), std({ color: 0xffffff })); wf.position.set(x, 11, D / 2 + 0.05); L.add(wf); const gl = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), phys({ color: 0x9ad4ff, roughness: 0.05, metalness: 0.3 })); gl.position.set(x, 11, D / 2 - 0.2); gl.rotation.y = Math.PI; L.add(gl); }
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), std({ map: T.sign('COUNT TO 30', '#ffd23a', '#222'), roughness: 0.8, transparent: true })); tape.rotation.x = -Math.PI / 2; tape.rotation.z = Math.PI; tape.position.set(0, 0.45, D / 2 - 3.6); L.add(tape);
    // big trees over the fence
    for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = 58 + r() * 60, x = Math.cos(a) * d, z = Math.sin(a) * d * 0.8; if (z > D / 2) continue; const t = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 18, 10), std({ map: T.bark() })); t.position.set(x, 9, z); L.add(t); const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(9 + r() * 5, 1), std({ map: T.leaves('#3a7a2a'), roughness: 0.9 })); cr.position.set(x, 22 + r() * 5, z); L.add(cr); }
    // sunshine
    const hemi = new THREE.HemisphereLight(0xdcecff, 0x4a6a3a, 1.2); L.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2dc, 3.0); sun.position.set(-40, 70, 30); sun.target.position.set(0, 0, 0);
    sun.castShadow = true; sun.shadow.mapSize.set(this.lq ? 1024 : 4096, this.lq ? 1024 : 4096); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
    Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 45, bottom: -45, near: 10, far: 200 });
    L.add(sun); L.add(sun.target);
    this.scene.environmentIntensity = 0.5;
  }
  yardDressing(L, map) {
    const r = rng(12);
    // sand in the sandbox, water in the pool
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), std({ map: T.sand([3, 2]), roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.set(-3, 0.35, 8); L.add(sand);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.4), phys({ color: 0x5ac8ff, roughness: 0.05, transmission: 0.3, transparent: true, opacity: 0.7 })); water.rotation.x = -Math.PI / 2; water.position.set(15, 0.55, 10); L.add(water); this.water = water;
    const duck = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 10), phys({ color: 0xffd23a, roughness: 0.2, clearcoat: 1 })); duck.position.set(16, 0.9, 11); L.add(duck); const dh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), duck.material); dh.position.set(16.4, 1.5, 11); L.add(dh); this.duck = [duck, dh];
    // a garden hose coiled on the lawn, a ball, stepping stones to the door
    const hose = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.18, 8, 30), std({ color: 0x3aa83a, roughness: 0.5 })); hose.rotation.x = Math.PI / 2; hose.position.set(26, 0.2, 22); L.add(hose);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 16), phys({ map: texCache.get('ballstripe') || null, color: texCache.get('ballstripe') ? 0xffffff : 0xe84a5f, roughness: 0.3, clearcoat: 1 })); ball.position.set(-12, 1.1, 4); L.add(ball);
    for (let i = 0; i < 6; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.12, 12), std({ color: 0xa8a098, roughness: 0.9 })); st.position.set(-1 + (i % 2) * 2, 0.06, 20 - i * 3); L.add(st); }
    // treehouse ladder rope + a flag
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), std({ color: 0x9b59ff, side: THREE.DoubleSide })); flag.position.set(-23, 16.5, -14); L.add(flag); this.flag = flag;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4), std({ color: 0x8a6a3a })); pole.position.set(-24, 15.5, -14); L.add(pole);
    // butterflies
    this.butterflies = [];
    for (let i = 0; i < 6; i++) { const g = new THREE.Group(); for (const s2 of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.35, 8), new THREE.MeshBasicMaterial({ color: FABRIC[i], side: THREE.DoubleSide })); w.position.x = s2 * 0.3; g.add(w); } g.userData = { c: [(r() - 0.5) * 50, 2 + r() * 4, (r() - 0.5) * 36], ph: r() * 6 }; L.add(g); this.butterflies.push(g); }
  }
  hallDressing(L, map) {
    const D = map.D, W = map.W;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), std({ map: T.sign('GOOGLY SEEK', '#7a4ad8', '#ffd23a'), roughness: 0.6 })); banner.position.set(4, 7, -D / 2 + 0.08); L.add(banner);
    // the big door to the Giant Bedroom
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8, 5.5), std({ map: T.wood([1, 2], 2) })); door.position.set(W / 2 - 0.1, 4, 4); L.add(door);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), std({ map: T.sign('TO THE GAME →', '#e84a5f', '#fff') })); sign.position.set(W / 2 - 0.08, 8.6, 4); sign.rotation.y = -Math.PI / 2; L.add(sign);
    const shopMat = new THREE.Mesh(new THREE.RingGeometry(map.shop.r - 0.3, map.shop.r, 40), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.7, depthWrite: false })); shopMat.rotation.x = -Math.PI / 2; shopMat.position.set(map.shop.x, 0.03, map.shop.z); L.add(shopMat);
    this.shopRing = shopMat;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), std({ map: T.sign('STEP HERE', '#ffd23a', '#5a2a9a'), transparent: true })); label.rotation.x = -Math.PI / 2; label.position.set(map.shop.x, 0.04, map.shop.z + map.shop.r + 0.6); L.add(label);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(5, 48), std({ map: T.rug(), roughness: 1, transparent: true })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.02, 2.5); L.add(rug);
    // bunting across the ceiling
    for (let i = 0; i < 18; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 3), std({ color: FABRIC[i % FABRIC.length], side: THREE.DoubleSide })); f.rotation.x = Math.PI; f.position.set(-W / 2 + 1 + i * (W - 2) / 17, map.roof - 1.2 - Math.sin(i / 17 * Math.PI) * 1.2, -2); L.add(f); }
  }

  // ------------------------------------------------------------------ little effects
  puff(p, col = 0xffffff, n = 10, speed = 3) {
    this.dropGeo ||= new THREE.SphereGeometry(1, 6, 4);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.dropGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, depthWrite: false }));
      m.position.set(p.x, p.y, p.z); m.scale.setScalar(0.06 + Math.random() * 0.06);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.5 + Math.random()));
      this.fx.add(m); this.parts.push({ m, v, life: 0.6 + Math.random() * 0.4, fade: true });
    }
  }
  confetti(p, n = 40) {
    this.confGeo ||= new THREE.PlaneGeometry(0.12, 0.2);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.confGeo, new THREE.MeshBasicMaterial({ color: FABRIC[i % FABRIC.length], side: THREE.DoubleSide }));
      m.position.set(p.x, p.y, p.z);
      const v = new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 5, (Math.random() - 0.5) * 6);
      this.fx.add(m); this.parts.push({ m, v, life: 2 + Math.random(), spin: new THREE.Vector3(Math.random() * 9, Math.random() * 9, 0), conf: true });
    }
  }
  update(dt, t) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i]; q.life -= dt;
      if (q.life <= 0) { this.fx.remove(q.m); q.m.material.dispose(); this.parts.splice(i, 1); continue; }
      if (q.conf) { q.v.y -= 9 * dt; q.v.multiplyScalar(1 - dt * 1.5); q.m.rotation.x += q.spin.x * dt; q.m.rotation.y += q.spin.y * dt; }
      else { q.v.y += dt * 0.5; q.m.scale.multiplyScalar(1 + dt * 2.5); if (q.fade) q.m.material.opacity *= 1 - dt * 3; }
      q.m.position.addScaledVector(q.v, dt);
      if (q.m.position.y < 0.02) { q.m.position.y = 0.02; q.v.set(0, 0, 0); }
    }
    if (this.spinCoin) this.spinCoin.rotation.z = t * 1.5;
    if (this.shopRing) this.shopRing.material.opacity = 0.45 + Math.sin(t * 4) * 0.25;
    if (this.swings) this.swings.forEach((sw, i) => { sw.rotation.z = 0; sw.rotation.x = Math.sin(t * 1.6 + i * 1.3) * 0.35; });
    if (this.butterflies) for (const b of this.butterflies) { const u = b.userData, a = t * 0.5 + u.ph; b.position.set(u.c[0] + Math.cos(a) * 4, u.c[1] + Math.sin(t * 2 + u.ph) * 0.8, u.c[2] + Math.sin(a * 1.3) * 3); b.rotation.y = a; b.children[0].rotation.y = Math.sin(t * 18) * 0.9; b.children[1].rotation.y = -Math.sin(t * 18) * 0.9; }
    if (this.flag) this.flag.rotation.y = Math.sin(t * 3) * 0.3;
    if (this.duck) { this.duck[0].position.y = 0.9 + Math.sin(t * 2) * 0.05; this.duck[1].position.y = 1.5 + Math.sin(t * 2) * 0.05; }
    if (this.clockHands) { this.clockHands[0].rotation.z = -t * 0.05; this.clockHands[1].rotation.z = -t * 0.6; }
  }
}
