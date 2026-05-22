import * as THREE from 'three';

/* ───────── Setup ───────── */
const canvas  = document.getElementById('c');
const heroEl  = document.querySelector('.hero');
const readout = document.getElementById('rotReadout');
const cueEl   = document.getElementById('scrollCue');

const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
// Slightly elevated, looking down at the low supercar
camera.position.set(0, 1.55, 9.8);
camera.lookAt(0, 0.55, 0);

/* ───────── Materials ───────── */
const RED = 0xcc0000;
const matMain = new THREE.LineBasicMaterial({ color: RED, transparent:true, opacity:0.92 });
const matMid  = new THREE.LineBasicMaterial({ color: RED, transparent:true, opacity:0.55 });
const matSoft = new THREE.LineBasicMaterial({ color: RED, transparent:true, opacity:0.28 });

const V3 = THREE.Vector3;
function lineFrom(points, mat = matMain){
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat);
}
function loop(points, mat = matMain){
  return lineFrom([...points, points[0]], mat);
}

/* ───────── The car (procedural exotic) ─────────
   +X = forward (nose), -X = rear
   +Y = up
   +Z = right side
*/
const car = new THREE.Group();
scene.add(car);
car.position.y = 0.0;

/*
 Cross-section schema — eight points around the YZ perimeter at each X station.
 Indices (CCW viewed from +X):
   0 top-center, 1 top-left,  2 shoulder-left,  3 bottom-left,
   4 bottom-center, 5 bottom-right, 6 shoulder-right, 7 top-right
 Symmetric across Z so we only need yB, yS, yT, zBot, zSide, zTop.
*/
function sectionPts(p){
  return [
    new V3(p.x, p.yT,  0),
    new V3(p.x, p.yT, -p.zTop),
    new V3(p.x, p.yS, -p.zSide),
    new V3(p.x, p.yB, -p.zBot),
    new V3(p.x, p.yB,  0),
    new V3(p.x, p.yB,  p.zBot),
    new V3(p.x, p.yS,  p.zSide),
    new V3(p.x, p.yT,  p.zTop),
  ];
}

/* 13 cross-sections — low, wedge-shaped, mid-engine supercar */
const profiles = [
  /* nose tip — pointed, low */
  { x:  2.30, yB: 0.22, yS: 0.45, yT: 0.45, zBot: 0.22, zSide: 0.42, zTop: 0.15 },
  /* front fascia / splitter */
  { x:  1.95, yB: 0.18, yS: 0.62, yT: 0.62, zBot: 0.50, zSide: 0.82, zTop: 0.45 },
  /* front wheel arch — wide haunch */
  { x:  1.45, yB: 0.18, yS: 0.80, yT: 0.80, zBot: 0.62, zSide: 0.99, zTop: 0.62 },
  /* hood front */
  { x:  1.05, yB: 0.18, yS: 0.74, yT: 0.74, zBot: 0.74, zSide: 0.95, zTop: 0.70 },
  /* cowl / base of windshield */
  { x:  0.65, yB: 0.20, yS: 0.80, yT: 0.92, zBot: 0.78, zSide: 0.94, zTop: 0.55 },
  /* windshield mid */
  { x:  0.25, yB: 0.20, yS: 0.83, yT: 1.08, zBot: 0.80, zSide: 0.95, zTop: 0.40 },
  /* roof peak */
  { x: -0.10, yB: 0.20, yS: 0.86, yT: 1.13, zBot: 0.80, zSide: 0.96, zTop: 0.32 },
  /* fastback start */
  { x: -0.55, yB: 0.20, yS: 0.90, yT: 1.07, zBot: 0.80, zSide: 0.97, zTop: 0.40 },
  /* engine cover front */
  { x: -0.95, yB: 0.20, yS: 0.94, yT: 0.96, zBot: 0.76, zSide: 0.98, zTop: 0.82 },
  /* rear wheel arch — widest haunch */
  { x: -1.45, yB: 0.18, yS: 0.88, yT: 0.88, zBot: 0.62, zSide: 1.00, zTop: 0.88 },
  /* rear deck */
  { x: -1.90, yB: 0.20, yS: 0.82, yT: 0.82, zBot: 0.52, zSide: 0.90, zTop: 0.72 },
  /* tail — diffuser height */
  { x: -2.20, yB: 0.26, yS: 0.74, yT: 0.74, zBot: 0.38, zSide: 0.65, zTop: 0.40 },
  /* tail tip */
  { x: -2.35, yB: 0.32, yS: 0.60, yT: 0.60, zBot: 0.18, zSide: 0.30, zTop: 0.18 },
];

