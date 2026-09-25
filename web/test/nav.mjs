// Checks the maps: spawns are clear, computer players can walk (and climb) to every hiding place, soft things block sight.
import { MAPS } from '../public/js/maps.js';
import * as S from '../public/js/sim.js';
let bad = 0;
for (const map of MAPS) {
  const t0 = performance.now(), nav = S.buildNav(map);
  console.log(`${map.name}: nav ${nav.nx}x${nav.nz} in ${(performance.now() - t0).toFixed(0)}ms, open ${nav.open.reduce((a, b) => a + b, 0)}, low ${nav.low.reduce((a, b) => a + b, 0)}`);
  for (const [x, z] of [...map.spawns, ...map.seekSpots]) { const k = S.navNode(nav, x, 0, z); if (k < 0 || nav.floor[k] > 0.3) { console.log('  spawn not open', x, z); bad++; } }
  const [sx, sz] = map.spawns[0];
  let reached = 0;
  for (const h of map.hides) {
    const k = S.navNode(nav, h[0], h[4] || 0, h[1]);
    const path = S.findPath(nav, sx, 0, sz, h[0], h[4] || 0, h[1]);
    if (!path || k < 0 || Math.abs(nav.floor[k] - (h[4] || 0)) > 0.5) { console.log('  hide unreachable', h, 'node', k, 'floor', nav.floor[k], 'path', !!path); bad++; continue; }
    // walk a simulated googly along the path, the way the server's computer players do
    const p = { x: sx, y: 0, z: sz, vx: 0, vy: 0, vz: 0, onGround: true, crouch: false };
    let stuckT = 0, last = [p.x, p.z], jumpNext = false, walk = path;
    for (let i = 0; i < 60 * 40; i++) {
      const f = S.followPath(p, walk, nav);
      if (f.done) break;
      S.stepPlayer(p, { dx: f.dx, dz: f.dz, jump: f.jump || jumpNext, crouch: f.crouch || (walk.length === 1 && h[2]), sprint: false }, 1 / 60, map);
      jumpNext = false;
      stuckT += 1 / 60;
      if (stuckT > 0.8) { if (Math.hypot(p.x - last[0], p.z - last[1]) < 0.3) { jumpNext = true; walk = S.findPath(nav, p.x, p.y, p.z, h[0], h[4] || 0, h[1]) || walk; } stuckT = 0; last = [p.x, p.z]; }
    }
    if (Math.hypot(p.x - h[0], p.z - h[1]) < 0.9 && Math.abs(p.y - (h[4] || 0)) < 0.5) reached++;
    else { console.log('  walker missed', h, 'ended at', p.x.toFixed(1), p.y.toFixed(1), p.z.toFixed(1)); bad++; }
  }
  if (map.hides.length) console.log(`  walker reached ${reached}/${map.hides.length} hiding places`);
}
const room = MAPS[0];
const check = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) bad++; };
check('curtain blocks sight', !S.canSee(room, [0, 1.4, -18], [-8, 1.0, -23.4]));
check('curtain does not block feet', S.segMap(room, 0, 1, -18, -8, 1, -23.4, false) === null);
check('under the bed is a low ceiling', S.lowCeiling(room, -26, 0, -18));
check('open floor is not', !S.lowCeiling(room, 0, 0, 3));
check('laundry pile hides a crouched googly', !S.seesBody(room, [18, 1.42, 16], { x: 23.2, y: 0, z: 16, crouch: true }));
check('laundry pile shows a standing googly', S.seesBody(room, [18, 1.42, 16], { x: 23.2, y: 0, z: 16, crouch: false }));
process.exit(bad ? 1 : 0);
