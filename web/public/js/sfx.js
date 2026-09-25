// Every sound and every note of music is synthesised live with WebAudio — nothing to download.
let ctx = null, master = null, sfxBus = null, musicBus = null, comp = null, verb = null;
let musicOn = true, sfxOn = true;
try { musicOn = localStorage.getItem('gs.music') !== '0'; sfxOn = localStorage.getItem('gs.sfx') !== '0'; } catch { }
const MUSIC_VOL = 0.4;

export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
  master = ctx.createGain(); master.gain.value = 0.8; master.connect(comp);
  sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 1 : 0; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? MUSIC_VOL : 0; musicBus.connect(master);
  // a roomy reverb from a noise impulse (it's a giant bedroom)
  verb = ctx.createConvolver();
  const len = ctx.sampleRate * 1.8, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.25; verb.connect(vg); vg.connect(master);
  music.tick();
}
export function setMusic(on) { musicOn = on; try { localStorage.setItem('gs.music', on ? '1' : '0'); } catch { } if (musicBus) musicBus.gain.setTargetAtTime(on ? MUSIC_VOL : 0, ctx.currentTime, 0.1); }
export function setSfx(on) { sfxOn = on; try { localStorage.setItem('gs.sfx', on ? '1' : '0'); } catch { } if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05); }
export const audioState = () => ({ music: musicOn, sfx: sfxOn });
const now = () => ctx ? ctx.currentTime : 0;
const midi = m => 440 * Math.pow(2, (m - 69) / 12);

// ------------------------------------------------------------------ building blocks
let noiseBuf = null;
function nb() { if (!noiseBuf) { const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } return noiseBuf; }
function tone(f, t0, dur, { type = 'sine', vol = 0.3, attack = 0.004, slide = 0, out = sfxBus, send = 0, vib = 0 } = {}) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t0 + dur);
  if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 6; lg.gain.value = f * vib; l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + dur + 0.05); }
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
  o.connect(g); g.connect(out); if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(verb); }
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(t0, dur, { vol = 0.3, f = 2000, q = 1, type = 'bandpass', slide = 0, out = sfxBus, attack = 0.002, send = 0 } = {}) {
  if (!ctx) return;
  const s = ctx.createBufferSource(); s.buffer = nb(); s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q;
  if (slide) fl.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t0 + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
  s.connect(fl); fl.connect(g); g.connect(out); if (send) { const sg = ctx.createGain(); sg.gain.value = send; g.connect(sg); sg.connect(verb); }
  s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.05);
}
// positional: an output node panned/attenuated for a world position relative to the listener
let listener = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };
export function setListener(x, y, z, yaw) { listener = { x, y, z, rx: Math.cos(yaw), rz: -Math.sin(yaw) }; }
function at(pos, base = 1, reach = 7) {
  if (!ctx) return null;
  if (!pos) return sfxBus;
  const dx = pos[0] - listener.x, dy = pos[1] - listener.y, dz = pos[2] - listener.z, d = Math.hypot(dx, dy, dz);
  const g = ctx.createGain(); g.gain.value = base / (1 + d / reach);
  const p = ctx.createStereoPanner(); p.pan.value = d > 0.1 ? Math.max(-1, Math.min(1, (dx * listener.rx + dz * listener.rz) / d)) * 0.9 : 0;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000 / (1 + d / 12);
  g.connect(lp); lp.connect(p); p.connect(sfxBus);
  setTimeout(() => { try { g.disconnect(); lp.disconnect(); p.disconnect(); } catch { } }, 3000);
  return g;
}