const sections = profiles.map(sectionPts);

/* Draw each cross-section as a bright closed loop */
for (const s of sections) car.add(loop(s, matMain));

/* Connect adjacent sections with longitudinals — main edges bright, fill softer */
const MAIN_INDICES = new Set([0, 2, 4, 6]); // top-center, shoulders, bottom-center
for (let i = 0; i < sections.length - 1; i++){
  const a = sections[i], b = sections[i+1];
  for (let j = 0; j < 8; j++){
    const mat = MAIN_INDICES.has(j) ? matMain : matMid;
    car.add(lineFrom([a[j], b[j]], mat));
  }
}

/* Extra body lines for definition */

// Belt-line / character crease along the doors (subtle s-curve)
for (let side of [-1, 1]){
  const z = side;
  car.add(lineFrom([
    new V3( 2.20, 0.50, z*0.40),
    new V3( 1.85, 0.66, z*0.80),
    new V3( 1.45, 0.78, z*0.97),
    new V3( 0.50, 0.78, z*0.93),
    new V3(-0.50, 0.80, z*0.95),
    new V3(-1.45, 0.84, z*0.99),
    new V3(-1.95, 0.80, z*0.88),
    new V3(-2.25, 0.70, z*0.60),
  ], matMain));
}

// Door cut line + handle slit (forward of rear wheel)
for (let side of [-1, 1]){
  const z = side * 0.96;
  car.add(lineFrom([new V3(-0.10, 0.20, z), new V3(-0.10, 0.88, z)], matMid));
  car.add(lineFrom([new V3( 0.85, 0.20, z), new V3( 0.85, 0.78, z)], matMid));
  // handle
  car.add(lineFrom([new V3( 0.20, 0.74, z), new V3( 0.55, 0.74, z)], matMain));
}

/* Front splitter (lip below the front fascia) */
for (let side of [-1, 1]){
  const z = side;
  car.add(lineFrom([
    new V3( 2.18, 0.13, z*0.30),
    new V3( 1.95, 0.10, z*0.78),
    new V3( 1.55, 0.12, z*0.92),
  ], matMain));
}
// splitter underline
car.add(lineFrom([
  new V3( 1.55, 0.12,  0.92),
  new V3( 1.95, 0.10,  0.78),
  new V3( 2.18, 0.13,  0.30),
  new V3( 2.18, 0.13, -0.30),
  new V3( 1.95, 0.10, -0.78),
  new V3( 1.55, 0.12, -0.92),
], matMain));

/* Headlight slits */
for (let side of [-1, 1]){
  const z = side;
  car.add(loop([
    new V3( 1.92, 0.62, z*0.48),
    new V3( 1.92, 0.62, z*0.78),
    new V3( 1.96, 0.58, z*0.80),
    new V3( 1.96, 0.58, z*0.46),
  ], matMain));
}

/* Hood vents (two slim trapezoids) */
for (let side of [-1, 1]){
  const z = side;
  car.add(loop([
    new V3( 1.15, 0.76, z*0.18),
    new V3( 1.15, 0.76, z*0.42),
    new V3( 0.85, 0.78, z*0.40),
    new V3( 0.85, 0.78, z*0.20),
  ], matSoft));
}

/* Side air intakes (carved into rear fender — the supercar hallmark) */
for (let side of [-1, 1]){
  const z = side * 0.985;
  // outline
  car.add(loop([
    new V3(-0.20, 0.42, z),
    new V3(-1.00, 0.42, z),
    new V3(-1.05, 0.78, z),
    new V3(-0.30, 0.82, z),
  ], matMain));
  // inner darker outline
  car.add(loop([
    new V3(-0.28, 0.48, z*0.95),
    new V3(-0.95, 0.48, z*0.95),
    new V3(-0.98, 0.72, z*0.95),
    new V3(-0.36, 0.74, z*0.95),
  ], matMid));
  // splitter blade inside
  car.add(lineFrom([
    new V3(-0.30, 0.60, z*0.95),
    new V3(-0.95, 0.60, z*0.95),
  ], matSoft));
}

/* Engine cover vents — louvers */
for (let i = 0; i < 5; i++){
  const x = -0.85 - i * 0.18;
  car.add(lineFrom([
    new V3(x, 0.96, -0.55),
    new V3(x, 0.96,  0.55),
  ], matSoft));
}

