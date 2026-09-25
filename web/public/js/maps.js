// The two places: the Giant Bedroom (where you hide) and the Waiting Hall (the lobby you walk around in).
// Colliders: boxes {t:'b', x,z centre, w (x size), d (z size), y bottom, h height} and upright cylinders {t:'c', x,z,r,y,h}.
// soft: true = blocks sight (curtains, blankets, tent walls, laundry) but you can walk through it.
const B = (x, z, w, d, h, m, y = 0, o = {}) => ({ t: 'b', x, z, w, d, h, y, m, ...o });
const C = (x, z, r, h, m, y = 0, o = {}) => ({ t: 'c', x, z, r, h, y, m, ...o });
const SOFT = { soft: true };
const walls = (W, D, H) => [B(0, -D / 2 - 0.5, W + 2, 1, H, 'wall'), B(0, D / 2 + 0.5, W + 2, 1, H, 'wall'), B(-W / 2 - 0.5, 0, 1, D + 2, H, 'wall'), B(W / 2 + 0.5, 0, 1, D + 2, H, 'wall')];
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function giantBedroom() {
  const W = 64, D = 48, H = 16, c = walls(W, D, H);
  // ---- BED (north-west). Crawl under it (crouch), or climb the book stairs onto the quilt and hide behind the pillows.
  for (const [x, z] of [[-29.5, -22.5], [-18.5, -22.5], [-29.5, -9.5], [-18.5, -9.5]]) c.push(C(x, z, 0.45, 1.5, 'bedleg'));
  c.push(B(-24, -16, 12, 14, 1.5, 'bed', 1.5));
  c.push(B(-24, -23.5, 12.6, 0.8, 7, 'headboard'));
  c.push(B(-24, -8.9, 12.2, 0.12, 1.25, 'skirt', 0.25, SOFT));        // quilt hanging over the foot end
  c.push(B(-24, -20.6, 9.5, 2.6, 1.3, 'pillow', 3.0, SOFT));          // pillows on top
  c.push(B(-16.8, -11.5, 2.4, 2.4, 2.2, 'books'), B(-14.4, -11.5, 2.4, 2.4, 1.1, 'books'));
  c.push(B(-14.6, -21, 4, 4, 4, 'nightstand'), C(-14.6, -21, 0.35, 3.2, 'lamp', 4));
  // ---- WINDOW with long curtains (stand behind them) and a radiator underneath
  c.push(B(-7.5, -22.3, 4.6, 0.35, 15.6, 'curtain', 0.2, SOFT), B(7.5, -22.3, 4.6, 0.35, 15.6, 'curtain', 0.2, SOFT));
  c.push(B(0, -23.35, 9, 0.9, 2.6, 'radiator'));
  // ---- DOLLHOUSE (open at the back)
  c.push(B(-6.8, -14, 0.4, 6, 9, 'doll'), B(2.8, -14, 0.4, 6, 9, 'doll'));
  c.push(B(-5.1, -11.2, 3.8, 0.4, 9, 'dollfront'), B(1.1, -11.2, 3.8, 0.4, 9, 'dollfront'), B(-2, -11.2, 2.4, 0.4, 5.6, 'dollfront', 3.4));
  c.push(B(-2, -14, 9.2, 5.2, 0.4, 'dollfloor', 4.2), B(-2, -14, 10, 6, 0.4, 'dollroof', 9));
  c.push(B(-5.4, -15.6, 2.2, 1.0, 1.0, 'dollsofa'));
  // ---- TOY TENT (walls block sight, walk right in)
  c.push(C(10, -12, 3.2, 5.2, 'tent', 0, SOFT));
  // ---- WARDROBE (north-east): one door shut, one swung open, clothes and a long coat inside
  c.push(B(26, -23.7, 10, 0.6, 14, 'wardrobe'), B(21.3, -21, 0.6, 6, 14, 'wardrobe'), B(30.7, -21, 0.6, 6, 14, 'wardrobe'));
  c.push(B(26, -21, 10, 6, 0.8, 'wardrobe', 13.2), B(26, -21, 8.8, 5.4, 0.4, 'wplinth'));
  c.push(B(23.8, -17.8, 4.4, 0.4, 12.6, 'wdoor', 0.5), B(30.8, -15.6, 0.4, 4.4, 12.6, 'wdoorOpen', 0.5));
  c.push(B(27.4, -21, 5.6, 3, 5.5, 'clothes', 6.5, SOFT), B(29.2, -21.6, 1.6, 2.2, 10.5, 'coat', 0.9, SOFT));
  c.push(B(23.2, -22.2, 2.4, 2.4, 1.1, 'shoebox', 0.4));
  // ---- DESK + CHAIR (east wall)
  for (const [x, z] of [[24.5, -7.5], [31.5, -7.5], [24.5, 3.5], [31.5, 3.5]]) c.push(C(x, z, 0.3, 5, 'deskleg'));
  c.push(B(28, -2, 8, 12, 0.5, 'desk', 5));
  for (const [x, z] of [[20.1, -3.4], [22.9, -3.4], [20.1, -0.6], [22.9, -0.6]]) c.push(C(x, z, 0.22, 2.6, 'chairleg'));
  c.push(B(21.5, -2, 3.6, 3.6, 0.4, 'chair', 2.6), B(19.9, -2, 0.4, 3.6, 4.2, 'chairback', 3.0));
  c.push(C(29.5, 6.8, 1.3, 2.4, 'bin'));
  // ---- BOOKSHELF (west wall). Book stairs lead up to the first shelf; hide behind the book lying flat.
  c.push(B(-30, -1.8, 4, 0.4, 14, 'shelf'), B(-30, 11.8, 4, 0.4, 14, 'shelf'), B(-30, 5, 4, 14, 0.4, 'shelf', 13.6));
  c.push(B(-30, 5, 4, 13.2, 0.45, 'board'));
  for (const y of [4.0, 8.0, 12.0]) c.push(B(-30, 5, 4, 13.2, 0.4, 'board', y));
  { // rows of books against the back of each shelf
    const r = rng(42);
    for (const [base, room] of [[0.45, 3.5], [4.4, 3.6], [8.4, 3.6], [12.4, 1.2]]) {
      let z = -1.6;
      while (z < 11.3) {
        const n = 2 + Math.floor(r() * 5), w = n * (0.45 + r() * 0.2);
        if (z + w > 11.6) break;
        const hgt = Math.min(room - 0.2, room * (0.6 + r() * 0.35));
        c.push(B(-31.3, z + w / 2, 1.4, w, hgt, 'bookrow', base, { seed: Math.floor(r() * 1e6) }));
        z += w + (r() < 0.35 ? 1.2 + r() * 1.5 : 0.05);
      }
    }
  }
  c.push(B(-28.5, 3, 1.2, 3.4, 1.3, 'bookflat', 0.45));
  c.push(B(-26.8, 9.5, 2.4, 2.4, 3.3, 'books'), B(-24.4, 9.5, 2.4, 2.4, 2.2, 'books'), B(-22.0, 9.5, 2.4, 2.4, 1.1, 'books'));
  // ---- TEDDY, BALL, BLOCK TOWER
  c.push(C(-14, -2, 2.3, 4.4, 'teddy'));
  c.push(C(5, -4, 1.7, 3.4, 'ball'));
  c.push(B(8, 0, 2.4, 2.4, 4.8, 'ablock2'), B(10.6, 0.6, 2.4, 2.4, 2.4, 'ablock'), B(9.2, 2.9, 2.4, 2.4, 2.4, 'ablock'));
  // ---- TOY TRAIN on the rug
  c.push(B(-1, 9.6, 3, 1.6, 1.8, 'traincar'), B(2.6, 9.6, 3, 1.6, 1.8, 'traincar'), B(6.4, 9.6, 3.4, 1.8, 2.6, 'engine'));
  // ---- TOY BOX (jump in off the block; there's a block inside to climb back out)
  c.push(B(-10, 10.7, 7, 0.4, 2.2, 'toybox'), B(-10, 15.3, 7, 0.4, 2.2, 'toybox'), B(-13.3, 13, 0.4, 5, 2.2, 'toybox'), B(-6.7, 13, 0.4, 5, 2.2, 'toybox'));
  c.push(B(-5.3, 13, 2.4, 2.4, 1.1, 'ablockS'), B(-12.1, 11.9, 1.6, 1.6, 1.1, 'ablockS'));
  // ---- BEAN BAG
  c.push(C(12, 10, 3.2, 3.2, 'beanbag'));
  // ---- CARDBOARD BOX FORT (open towards the middle of the room)
  c.push(B(1, 20.8, 6, 0.4, 3.6, 'cardboard'), B(-1.8, 18.5, 0.4, 5, 3.6, 'cardboard'), B(3.8, 18.5, 0.4, 5, 3.6, 'cardboard'), B(1, 18.5, 6, 5, 0.4, 'cardboardTop', 3.2));
  c.push(B(1, 16.1, 5.2, 0.1, 1.4, 'flap', 1.8, SOFT));
  // ---- DRESSER (south-west) with its drawers pulled out like stairs
  c.push(B(-20, 21.5, 10, 5, 4.4, 'dresser'));
  c.push(B(-20, 17.2, 8, 3.6, 1.1, 'drawer'), B(-20, 17.8, 8, 2.4, 1.1, 'drawer', 1.1), B(-20, 18.4, 8, 1.2, 1.1, 'drawer', 2.2));
  c.push(C(-23, 21.8, 1.1, 1.7, 'piggy', 4.4));
  // ---- LAUNDRY BASKET on its side + a pile of clothes spilling out (crouch in the pile!)
  c.push(B(29.8, 16, 0.4, 5, 4, 'basket'), B(27.5, 13.7, 5, 0.4, 4, 'basket'), B(27.5, 18.3, 5, 0.4, 4, 'basket'), B(27.5, 16, 5, 5, 0.4, 'basketTop', 3.6));
  c.push(C(23.4, 16, 2.6, 1.35, 'laundry', 0, SOFT));
  // ---- PLANT in the corner, lego bricks on the floor
  c.push(C(28.5, 20.5, 1.8, 3, 'plant'));
  c.push(B(15, 4, 2, 1, 0.45, 'lego', 0, { col: '#e8352c' }), B(-18, 6, 1, 2, 0.45, 'lego', 0, { col: '#2f6bff' }), B(18.5, 19.5, 2, 1, 0.45, 'lego', 0, { col: '#ffcc00' }), B(-6, -6, 1, 2, 0.45, 'lego', 0, { col: '#34c759' }));

  return {
    id: 0, name: 'The Giant Bedroom', W, D, roof: H, colliders: c,
    // hiders start in the middle of the rug; seekers count facing the wall by the door
    spawns: [[0, 3], [3, 4.5], [-3, 4.5], [0, 0], [4, 1.5], [-4, 1.5], [2, -1.2], [-2, -1.2]],
    seekSpots: [[14, 22.8], [11, 22.8], [17, 22.8]],
    // hiding places the computer hiders know about: [x, z, crouch, quality 0..1]
    hides: [
      [-26, -18, 1, 0.55], [-21.5, -14, 1, 0.45], [-27.5, -12.5, 1, 0.5], [-22, -21.5, 1, 0.6],
      [-17.3, -21, 0, 0.7], [-8, -23.4, 0, 0.8], [7.5, -23.4, 0, 0.8],
      [24.4, -19.5, 0, 0.85, 0.4], [29.2, -23.0, 0, 0.9, 0.4], [26.8, -19.3, 1, 0.6, 0.4],
      [28, -5, 1, 0.35], [30.5, 1.5, 1, 0.45], [21.5, -2, 1, 0.25],
      [14.8, 14.6, 1, 0.55], [10, -12, 1, 0.8], [11, -10.8, 1, 0.75],
      [1, 19.6, 1, 0.8], [2.8, 19.9, 1, 0.75], [23, 16, 1, 0.85], [28.6, 15, 1, 0.7], [28.6, 17.2, 1, 0.7],
      [-5.6, -12.2, 1, 0.65], [1.8, -12.3, 1, 0.65], [-17, -0.5, 1, 0.5], [31.0, 23.0, 1, 0.6],
      [-2, 11, 1, 0.3], [-14.3, 16.7, 1, 0.45], [-14.2, 20.2, 1, 0.5], [-29.85, 3, 1, 0.75, 0.45],
      [-24, -22.4, 1, 0.9, 3.0], [-29.3, 6, 1, 0.6, 4.4], [-17.5, 22.5, 1, 0.5, 4.4],
    ],
    ground: 'wood',
  };
}

