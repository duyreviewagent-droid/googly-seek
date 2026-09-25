// ?icon=1 — draws the app icon: a purple googly seeker chasing a panicking brown googly across a giant bedroom floor.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Googly } from './googly.js';

export function renderIcon() {
  const N = 1024;
  document.body.innerHTML = '';
  document.body.style.background = 'transparent'; document.documentElement.style.background = 'transparent';
  const out = document.createElement('canvas'); out.width = out.height = N; out.style.cssText = 'position:fixed;left:0;top:0;width:1024px;height:1024px';
  document.body.appendChild(out);
  const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(N, N, false);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x442a22, 1.2));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.6); key.position.set(3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff66cc, 1.6); rim.position.set(-4, 3, -3); scene.add(rim);

  // the brown googly, running away to the left, looking back in panic
  const brown = new Googly({ color: '#8a5a2b', local: true });
  brown.group.position.set(-0.72, 0.12, 0.2); brown.group.rotation.y = -1.25; scene.add(brown.group);
  // the purple seeker, lunging after him with both arms out
  const purple = new Googly({ color: '#9b59ff', local: true }); purple.setSeeker(true);
  purple.group.position.set(0.82, 0.0, -0.3); purple.group.rotation.y = -1.05; purple.group.scale.setScalar(1.08); scene.add(purple.group);
  for (let i = 0; i < 80; i++) {
    brown.update(1 / 60, { speed: 7, onGround: i % 40 < 30 });
    purple.reachT = 0.2; purple.update(1 / 60, { speed: 7, onGround: true });
  }
  // freeze a good stride and lean hard into the run
  brown.body.rotation.x = 0.45; brown.body.rotation.y = 0.9;      // twisted round, looking back over his shoulder
  purple.body.rotation.x = 0.55;
  brown.eyes.forEach((e, i) => e.pupil.position.set(i ? 0.02 : 0.035, 0.035, 0.022));    // wide, terrified
  brown.mouth.rotation.z = 0; brown.mouth.position.y = 0.44; brown.mouth.scale.set(1.2, 1.5, 1);
  purple.eyes.forEach((e, i) => e.pupil.position.set(i ? -0.045 : -0.03, -0.01, 0.022));  // locked on
  purple.mouth.rotation.z = Math.PI; purple.mouth.scale.set(1.5, 1.2, 1);
  // brows: worried on brown, determined on purple
  const browM = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.6 });
  for (const side of [-1, 1]) {
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.045, 0.05), browM); b1.position.set(side * 0.12, 0.83, 0.29); b1.rotation.set(-0.25, side * 0.3, -side * 0.4); brown.body.add(b1);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.05, 0.05), browM); b2.position.set(side * 0.11, 0.8, 0.3); b2.rotation.set(-0.25, side * 0.3, side * 0.45); purple.body.add(b2);
  }
  // the arms: reach for real (update() eased them; set them fully out)
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(0.05, 1.45, 7.4); cam.lookAt(0.05, 0.92, 0);
  scene.updateMatrixWorld(true);
  r.render(scene, cam);

  const g = out.getContext('2d');
  const M = 100, S = N - 2 * M, R = 185;
  g.save();
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 30; g.shadowOffsetY = 12;
  tile(g, M, M, S, S, R); const bg = g.createLinearGradient(0, M, 0, M + S); bg.addColorStop(0, '#2a1250'); bg.addColorStop(0.55, '#4a2080'); bg.addColorStop(1, '#1a0a30'); g.fillStyle = bg; g.fill();
  g.restore();
  g.save(); tile(g, M, M, S, S, R); g.clip();
  // wallpaper stars and a wooden floor
  const star = (x, y, rad, c) => { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? rad * 0.45 : rad; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); };
  for (const [x, y, s] of [[210, 230, 22], [800, 200, 16], [640, 300, 12], [330, 380, 10], [860, 420, 20], [170, 470, 12]]) star(x, y, s, 'rgba(255,240,180,.55)');
  const fl = g.createLinearGradient(0, 700, 0, N); fl.addColorStop(0, '#b8793e'); fl.addColorStop(1, '#6a3e1a'); g.fillStyle = fl; g.fillRect(0, 720, N, N);
  g.strokeStyle = 'rgba(60,30,10,.45)'; g.lineWidth = 4; for (let y = 760; y < N; y += 52) { g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke(); }
  for (let y = 720; y < N; y += 52) for (let x = (y / 52 % 2) * 180; x < N; x += 360) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 52); g.stroke(); }
  // speed lines behind the runners
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineCap = 'round';
  for (const [x, y, l] of [[700, 470, 170], [760, 560, 130], [720, 650, 150], [300, 520, 110], [330, 610, 90]]) { g.lineWidth = 9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke(); }
  // shadows under their feet
  for (const [x, w] of [[330, 130], [690, 150]]) { const sh = g.createRadialGradient(x, 752, 5, x, 752, w); sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.beginPath(); g.ellipse(x, 752, w, 24, 0, 0, 7); g.fill(); }
  g.restore();
  g.drawImage(r.domElement, 0, 0);
  // a sweat drop flying off the brown one, a "!" above him
  g.fillStyle = '#9ad8ff'; g.beginPath(); g.moveTo(410, 318); g.quadraticCurveTo(382, 360, 410, 372); g.quadraticCurveTo(438, 360, 410, 318); g.fill();
  g.font = '900 120px "Arial Black", Futura, sans-serif'; g.fillStyle = '#ffd23a'; g.strokeStyle = '#3a1a00'; g.lineWidth = 10; g.textAlign = 'center';
  g.strokeText('!', 330, 300); g.fillText('!', 330, 300);
  document.title = 'ICON READY';
  window.__iconReady = true;
}
function tile(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