/* Rear wing (two pylons + flat blade) */
const wingY = 1.18;
for (let side of [-1, 1]){
  const z = side * 0.55;
  // pylon
  car.add(loop([
    new V3(-1.80, 0.92, z - 0.02),
    new V3(-1.55, 0.92, z - 0.02),
    new V3(-1.55, wingY, z - 0.02),
    new V3(-1.80, wingY, z - 0.02),
  ], matMain));
  car.add(loop([
    new V3(-1.80, 0.92, z + 0.02),
    new V3(-1.55, 0.92, z + 0.02),
    new V3(-1.55, wingY, z + 0.02),
    new V3(-1.80, wingY, z + 0.02),
  ], matMain));
}
// wing blade — flat airfoil approximated as a thin box outline
car.add(loop([
  new V3(-1.78, wingY,        -0.70),
  new V3(-1.55, wingY,        -0.70),
  new V3(-1.55, wingY,         0.70),
  new V3(-1.78, wingY,         0.70),
], matMain));
car.add(loop([
  new V3(-1.78, wingY - 0.06, -0.70),
  new V3(-1.55, wingY - 0.06, -0.70),
  new V3(-1.55, wingY - 0.06,  0.70),
  new V3(-1.78, wingY - 0.06,  0.70),
], matMain));
// wing endplates
for (let side of [-1, 1]){
  const z = side * 0.70;
  car.add(loop([
    new V3(-1.80, wingY - 0.08, z),
    new V3(-1.50, wingY - 0.08, z),
    new V3(-1.50, wingY + 0.04, z),
    new V3(-1.80, wingY + 0.04, z),
  ], matMain));
}
// vertical struts on the blade
for (let z of [-0.45, 0, 0.45]){
  car.add(lineFrom([
    new V3(-1.66, wingY,        z),
    new V3(-1.66, wingY - 0.06, z),
  ], matMid));
}

/* Rear diffuser fins */
for (let i = 0; i < 5; i++){
  const z = -0.45 + i * 0.225;
  car.add(lineFrom([
    new V3(-1.95, 0.18, z),
    new V3(-2.30, 0.30, z),
  ], matMain));
}

/* Twin exhaust outlets */
for (let side of [-1, 1]){
  for (let dz of [-0.06, 0.06]){
    const z = side * 0.32 + dz * (side > 0 ? 1 : -1);
    car.add(loop([
      new V3(-2.18, 0.46, z - 0.04),
      new V3(-2.18, 0.46, z + 0.04),
      new V3(-2.30, 0.50, z + 0.04),
      new V3(-2.30, 0.50, z - 0.04),
    ], matMain));
  }
}

/* Taillight strip — one continuous bar */
car.add(loop([
  new V3(-2.20, 0.65, -0.55),
  new V3(-2.20, 0.65,  0.55),
  new V3(-2.20, 0.72,  0.55),
  new V3(-2.20, 0.72, -0.55),
], matMain));
car.add(lineFrom([new V3(-2.205, 0.685, -0.55), new V3(-2.205, 0.685, 0.55)], matMid));

/* Mirrors on stalks */
for (let side of [-1, 1]){
  const z = side * 1.05;
  // stalk
  car.add(lineFrom([new V3(0.55, 0.80, side*0.95), new V3(0.45, 0.92, z)], matMid));
  // pod
  car.add(loop([
    new V3(0.32, 0.88, z),
    new V3(0.55, 0.88, z),
    new V3(0.58, 0.98, z),
    new V3(0.35, 0.98, z),
  ], matMain));
}

/* Cockpit hints — two bucket seats */
for (let side of [-1, 1]){
  const z = side * 0.34;
  // base
  car.add(loop([
    new V3( 0.30, 0.62, z - 0.18),
    new V3( 0.30, 0.62, z + 0.18),
    new V3(-0.20, 0.62, z + 0.18),
    new V3(-0.20, 0.62, z - 0.18),
  ], matSoft));
  // backrest top edge
  car.add(lineFrom([
    new V3(-0.25, 0.96, z - 0.16),
    new V3(-0.25, 0.96, z + 0.16),
  ], matSoft));
  // back uprights
  car.add(lineFrom([new V3(-0.20, 0.62, z - 0.16), new V3(-0.25, 0.96, z - 0.16)], matSoft));
  car.add(lineFrom([new V3(-0.20, 0.62, z + 0.16), new V3(-0.25, 0.96, z + 0.16)], matSoft));
}

/* Steering wheel suggestion */
{
  const geo = new THREE.TorusGeometry(0.12, 0.012, 6, 22);
  const edges = new THREE.EdgesGeometry(geo);
  const tor = new THREE.LineSegments(edges, matSoft);
  tor.position.set(0.45, 0.86, 0.34);
  tor.rotation.y = Math.PI / 2;
  tor.rotation.x = -0.45;
  car.add(tor);
}