// ------------------------------------------------------------------ sound effects
export const sfx = {
  click() { if (!ctx) return; tone(2200, now(), 0.03, { vol: 0.08 }); },
  hover() { if (!ctx) return; tone(1500, now(), 0.02, { vol: 0.03 }); },
  step(pos, v = 1, soft = false) {
    if (!ctx) return; const t = now(), o = at(pos, 0.5 * v);
    if (soft) noise(t, 0.06, { f: 700, q: 0.7, vol: 0.18, out: o });
    else { noise(t, 0.045, { f: 1500, q: 1.5, vol: 0.22, out: o }); tone(120 + Math.random() * 20, t, 0.05, { vol: 0.08, out: o, slide: 0.7 }); }
  },
  jump(pos) { if (!ctx) return; const t = now(), o = at(pos, 0.8); tone(300, t, 0.16, { vol: 0.14, slide: 2, out: o }); tone(600, t + 0.02, 0.1, { vol: 0.05, slide: 1.8, out: o, type: 'triangle' }); },
  land(v = 1, pos) { if (!ctx) return; const t = now(), o = at(pos, 1); tone(90, t, 0.12, { vol: 0.25 * v, slide: 0.5, out: o }); noise(t, 0.08, { f: 700, vol: 0.18 * v, out: o }); },
  boing(pos) { if (!ctx) return; const t = now(), o = at(pos, 1); tone(180, t, 0.5, { vol: 0.25, slide: 2.6, out: o, vib: 0.05 }); tone(360, t, 0.35, { vol: 0.08, slide: 2.4, out: o, type: 'triangle' }); },
  // the seeker's grab: a whoosh of arms
  reach(pos) { if (!ctx) return; const t = now(), o = at(pos, 1); noise(t, 0.22, { f: 900, q: 1.2, vol: 0.35, slide: 2.4, out: o, attack: 0.03 }); },
  // GOTCHA: a bright pop and a triumphant boing for the finder
  gotcha(pos) {
    if (!ctx) return; const t = now(), o = at(pos, 1.3, 10);
    noise(t, 0.08, { f: 2600, q: 2, vol: 0.4, out: o });
    [72, 76, 79, 84].forEach((m, i) => tone(midi(m), t + i * 0.06, 0.3, { type: 'square', vol: 0.07, out: o, send: 0.3 }));
    tone(220, t, 0.45, { vol: 0.2, slide: 3, out: o });
  },
  // you were found: a squeaky "eep!" and a sad slide
  found() { if (!ctx) return; const t = now(); tone(1100, t, 0.12, { type: 'triangle', vol: 0.2, slide: 1.6 }); tone(700, t + 0.14, 0.7, { type: 'sawtooth', vol: 0.06, slide: 0.4, send: 0.3 }); noise(t, 0.2, { f: 3000, q: 3, vol: 0.15 }); },
  // the hint every 30 s: a rubber-duck squeak from every hider
  squeak(pos, mine) { if (!ctx) return; const t = now(), o = at(pos, mine ? 0.6 : 1.4, 14); tone(1400 + Math.random() * 300, t, 0.09, { type: 'square', vol: 0.1, slide: 1.5, out: o, send: 0.2 }); tone(1800, t + 0.1, 0.12, { type: 'square', vol: 0.08, slide: 0.7, out: o, send: 0.2 }); },
  // taunts: raspberry, yoo-hoo whistle, nyah-nyah, honk
  taunt(pos, k = 0, mine = false) {
    if (!ctx) return; const t = now(), o = at(pos, mine ? 0.9 : 1.5, 14);
    if (k === 0) { const f = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(); f.type = 'sawtooth'; f.frequency.value = 110; l.frequency.value = 38; lg.gain.value = 60; l.connect(lg); lg.connect(f.frequency); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 0.7); f.connect(g); g.connect(o); f.start(t); l.start(t); f.stop(t + 0.75); l.stop(t + 0.75); noise(t, 0.6, { f: 400, q: 0.8, vol: 0.12, out: o }); }
    if (k === 1) { tone(1200, t, 0.3, { vol: 0.12, slide: 1.5, out: o, send: 0.3 }); tone(1500, t + 0.35, 0.45, { vol: 0.12, slide: 0.6, out: o, send: 0.3 }); }
    if (k === 2) { [79, 76, 81, 79, 76].forEach((m, i) => tone(midi(m), t + i * 0.16, 0.18, { type: 'triangle', vol: 0.15, out: o, send: 0.2 })); }
    if (k === 3) { for (const f of [330, 415]) tone(f, t, 0.35, { type: 'sawtooth', vol: 0.07, out: o, attack: 0.01 }); tone(330, t + 0.4, 0.35, { type: 'sawtooth', vol: 0.07, out: o }); }
  },
  heartbeat(v) { if (!ctx) return; const t = now(); tone(58, t, 0.16, { vol: 0.5 * v, slide: 0.6 }); tone(52, t + 0.2, 0.2, { vol: 0.38 * v, slide: 0.6 }); },
  tick(hi) { if (!ctx) return; const t = now(); noise(t, 0.02, { f: hi ? 4200 : 3000, q: 8, vol: 0.18 }); },
  beep(hi) { if (!ctx) return; tone(hi ? 1320 : 880, now(), hi ? 0.5 : 0.18, { type: 'square', vol: 0.09, send: 0.2 }); },
  // "READY OR NOT, HERE I COME!"
  readyOrNot() { if (!ctx) return; const t = now(); [60, 64, 67, 72].forEach((m, i) => tone(midi(m), t + i * 0.09, 0.4, { type: 'sawtooth', vol: 0.06, send: 0.3 })); for (const f of [262, 330, 392]) tone(f, t + 0.4, 0.9, { type: 'square', vol: 0.05, attack: 0.02, send: 0.4 }); noise(t + 0.4, 0.6, { f: 5000, q: 0.5, type: 'highpass', vol: 0.08 }); },
  hide() { if (!ctx) return; const t = now(); [67, 72, 76].forEach((m, i) => tone(midi(m), t + i * 0.08, 0.3, { type: 'triangle', vol: 0.12, send: 0.3 })); },
  coin(n = 1) { if (!ctx) return; const t = now(); for (let i = 0; i < Math.min(n, 12); i++) { tone(midi(88), t + i * 0.07, 0.08, { type: 'square', vol: 0.05 }); tone(midi(95), t + i * 0.07 + 0.05, 0.25, { type: 'square', vol: 0.05, send: 0.2 }); } },
  buy() { if (!ctx) return; const t = now(); noise(t, 0.05, { f: 3000, q: 2, vol: 0.2 }); [76, 79, 84, 88].forEach((m, i) => tone(midi(m), t + 0.05 + i * 0.07, 0.35, { type: 'triangle', vol: 0.14, send: 0.4 })); },
  nope() { if (!ctx) return; const t = now(); tone(220, t, 0.12, { type: 'square', vol: 0.08 }); tone(180, t + 0.12, 0.2, { type: 'square', vol: 0.08 }); },
  win() { if (!ctx) return; const t = now(); [67, 72, 76, 79, 84, 88, 91].forEach((m, i) => { tone(midi(m), t + i * 0.1, 0.6, { type: 'triangle', vol: 0.16, send: 0.4 }); tone(midi(m - 12), t + i * 0.1, 0.4, { type: 'square', vol: 0.04 }); }); for (let i = 0; i < 20; i++) noise(t + 0.7 + Math.random() * 1.2, 0.05, { f: 3000 + Math.random() * 3000, q: 6, vol: 0.1 }); },
  lose() { if (!ctx) return; const t = now(); [67, 63, 60, 55].forEach((m, i) => tone(midi(m), t + i * 0.2, 0.55, { type: 'triangle', vol: 0.14, send: 0.3 })); },
  chat() { if (!ctx) return; tone(1200, now(), 0.06, { vol: 0.06 }); },
  join() { if (!ctx) return; const t = now(); tone(660, t, 0.1, { vol: 0.08 }); tone(990, t + 0.08, 0.14, { vol: 0.08 }); },
  shopOpen() { if (!ctx) return; const t = now(); [84, 88, 91].forEach((m, i) => tone(midi(m), t + i * 0.05, 0.3, { type: 'sine', vol: 0.1, send: 0.4 })); noise(t, 0.3, { f: 7000, q: 0.5, type: 'highpass', vol: 0.05 }); },
};