function waitingHall() {
  const W = 34, D = 24, H = 10, c = walls(W, D, H);
  c.push(B(-11, -9.6, 8, 2.4, 2.2, 'counter'));                                   // the shop counter
  c.push(C(7, -5, 2.1, 0.55, 'tramp', 0, { bounce: 13 }), C(12, 3, 2.1, 0.55, 'tramp', 0, { bounce: 13 }), C(3.5, 6.5, 1.6, 0.55, 'tramp', 0, { bounce: 11 }));
  c.push(B(-12, 7.5, 2.4, 2.4, 1.1, 'ablock'), B(-14.4, 7.5, 2.4, 2.4, 2.2, 'ablock'), B(-14.4, 9.9, 2.4, 2.4, 3.3, 'ablock'));
  c.push(C(0, -1.5, 1.9, 1.0, 'fountain'));
  c.push(C(-3, 8, 2.2, 4, 'tent', 0, SOFT));
  c.push(B(14.5, -9, 3, 3, 1.6, 'giftbox'), C(-15, -2, 1.2, 2.2, 'plantS'));
  return {
    id: 1, name: 'Waiting Hall', W, D, roof: H, colliders: c,
    spawns: [[-4, 2], [4, 2], [-2, 4.5], [2, 4.5], [-5, -3], [5, -2], [-1, -5], [1.5, -5.5]],
    seekSpots: [[0, 4]], hides: [],
    shop: { x: -11, z: -6.6, r: 2.0 },
    ground: 'hall',
  };
}

export const MAPS = [giantBedroom(), waitingHall()];
export const ROOM = 0, LOBBY = 1;