/* ───────── Wheels (do NOT spin in place) ───────── */
function makeWheel(x, z){
  const g = new THREE.Group();
  const R = 0.42;

  // Tire outer cylinder edges
  const tire = new THREE.CylinderGeometry(R, R, 0.32, 30, 1, true);
  const tireEdges = new THREE.EdgesGeometry(tire, 1);
  const tl = new THREE.LineSegments(tireEdges, matMain);
  tl.rotation.x = Math.PI / 2;
  g.add(tl);

  // Two side rings (outer & inner faces)
  for (let dz of [-0.16, 0.16]){
    const ring = new THREE.RingGeometry(R - 0.02, R, 30);
    const re = new THREE.EdgesGeometry(ring, 1);
    const r = new THREE.LineSegments(re, matMain);
    r.position.z = dz;
    g.add(r);
  }

  // Inner rim
  for (let dz of [-0.16, 0.16]){
    const ring = new THREE.RingGeometry(0.30, 0.32, 24);
    const re = new THREE.EdgesGeometry(ring, 1);
    const r = new THREE.LineSegments(re, matMain);
    r.position.z = dz;
    g.add(r);
  }

  // Five-spoke wheel face (outer side facing camera at rest = +Z)
  const spokes = new THREE.Group();
  for (let i = 0; i < 5; i++){
    const a = (i / 5) * Math.PI * 2 + Math.PI / 5;
    const p1 = new V3(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0);
    const p2 = new V3(Math.cos(a) * 0.40, Math.sin(a) * 0.40, 0);
    // forked Y-spoke for exotic feel
    const a2 = a + 0.18;
    const a3 = a - 0.18;
    const p3 = new V3(Math.cos(a2) * 0.40, Math.sin(a2) * 0.40, 0);
    const p4 = new V3(Math.cos(a3) * 0.40, Math.sin(a3) * 0.40, 0);
    spokes.add(lineFrom([p1, p2], matMain));
    spokes.add(lineFrom([p2, p3], matMid));
    spokes.add(lineFrom([p2, p4], matMid));
    // outer arc connector
    const arcPts = [];
    for (let k = 0; k <= 6; k++){
      const aa = a3 + (a2 - a3) * (k / 6);
      arcPts.push(new V3(Math.cos(aa) * 0.40, Math.sin(aa) * 0.40, 0));
    }
    spokes.add(lineFrom(arcPts, matSoft));
  }
  spokes.position.z = 0.16;
  g.add(spokes);

  // Brake disc hint (slightly inboard)
  const disc = new THREE.RingGeometry(0.20, 0.30, 28);
  const de = new THREE.EdgesGeometry(disc, 1);
  for (let dz of [-0.13, 0.13]){
    const d = new THREE.LineSegments(de, matSoft);
    d.position.z = dz;
    g.add(d);
  }
  // caliper block
  for (let dz of [-0.13, 0.13]){
    const cal = new THREE.BoxGeometry(0.08, 0.18, 0.04);
    const ce = new THREE.EdgesGeometry(cal);
    const c = new THREE.LineSegments(ce, matMid);
    c.position.set(0.26, 0, dz);
    g.add(c);
  }

  g.position.set(x, R, z);
  return g;
}

const wheelPositions = [
  [ 1.45,  0.86],
  [ 1.45, -0.86],
  [-1.45,  0.86],
  [-1.45, -0.86],
];
const wheels = wheelPositions.map(([x, z]) => {
  const w = makeWheel(x, z);
  car.add(w);
  return w;
});

/* ───────── Text decals (rear plate + door branding) ───────── */
function makeTextDecal(text, w, h, opts = {}){
  const {
    fontSize    = 80,
    fillStyle   = '#cc0000',
    strokeStyle = null,
    strokeWidth = 2,
    border      = null,
    mirror      = false,
    weight      = 700,
    letterSpacing = 0,
    family      = "'Oswald', 'Helvetica Neue', Arial, sans-serif",
  } = opts;
  const c   = document.createElement('canvas');
  const dpr = 4;
  const cw  = 384;
  const ch  = Math.round(cw * h / w);
  c.width   = cw * dpr;
  c.height  = ch * dpr;
  const ctx = c.getContext('2d');

  function draw(){
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    if (border){
      ctx.strokeStyle = border;
      ctx.lineWidth   = 4;
      ctx.strokeRect(4, 4, cw - 8, ch - 8);
    }
    if (mirror){
      ctx.translate(cw, 0);
      ctx.scale(-1, 1);
    }
    ctx.font         = `${weight} ${fontSize}px ${family}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    if (letterSpacing && 'letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`;
    if (strokeStyle){
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth   = strokeWidth;
      ctx.lineJoin    = 'round';
      ctx.miterLimit  = 2;
      ctx.strokeText(text, cw / 2, ch / 2 + 2);
    } else {
      ctx.fillStyle = fillStyle;
      ctx.fillText(text, cw / 2, ch / 2 + 2);
    }
  }
  draw();

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter  = THREE.LinearFilter;
  tex.minFilter  = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 8;

  const geo  = new THREE.PlaneGeometry(w, h);
  const mat  = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.redraw = () => { draw(); tex.needsUpdate = true; };
  return mesh;
}