// ------------------------------------------------------------------ music: a little step sequencer
// menu: bouncy marimba; lobby: same tune lighter; hide: sneaky tiptoe; seek: tense chase; end: victory vamp
const SONGS = {
  menu: { bpm: 112, root: 48, prog: [0, 5, 7, 5], kick: 'x.......x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: [0, null, 7, null, 12, null, 7, null, 0, null, 7, null, 12, 11, 9, 7], lead: [12, 16, 19, null, 16, null, 12, null, 14, 17, 21, null, 19, null, 16, null], pad: true, voice: 'marimba', swing: 0.14 },
  lobby: { bpm: 104, root: 50, prog: [0, 3, 5, 3], kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', bass: [0, null, null, 7, null, null, 12, null, 0, null, null, 7, null, 10, null, null], lead: [12, null, 16, null, 19, null, 16, null, 14, null, 17, null, 16, null, 12, null], pad: true, voice: 'marimba', swing: 0.2 },
  hide: { bpm: 92, root: 45, prog: [0, 0, 1, 0], kick: 'x.......x.......', snare: '............x...', hat: 'x...x...x...x...', bass: [0, null, 3, null, 7, null, 6, null, 5, null, 3, null, 2, null, 3, null], lead: [null, null, 12, null, null, 11, null, null, 12, null, 15, null, null, 14, null, 12], pad: false, voice: 'pizz', swing: 0 },
  seek: { bpm: 128, root: 40, prog: [0, 0, 3, 1], kick: 'x...x...x...x.x.', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', bass: [0, 0, 12, 0, 0, 12, 0, 3, 0, 0, 12, 0, 7, 6, 5, 3], lead: [12, null, 15, null, 13, null, 12, null, 15, 17, 18, null, 17, null, 15, null], pad: false, voice: 'square', swing: 0 },
  end: { bpm: 116, root: 48, prog: [0, 5, 7, 5], kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: [0, null, null, 7, null, null, 12, null, 0, null, null, 7, null, 12, null, null], lead: [12, 16, 19, 24, null, 19, 16, null, 12, 16, 19, 24, null, 24, 26, null], pad: true, voice: 'marimba', swing: 0 },
};
export const music = {
  song: 'menu', step: 0, next: 0, bar: 0, intensity: 0,
  play(name) { if (this.song === name) return; this.song = name; this.step = 0; this.bar = 0; },
  tick() {
    if (!ctx) return;
    const S = SONGS[this.song], spb = 60 / (S.bpm * (this.song === 'seek' ? 1 + this.intensity * 0.12 : 1)) / 4;
    if (this.next < ctx.currentTime) this.next = ctx.currentTime + 0.05;
    while (this.next < ctx.currentTime + 0.15) {
      const s = this.step % 16, t = this.next, chord = S.prog[this.bar % S.prog.length], out = musicBus;
      const tt = t + (s % 2 ? spb * S.swing : 0);
      if (S.kick[s] === 'x') { tone(150, tt, 0.26, { vol: this.song === 'hide' ? 0.3 : 0.5, slide: 0.28, out }); noise(tt, 0.01, { f: 3000, vol: 0.08, out }); }
      if (S.snare[s] === 'x') { if (this.song === 'hide') noise(tt, 0.05, { f: 5000, q: 3, vol: 0.12, out }); else { noise(tt, 0.15, { f: 1900, q: 0.7, vol: 0.28, out, send: 0.3 }); tone(210, tt, 0.07, { vol: 0.12, type: 'triangle', out }); } }
      if (S.hat[s] === 'x') noise(tt, this.song === 'hide' ? 0.015 : s % 4 === 2 ? 0.07 : 0.03, { f: this.song === 'hide' ? 3500 : 8500, q: this.song === 'hide' ? 9 : 1, type: this.song === 'hide' ? 'bandpass' : 'highpass', vol: this.song === 'hide' ? 0.12 : s % 4 === 2 ? 0.1 : 0.06, out });
      const b = S.bass[s];
      if (b !== null) { const f = midi(S.root + chord + b); if (S.voice === 'pizz') this.pluck(f, tt, 0.22, 0.2); else this.bassNote(f, tt, spb * 1.6); }
      const l = S.lead[s];
      if (l !== null && (this.song !== 'menu' || this.bar % 4 >= 1)) {
        const f = midi(S.root + 24 + chord + l);
        if (S.voice === 'marimba') { tone(f, tt, 0.35, { type: 'sine', vol: 0.09, out, send: 0.3 }); tone(f * 4, tt, 0.05, { type: 'sine', vol: 0.03, out }); }
        else if (S.voice === 'pizz') this.pluck(f, tt, 0.18, 0.1);
        else tone(f, tt, spb * 1.4, { type: 'square', vol: 0.03 + this.intensity * 0.015, out, send: 0.3 });
      }
      if (S.pad && s === 0) for (const iv of [0, 4, 7, 11]) tone(midi(S.root + 12 + chord + iv), t, spb * 15, { type: 'sine', vol: 0.025, attack: 0.3, out, send: 0.5 });
      if (this.song === 'seek' && this.intensity > 0.5 && s % 2 === 0) tone(midi(S.root + 36 + chord), tt, 0.05, { type: 'square', vol: 0.02, out });
      if (this.song === 'hide' && s === 0 && this.bar % 2 === 1) tone(midi(S.root + 36), t, 0.6, { type: 'sine', vol: 0.04, out, send: 0.6, vib: 0.01 });
      this.next += spb; this.step++;
      if (this.step % 16 === 0) this.bar++;
    }
    setTimeout(() => this.tick(), 40);
  },
  pluck(f, t, dur, vol) {
    const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(3000, t); fl.frequency.exponentialRampToValueAtTime(300, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
  },
  bassNote(f, t, dur) {
    const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f;
    fl.type = 'lowpass'; fl.Q.value = 6; fl.frequency.setValueAtTime(1200, t); fl.frequency.exponentialRampToValueAtTime(180, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
  },
};