// 183 license plate on the rear, with a thin red border
const plate183 = makeTextDecal('183', 0.52, 0.18, {
  fontSize: 130,
  fillStyle: '#ff3030',
  border:    '#cc0000',
});
plate183.position.set(-2.235, 0.50, 0);
plate183.rotation.y = -Math.PI / 2;
car.add(plate183);

// "AUTO REPAIR" on the front-facing door — thin stroked text so it reads as wireframe
const doorR = makeTextDecal('AUTO REPAIR', 1.00, 0.18, {
  fontSize: 60,
  weight: 400,
  strokeStyle: '#cc0000',
  strokeWidth: 1.6,
  letterSpacing: 4,
});
doorR.position.set(0.15, 0.52, 0.985);
car.add(doorR);

// Refresh textures once webfonts have loaded (initial draw may use fallback)
if (document.fonts && document.fonts.ready){
  document.fonts.ready.then(() => {
    [plate183, doorR].forEach(d => d.userData.redraw && d.userData.redraw());
  });
}

/* ───────── Reflection (subtle, faked by mirrored clone) ───────── */
const reflGroup = new THREE.Group();
scene.add(reflGroup);
{
  const clone = car.clone(true);
  clone.traverse(o => {
    if (o.material){
      o.material = o.material.clone();
      o.material.opacity *= 0.15;
      o.material.transparent = true;
    }
  });
  clone.scale.y = -1;
  reflGroup.add(clone);
  reflGroup.userData.clone = clone;
}

/* Ground grid */
{
  const grid = new THREE.GridHelper(22, 22, 0x551111, 0x220707);
  grid.material.transparent = true;
  grid.material.opacity = 0.18;
  grid.position.y = 0.002;
  scene.add(grid);
}

/* ───────── Resize ───────── */
function resize(){
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Pull camera back on mobile so the car fits without clipping
  camera.position.z = w < 700 ? 13.5 : 9.8;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

/* ───────── Scroll → rotation (scoped to .hero only) ───────── */
let targetRotY = 0;
let currentRotY = 0;
let lastT = performance.now();

function updateProgress(){
  if (!heroEl) return;
  // Use document-relative scroll so rotation starts on the first pixel of scroll
  // (avoids a dead zone equal to the sticky-nav height when comparing to rect.top).
  const heroDocBottom = heroEl.offsetTop + heroEl.offsetHeight;
  let p = window.scrollY / Math.max(1, heroDocBottom);
  p = Math.max(0, Math.min(1, p));
  // 180° rotation total
  targetRotY = p * Math.PI;
  if (readout) readout.textContent = String(Math.round(p * 180)).padStart(3, '0');
  if (cueEl)   cueEl.style.opacity = p > 0.03 ? 0 : 1;
}
window.addEventListener('scroll', updateProgress, { passive:true });
updateProgress();

/* ───────── Animate ───────── */
function isHeroVisible(){
  if (!heroEl) return true;
  const r = heroEl.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

function tick(now){
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  // Read latest scroll every frame — guarantees the rotation tracks scroll
  // with zero perceptible delay, even if scroll events are throttled by the browser.
  updateProgress();

  if (isHeroVisible()){
    // 1:1 with scroll — no easing/lag
    car.rotation.y = targetRotY;

    // Subtle scroll-driven sink + faint idle hover
    const progress = targetRotY / Math.PI;       // 0 → 1 across the hero
    const sink     = -progress * 0.5;            // car moves down a little as we scroll
    const hover    = Math.sin(now * 0.0008) * 0.015;
    car.position.y = hover + sink;

    // Mirror clone follows
    const refl = reflGroup.userData.clone;
    refl.rotation.y = targetRotY;
    refl.position.y = -car.position.y;

    renderer.render(scene, camera);
  }

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
