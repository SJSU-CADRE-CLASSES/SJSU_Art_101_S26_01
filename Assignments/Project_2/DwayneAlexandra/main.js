import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4aa8d8);
scene.fog = new THREE.Fog(0x4aa8d8, 200, 500);

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 140, 170);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 40;
controls.maxDistance = 350;
controls.maxPolarAngle = Math.PI / 2.15;

// --- Lighting ---
const sun = new THREE.DirectionalLight(0xfff4d0, 2.8);
sun.position.set(80, 120, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 400;
sun.shadow.camera.left = -150;
sun.shadow.camera.right = 150;
sun.shadow.camera.top = 150;
sun.shadow.camera.bottom = -150;
scene.add(sun);
scene.add(new THREE.AmbientLight(0x88aacc, 0.7));
scene.add(new THREE.HemisphereLight(0x4aa8d8, 0x8b6914, 0.5));

// --- Noise ---
const simplex = new SimplexNoise();
const noise = (x, z, s) => simplex.noise(x * s, z * s);

// --- Island mask (Fortnite-like quad-lobe shape) ---
function islandMask(x, z) {
  const r = Math.sqrt(x * x + z * z);
  const a = Math.atan2(z, x);
  const lobe = 1.0
    + 0.22 * Math.cos(4 * a)
    + 0.08 * Math.cos(8 * a + 0.4)
    + 0.06 * Math.cos(3 * a + 1.0)
    + 0.04 * Math.cos(6 * a + 2.0);
  const maxR = 72 * lobe;
  return Math.pow(Math.max(0, 1.0 - r / maxR), 1.3);
}

// --- River path: S-curve from north to south through center ---
// Returns 0..1 proximity to river (1 = on river)
function riverInfluence(x, z) {
  // Main river: flows roughly N->S with S-curve
  // Segment 1: upper (north) - slight west lean
  // Segment 2: center - curves east
  // Segment 3: lower (south) - curves west again
  const t = (z + 40) / 80; // 0=north, 1=south
  let cx;
  if (t < 0.35) {
    cx = -7 + t * 34;
  } else if (t < 0.65) {
    cx = 5 - (t - 0.35) * 30;
  } else {
    cx = -4 + (t - 0.65) * 16;
  }
  const dist = Math.abs(x - cx);
  const width = 2.0;
  return Math.max(0, 1 - dist / width);
}

// Lake in center-south area
function lakeInfluence(x, z) {
  const lx = 3, lz = 13;
  const d = Math.sqrt((x - lx) ** 2 + ((z - lz) * 1.3) ** 2);
  return Math.max(0, 1 - d / 8);
}

// --- Terrain height ---
function getHeight(x, z) {
  const mask = islandMask(x, z);
  if (mask < 0.005) return -1;

  const n1 = noise(x, z, 0.035) * 14;
  const n2 = noise(x, z, 0.08)  * 5;
  const n3 = noise(x, z, 0.18)  * 2;
  const n4 = noise(x, z, 0.45)  * 0.6;
  let h = (n1 + n2 + n3 + n4) * mask;

  // Cliff boost at edges
  h += Math.pow(Math.max(0, mask), 0.4) * 5;

  // Flatten center (Tilted Towers / Retail Row area)
  const cd = Math.sqrt(x * x + z * z);
  if (cd < 16) h = h * 0.35 + 2.0;

  // Carve river deeper
  const rv = riverInfluence(x, z);
  if (rv > 0) h = h * (1 - rv) - rv * 4.0;

  // Carve lake deeper
  const lv = lakeInfluence(x, z);
  if (lv > 0) h = h * (1 - lv) - lv * 3.0;

  return Math.max(h, -6.0);
}

// --- Build terrain mesh ---
const TSIZE = 180;
const TSEGS = 200;
const terrainGeo = new THREE.PlaneGeometry(TSIZE, TSIZE, TSEGS, TSEGS);
terrainGeo.rotateX(-Math.PI / 2);

const pos = terrainGeo.attributes.position;
const vColors = [];

const cSand   = new THREE.Color(0xd4a96a);
const cGrass  = new THREE.Color(0x5aaa38);
const cGrassD = new THREE.Color(0x3d7a22);
const cRock   = new THREE.Color(0xb05a28);
const cCliff  = new THREE.Color(0x8b3a1a);
const cDirt   = new THREE.Color(0xc8a060);
const cSnow   = new THREE.Color(0xeeeedd);
const cWater  = new THREE.Color(0x3a9ecc);

for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i);
  const z = pos.getZ(i);
  const h = getHeight(x, z);
  pos.setY(i, h);

  const mask = islandMask(x, z);
  const rv = riverInfluence(x, z);
  const lv = lakeInfluence(x, z);

  let col;
  if (mask < 0.01) {
    col = cWater.clone();
  } else if (rv > 0.3 || lv > 0.3) {
    col = cWater.clone().lerp(cSand, 0.15);
  } else if (h < 1.0) {
    col = cSand.clone();
  } else if (h < 2.5) {
    col = cGrass.clone().lerp(cSand, 0.4);
  } else if (h < 6) {
    col = cGrass.clone();
  } else if (h < 10) {
    col = cRock.clone().lerp(cGrass, (h - 6) / 4);
  } else if (h < 14) {
    col = cCliff.clone();
  } else {
    col = cSnow.clone();
  }

  // Edge cliffs: reddish orange
  if (mask > 0.04 && mask < 0.3 && h > 2.5) {
    const t = Math.min(1, (0.3 - mask) / 0.26);
    col = cCliff.clone().lerp(cRock, t * 0.7);
  }

  vColors.push(col.r, col.g, col.b);
}

terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(vColors, 3));
terrainGeo.computeVertexNormals();

const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
terrain.receiveShadow = true;
terrain.castShadow = false;
scene.add(terrain);

// --- Ocean ---
const oceanGeo = new THREE.PlaneGeometry(800, 800, 100, 100);
oceanGeo.rotateX(-Math.PI / 2);
const oceanOrigY = Array.from({ length: oceanGeo.attributes.position.count }, (_, i) => oceanGeo.attributes.position.getY(i));
const oceanMat = new THREE.MeshPhongMaterial({
  color: 0x3a9ecc, emissive: 0x0a2a3a, emissiveIntensity: 0.15,
  transparent: false, shininess: 120,
  specular: new THREE.Color(0x88ccff),
});
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.position.y = -1.2;
scene.add(ocean);

// --- River water surface ---
// Build a flowing water texture via canvas
function makeWaterTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Deep water base
  ctx.fillStyle = '#1a6fa8';
  ctx.fillRect(0, 0, size, size);

  // Ripple lines
  for (let i = 0; i < 18; i++) {
    const y = (i / 18) * size;
    const grad = ctx.createLinearGradient(0, y, size, y + 8);
    grad.addColorStop(0,   'rgba(100,200,255,0.0)');
    grad.addColorStop(0.3, 'rgba(100,200,255,0.25)');
    grad.addColorStop(0.7, 'rgba(100,200,255,0.25)');
    grad.addColorStop(1,   'rgba(100,200,255,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, size, 5);
  }

  // Foam highlights
  for (let i = 0; i < 30; i++) {
    const fx = Math.random() * size;
    const fy = Math.random() * size;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 18 + Math.random() * 20, 2 + Math.random() * 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,240,255,0.18)';
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 4);
  return tex;
}

const riverTex = makeWaterTexture();

function buildRiverMesh() {
  const pts = [];
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const z = -65 + t * 130;
    let cx;
    if (t < 0.35) cx = -7 + t * 34 / 0.35 * 0.35;
    else if (t < 0.65) cx = 5 - (t - 0.35) * 30 / 0.3;
    else cx = -4 + (t - 0.65) * 16 / 0.35;
    pts.push(new THREE.Vector3(cx, 0.15, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const ribbonPts = curve.getPoints(80);
  const geo = new THREE.BufferGeometry();
  const verts = [], uvs = [], indices = [];
  const w = 1.6;

  for (let i = 0; i < ribbonPts.length; i++) {
    const p = ribbonPts[i];
    let tangent;
    if (i < ribbonPts.length - 1) {
      tangent = ribbonPts[i + 1].clone().sub(p).normalize();
    } else {
      tangent = p.clone().sub(ribbonPts[i - 1]).normalize();
    }
    const right = new THREE.Vector3(-tangent.z, 0, tangent.x);
    const l = p.clone().addScaledVector(right, -w);
    const r = p.clone().addScaledVector(right, w);
    verts.push(l.x, 0.15, l.z, r.x, 0.15, r.z);
    // UV: u across width, v along length (this is what we scroll)
    uvs.push(0, i / ribbonPts.length * 4, 1, i / ribbonPts.length * 4);
  }
  for (let i = 0; i < ribbonPts.length - 1; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
    indices.push(a, b, c, b, d, c);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({
    map: riverTex,
    color: 0x44aadd,
    emissive: 0x0a3a5a, emissiveIntensity: 0.25,
    transparent: true, opacity: 0.9, shininess: 180,
    specular: new THREE.Color(0xaaddff),
  });
  return new THREE.Mesh(geo, mat);
}
const riverMesh = buildRiverMesh();
scene.add(riverMesh);

// --- Lake ---
const lakeGeo = new THREE.CircleGeometry(6.5, 32);
lakeGeo.rotateX(-Math.PI / 2);
const lakeMat = new THREE.MeshPhongMaterial({
  color: 0x2288cc, emissive: 0x0a3a5a, emissiveIntensity: 0.3,
  transparent: true, opacity: 0.88, shininess: 160,
  specular: new THREE.Color(0xaaddff),
});
const lake = new THREE.Mesh(lakeGeo, lakeMat);
lake.position.set(3, 0.15, 13);
lake.scale.set(1.2, 1, 1.5);
scene.add(lake);

// --- RNG ---
let seed = 42;
function rand() {
  seed = (seed * 1664525 + 1013904223) & 0xffffffff;
  return (seed >>> 0) / 0xffffffff;
}

// --- Trees ---
function makeTree(scale, type) {
  const g = new THREE.Group();
  const trunkH = (type === 'palm' ? 4 : 1.4) * scale;
  const trunkMat = new THREE.MeshLambertMaterial({ color: type === 'palm' ? 0x8b6914 : 0x6b3a1f });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.2 * scale, trunkH, 6), trunkMat);
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  g.add(trunk);

  if (type === 'palm') {
    const lm = new THREE.MeshLambertMaterial({ color: 0x3a9c1a });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12 * scale, 2.5 * scale, 4), lm);
      leaf.position.set(Math.cos(a) * 0.9 * scale, trunkH, Math.sin(a) * 0.9 * scale);
      leaf.rotation.z = Math.cos(a) * 0.85;
      leaf.rotation.x = Math.sin(a) * 0.85;
      leaf.castShadow = true;
      g.add(leaf);
    }
  } else {
    const lm1 = new THREE.MeshLambertMaterial({ color: 0x2d8a1f });
    const lm2 = new THREE.MeshLambertMaterial({ color: 0x1e6014 });
    [[1.3, 1.9, 1.6], [1.0, 1.6, 2.6], [0.6, 1.3, 3.4]].forEach(([r, h, y], i) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(r * scale, h * scale, 7), i % 2 ? lm2 : lm1);
      m.position.y = y * scale;
      m.castShadow = true;
      g.add(m);
    });
  }
  return g;
}

// Place trees across island
for (let i = 0; i < 350; i++) {
  const a = rand() * Math.PI * 2;
  const r = rand() * 74;
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  const mask = islandMask(x, z);
  if (mask < 0.07) continue;
  const h = getHeight(x, z);
  if (h < 1.2 || h > 15) continue;
  const rv = riverInfluence(x, z);
  const lv = lakeInfluence(x, z);
  if (rv > 0.4 || lv > 0.5) continue;

  const isPalm = h < 3.0 && rand() > 0.45;
  const scale = 0.6 + rand() * 0.8;
  const tree = makeTree(scale, isPalm ? 'palm' : 'pine');
  tree.position.set(x, h, z);
  scene.add(tree);
}

// --- Buildings ---
// Shared window material (dark glass-like)
const glassMat = new THREE.MeshPhongMaterial({ color: 0x223344, emissive: 0x112233, emissiveIntensity: 0.4, shininess: 120 });
const concreteMat = new THREE.MeshPhongMaterial({ color: 0x999999, shininess: 20 });

function makeBuilding(x, z, w, d, h, wallColor) {
  const bh = getHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, bh, z);

  // Base podium
  const podH = h * 0.18;
  const pod = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.15, podH, d * 1.15),
    new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 10 })
  );
  pod.position.y = podH / 2;
  pod.castShadow = true; pod.receiveShadow = true;
  g.add(pod);

  // Main body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshPhongMaterial({ color: wallColor, shininess: 30 })
  );
  body.position.y = h / 2 + podH;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  // Window grid on each face
  const winRows = Math.max(2, Math.floor(h / 1.8));
  const winCols = Math.max(2, Math.floor(w / 1.2));
  const winW = w * 0.55 / winCols;
  const winH = h * 0.55 / winRows;
  for (let row = 0; row < winRows; row++) {
    for (let col = 0; col < winCols; col++) {
      const wx = -w / 2 + (col + 0.5) * (w / winCols);
      const wy = podH + (row + 0.5) * (h / winRows);
      // Front face
      const wf = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), glassMat);
      wf.position.set(wx, wy, d / 2 + 0.02);
      g.add(wf);
      // Back face
      const wb = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), glassMat);
      wb.position.set(wx, wy, -d / 2 - 0.02);
      wb.rotation.y = Math.PI;
      g.add(wb);
    }
  }
  const winRowsD = Math.max(2, Math.floor(h / 1.8));
  const winColsD = Math.max(2, Math.floor(d / 1.2));
  const winWD = d * 0.55 / winColsD;
  for (let row = 0; row < winRowsD; row++) {
    for (let col = 0; col < winColsD; col++) {
      const wz = -d / 2 + (col + 0.5) * (d / winColsD);
      const wy = podH + (row + 0.5) * (h / winRowsD);
      const wl = new THREE.Mesh(new THREE.PlaneGeometry(winWD, winH), glassMat);
      wl.position.set(-w / 2 - 0.02, wy, wz);
      wl.rotation.y = -Math.PI / 2;
      g.add(wl);
      const wr = new THREE.Mesh(new THREE.PlaneGeometry(winWD, winH), glassMat);
      wr.position.set(w / 2 + 0.02, wy, wz);
      wr.rotation.y = Math.PI / 2;
      g.add(wr);
    }
  }

  // Rooftop parapet
  const parapet = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.3, 0.4, d + 0.3),
    new THREE.MeshPhongMaterial({ color: 0x666666, shininess: 5 })
  );
  parapet.position.y = h + podH + 0.2;
  g.add(parapet);

  // Rooftop AC units / details
  for (let i = 0; i < 2; i++) {
    const ac = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.25, 0.5, d * 0.25),
      concreteMat
    );
    ac.position.set((i - 0.5) * w * 0.4, h + podH + 0.65, (rand() - 0.5) * d * 0.4);
    g.add(ac);
  }

  scene.add(g);
}

function makeTower(x, z, floors, color) {
  const bh = getHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, bh, z);

  const w = 2.2 + rand() * 1.2;
  const d = 2.2 + rand() * 1.2;
  const fh = 1.6;
  const totalH = floors * fh;

  // Base podium
  const podH = fh * 1.2;
  const pod = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.3, podH, d * 1.3),
    new THREE.MeshPhongMaterial({ color: 0x777777, shininess: 10 })
  );
  pod.position.y = podH / 2;
  pod.castShadow = true; pod.receiveShadow = true;
  g.add(pod);

  // Tower body — slight taper
  for (let f = 0; f < floors; f++) {
    const taper = 1 - f * 0.008;
    const fw = w * taper, fd = d * taper;
    const isGlass = f % 3 !== 0;
    const mat = new THREE.MeshPhongMaterial({
      color: isGlass ? 0x334455 : color,
      emissive: isGlass ? 0x112233 : 0x000000,
      emissiveIntensity: isGlass ? 0.3 : 0,
      shininess: isGlass ? 140 : 20,
    });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(fw, fh - 0.08, fd), mat);
    floor.position.y = podH + f * fh + fh / 2;
    floor.castShadow = true; floor.receiveShadow = true;
    g.add(floor);

    // Horizontal band every 3 floors
    if (f % 3 === 0 && f > 0) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(fw + 0.2, 0.18, fd + 0.2),
        new THREE.MeshPhongMaterial({ color: 0x555555 })
      );
      band.position.y = podH + f * fh;
      g.add(band);
    }
  }

  // Rooftop parapet
  const parapet = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.3, 0.5, d + 0.3),
    new THREE.MeshPhongMaterial({ color: 0x555555 })
  );
  parapet.position.y = podH + totalH + 0.25;
  g.add(parapet);

  // Antenna / spire on taller towers
  if (floors >= 7) {
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.15, floors * 0.4, 6),
      new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 60 })
    );
    spire.position.y = podH + totalH + 0.5 + floors * 0.2;
    g.add(spire);

    // Blinking light on top
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2200 })
    );
    light.position.y = podH + totalH + 0.5 + floors * 0.4 + 0.2;
    light.userData.isLight = true;
    g.add(light);
  }

  // Rooftop water tower (random)
  if (rand() > 0.55) {
    const wt = new THREE.Group();
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.9, 8),
      new THREE.MeshPhongMaterial({ color: 0x8b6914, shininess: 10 })
    );
    tank.position.y = 0.45;
    wt.add(tank);
    const legs = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.6, 4),
      new THREE.MeshPhongMaterial({ color: 0x555555 })
    );
    legs.position.y = -0.1;
    wt.add(legs);
    wt.position.set((rand() - 0.5) * w * 0.5, podH + totalH + 0.5, (rand() - 0.5) * d * 0.5);
    g.add(wt);
  }

  scene.add(g);
}

// --- POI definitions (Fortnite Chapter 1 approximate positions) ---
// Map is ~110 units wide, Fortnite map ~7500 units -> scale ~68x
// Positions normalized to our coordinate space

const pois = [
  { name: 'Tilted Towers',    x: -10, z: -8,  type: 'city' },
  { name: 'Retail Row',       x: 30,  z: 16,  type: 'town' },
  { name: 'Pleasant Park',    x: -30, z: -36, type: 'town' },
  { name: 'Salty Springs',    x: 14,  z: 22,  type: 'town' },
  { name: 'Dusty Depot',      x: 20,  z: -13, type: 'depot' },
  { name: 'Greasy Grove',     x: -32, z: 20,  type: 'town' },
  { name: 'Loot Lake',        x: 3,   z: 13,  type: 'lake_poi' },
  { name: 'Tomato Town',      x: 28,  z: -22, type: 'small' },
  { name: 'Wailing Woods',    x: 42,  z: -32, type: 'forest' },
  { name: 'Snobby Shores',    x: -48, z: 4,   type: 'small' },
  { name: 'Fatal Fields',     x: 16,  z: 46,  type: 'farm' },
  { name: 'Moisty Mire',      x: 38,  z: 42,  type: 'swamp' },
  { name: 'Flush Factory',    x: -16, z: 46,  type: 'small' },
  { name: 'Haunted Hills',    x: -36, z: -48, type: 'small' },
  { name: 'Shifty Shafts',    x: -18, z: 10,  type: 'mine' },
  { name: 'Lucky Landing',    x: 14,  z: 56,  type: 'small' },
];

const wallColors = [0xd4c4a8, 0xc8d8e8, 0xb8c8d8, 0xe8e0d0, 0xc0c8b8, 0xd0d8c0, 0xe0e8d8, 0xa8b8c8];

pois.forEach(poi => {
  const { x, z, type } = poi;
  const mask = islandMask(x, z);
  if (mask < 0.05) return;

  if (type === 'city') {
    for (let i = 0; i < 18; i++) {
      const bx = x + (rand() - 0.5) * 18;
      const bz = z + (rand() - 0.5) * 18;
      const floors = 5 + Math.floor(rand() * 8);
      makeTower(bx, bz, floors, wallColors[Math.floor(rand() * wallColors.length)]);
    }
    makeTower(x, z, 14, 0xeeeeff);
  } else if (type === 'town') {
    for (let i = 0; i < 10; i++) {
      const bx = x + (rand() - 0.5) * 18;
      const bz = z + (rand() - 0.5) * 18;
      const w = 2 + rand() * 2.5;
      const d = 2 + rand() * 2.5;
      const h = 4 + rand() * 8;
      makeBuilding(bx, bz, w, d, h, wallColors[Math.floor(rand() * wallColors.length)]);
    }
    makeTower(x, z, 5 + Math.floor(rand() * 4), wallColors[Math.floor(rand() * wallColors.length)]);
  } else {
    for (let i = 0; i < 6; i++) {
      const bx = x + (rand() - 0.5) * 12;
      const bz = z + (rand() - 0.5) * 12;
      const w = 2 + rand() * 2;
      const d = 2 + rand() * 2;
      const h = 3 + rand() * 6;
      makeBuilding(bx, bz, w, d, h, wallColors[Math.floor(rand() * wallColors.length)]);
    }
  }
});

// --- Roads (flat dark strips) ---
function makeRoad(points, width = 1.2) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => {
      const h = getHeight(x, z);
      return new THREE.Vector3(x, h + 0.08, z);
    })
  );
  const pts = curve.getPoints(100);
  const verts = [], uvs = [], indices = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    let tangent;
    if (i < pts.length - 1) tangent = pts[i + 1].clone().sub(p).normalize();
    else tangent = p.clone().sub(pts[i - 1]).normalize();
    const right = new THREE.Vector3(-tangent.z, 0, tangent.x);
    const l = p.clone().addScaledVector(right, -width);
    const r = p.clone().addScaledVector(right, width);
    verts.push(l.x, l.y, l.z, r.x, r.y, r.z);
    uvs.push(0, i / pts.length, 1, i / pts.length);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
    indices.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x555555 }));
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// Road network connecting POIs
makeRoad([[-10,-8],[14,22],[16,46]]);
makeRoad([[-10,-8],[-30,-36],[-36,-48]]);
makeRoad([[-10,-8],[20,-13],[28,-22],[42,-32]]);
makeRoad([[30,16],[28,-22]]);
makeRoad([[30,16],[38,42]]);
makeRoad([[-32,20],[-16,46]]);
makeRoad([[-32,20],[-48,4]]);
makeRoad([[-10,-8],[-18,10],[-32,20]]);
makeRoad([[14,22],[30,16]]);
makeRoad([[14,56],[16,46]]);

// ============================================================
// --- GLORP SIGNALS ---
// ============================================================
// Three zones: green (west), yellow (center), red (east)
const signalOrbs = [];

function makeOrb(x, z, color, emissive) {
  const h = getHeight(x, z);
  if (h < 1.0) return;

  // Core bright sphere
  const geo = new THREE.SphereGeometry(1.6, 14, 14);
  const mat = new THREE.MeshPhongMaterial({
    color: 0xffffff, emissive, emissiveIntensity: 4.0,
    transparent: true, opacity: 0, shininess: 200,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, h + 2.5, z);
  mesh.visible = false;
  scene.add(mesh);

  // Outer glow shell (backside bigger sphere)
  const glowGeo = new THREE.SphereGeometry(2.8, 14, 14);
  const glowMat = new THREE.MeshBasicMaterial({ color: emissive, transparent: true, opacity: 0, side: THREE.BackSide });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(x, h + 2.5, z);
  glow.visible = false;
  scene.add(glow);

  // Ground ring
  const ringGeo = new THREE.RingGeometry(2.2, 3.8, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: emissive, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, h + 0.3, z);
  ring.visible = false;
  scene.add(ring);

  const spawnT = orbRand();
  signalOrbs.push({ mesh, glow, glowMat, ring, mat, ringMat, baseY: h + 2.5, phase: orbRand() * Math.PI * 2, spawnT, zone: null });
}


// Seed separately so orbs are deterministic
let orbSeed = 999;
function orbRand() {
  orbSeed = (orbSeed * 1664525 + 1013904223) & 0xffffffff;
  return (orbSeed >>> 0) / 0xffffffff;
}

// Green zone: west side
const greenMessages = [
  'Calm movement detected. Glorp gliding west on hoverboard.',
  'Skin tone: steady green. No distress. Routine patrol.',
  'Signal logged 14 months ago. First week of arrival.',
  'Glorp paused here for 4 hours. Observing the neighborhood.',
  'Low urgency. Possibly scouting residential zones.',
];
for (let i = 0; i < 55; i++) {
  const x = -50 + orbRand() * 45;
  const z = -30 + orbRand() * 60;
  if (islandMask(x, z) > 0.1) {
    makeOrb(x, z, 0x88ff88, 0x00ff44);
    signalOrbs[signalOrbs.length - 1].zone = 'green';
    signalOrbs[signalOrbs.length - 1].msg = greenMessages[Math.floor(orbRand() * greenMessages.length)];
  }
}
// Yellow zone: center
const yellowMessages = [
  'Agitation rising. Skin flickering yellow-orange rapidly.',
  'Glorp gathered here in a group of 6. Unusual clustering.',
  'Signal intensity doubled over 3 days. Pattern repeating.',
  'Liaison Officer noted: Glorp pointed upward repeatedly.',
  'Color shift logged: green → yellow in under 2 minutes.',
];
for (let i = 0; i < 55; i++) {
  const x = -15 + orbRand() * 30;
  const z = -20 + orbRand() * 50;
  if (islandMask(x, z) > 0.1) {
    makeOrb(x, z, 0xffff88, 0xffdd00);
    signalOrbs[signalOrbs.length - 1].zone = 'yellow';
    signalOrbs[signalOrbs.length - 1].msg = yellowMessages[Math.floor(orbRand() * yellowMessages.length)];
  }
}
// Red zone: east side
const redMessages = [
  'CRITICAL. Glorp skin pulsing deep red. Maximum distress.',
  'Signal repeating every 40 seconds. No human response.',
  'Three Glorp collapsed here. Revived. Still signaling.',
  'Liaison translation attempt failed. Message unknown.',
  'This signal has been active for 6 days straight. Unread.',
];
for (let i = 0; i < 55; i++) {
  const x = 10 + orbRand() * 45;
  const z = -30 + orbRand() * 60;
  if (islandMask(x, z) > 0.1) {
    makeOrb(x, z, 0xff8888, 0xff2200);
    signalOrbs[signalOrbs.length - 1].zone = 'red';
    signalOrbs[signalOrbs.length - 1].msg = redMessages[Math.floor(orbRand() * redMessages.length)];
  }
}

// ============================================================
// --- SIGNAL WAVE RIBBONS (flowing S-curves over island) ---
// ============================================================
function makeSignalWave(color, zOffset, xAmp) {
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const x = Math.sin(t * Math.PI * 2) * xAmp;
    const z = -70 + t * 140 + zOffset;
    const h = getHeight(x, z);
    pts.push(new THREE.Vector3(x, Math.max(h, 0) + 1.5, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const ribbonPts = curve.getPoints(120);
  const verts = [], uvs = [], indices = [];
  const w = 4;
  for (let i = 0; i < ribbonPts.length; i++) {
    const p = ribbonPts[i];
    const tangent = i < ribbonPts.length - 1
      ? ribbonPts[i + 1].clone().sub(p).normalize()
      : p.clone().sub(ribbonPts[i - 1]).normalize();
    const right = new THREE.Vector3(-tangent.z, 0, tangent.x);
    const l = p.clone().addScaledVector(right, -w);
    const r = p.clone().addScaledVector(right, w);
    verts.push(l.x, l.y, l.z, r.x, r.y, r.z);
    uvs.push(0, i / ribbonPts.length, 1, i / ribbonPts.length);
  }
  for (let i = 0; i < ribbonPts.length - 1; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
    indices.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return mat;
}

const waveMats = [
  makeSignalWave(0x00ff44, 0, 38),
  makeSignalWave(0xffdd00, 5, 20),
  makeSignalWave(0xff2222, 10, 50),
];

// ============================================================
// --- HOVERBOARD ROUTES (glowing neon lines) ---
// ============================================================
function makeHoverRoute(points, color) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, getHeight(x, z) + 2.5, z))
  );
  const pts = curve.getPoints(120);
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
  scene.add(new THREE.Line(geo, mat));

  // Arrow heads every N points
  for (let i = 20; i < pts.length - 5; i += 25) {
    const dir = pts[i + 1].clone().sub(pts[i]).normalize();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 2, 6),
      new THREE.MeshBasicMaterial({ color })
    );
    cone.position.copy(pts[i]);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    scene.add(cone);
  }
}

makeHoverRoute([[-48,4],[-32,20],[-13,10],[-3,-8],[16,-13],[42,-32]], 0x00ffcc);
makeHoverRoute([[-3,-8],[6,22],[10,46],[6,56]], 0x00ffcc);
makeHoverRoute([[30,16],[38,42]], 0x00ffcc);

// ============================================================
// --- GLORP CHARACTERS ON HOVERBOARDS ---
// ============================================================

// Shared route splines (same waypoints as hoverboard lines)
const glorpRoutes = [
  [[-48,4],[-32,20],[-13,10],[-3,-8],[16,-13],[42,-32]],
  [[-3,-8],[6,22],[10,46],[6,56]],
  [[30,16],[38,42]],
  [[-40,-20],[-20,-30],[0,-20],[20,-10]],   // extra patrol routes
  [[10,10],[30,30],[20,50]],
];

function makeGlorpSpline(waypoints) {
  return new THREE.CatmullRomCurve3(
    waypoints.map(([x, z]) => new THREE.Vector3(x, getHeight(x, z) + 3.2, z)),
    false, 'catmullrom', 0.5
  );
}

function makeGlorp(tintColor) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshPhongMaterial({
    color: tintColor, emissive: new THREE.Color(tintColor).multiplyScalar(0.3),
    shininess: 90, specular: new THREE.Color(0x88eeff),
  });
  // Darker underside mat for depth
  const shadowMat = new THREE.MeshPhongMaterial({
    color: new THREE.Color(tintColor).multiplyScalar(0.55),
    emissive: 0x001122, shininess: 40,
  });

  // ── MAIN BODY: tall teardrop blob ──
  // Lower body — wide base, tapers up
  const lowerGeo = new THREE.SphereGeometry(1.05, 28, 28);
  const lower = new THREE.Mesh(lowerGeo, bodyMat);
  lower.scale.set(1.0, 0.82, 0.92);
  lower.position.y = 1.05;
  group.add(lower);

  // Upper torso — slightly narrower, merges into head
  const torsoGeo = new THREE.SphereGeometry(0.88, 28, 28);
  const torso = new THREE.Mesh(torsoGeo, bodyMat);
  torso.scale.set(0.92, 1.1, 0.88);
  torso.position.y = 1.95;
  group.add(torso);

  // Head — rounded top, wider than torso, slight forward lean
  const headGeo = new THREE.SphereGeometry(0.9, 28, 28);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.scale.set(1.05, 1.0, 0.95);
  head.position.set(0.05, 2.82, 0.08);
  group.add(head);

  // Crown bump — top of head is slightly raised
  const crownGeo = new THREE.SphereGeometry(0.55, 20, 20);
  const crown = new THREE.Mesh(crownGeo, bodyMat);
  crown.scale.set(0.9, 0.7, 0.85);
  crown.position.set(-0.05, 3.52, -0.05);
  group.add(crown);

  // Chin/jaw bulge — lower face protrudes slightly
  const chinGeo = new THREE.SphereGeometry(0.52, 18, 18);
  const chin = new THREE.Mesh(chinGeo, bodyMat);
  chin.scale.set(1.1, 0.65, 1.15);
  chin.position.set(0.05, 2.18, 0.52);
  group.add(chin);

  // Cheek puff — right side (from viewer: left side of face)
  const cheekGeo = new THREE.SphereGeometry(0.42, 16, 16);
  const cheek = new THREE.Mesh(cheekGeo, bodyMat);
  cheek.scale.set(1.0, 0.8, 0.9);
  cheek.position.set(-0.55, 2.55, 0.55);
  group.add(cheek);

  // ── EYE SOCKET RIDGE — raised bump around eye ──
  const socketGeo = new THREE.TorusGeometry(0.38, 0.12, 12, 28);
  const socket = new THREE.Mesh(socketGeo, bodyMat);
  socket.rotation.y = Math.PI * 0.08;
  socket.position.set(0.28, 2.72, 0.72);
  group.add(socket);

  // ── EYE ──
  // Sclera (white) — large, slightly protruding
  const scleraGeo = new THREE.SphereGeometry(0.38, 20, 20);
  const scleraMat = new THREE.MeshPhongMaterial({ color: 0xfaf5f0, shininess: 180, specular: 0xffffff });
  const sclera = new THREE.Mesh(scleraGeo, scleraMat);
  sclera.position.set(0.28, 2.72, 0.82);
  group.add(sclera);

  // Iris — deep red with slight glow
  const irisGeo = new THREE.SphereGeometry(0.22, 18, 18);
  const irisMat = new THREE.MeshPhongMaterial({
    color: 0xbb1100, emissive: 0x550000, shininess: 220, specular: 0xff4422,
  });
  const iris = new THREE.Mesh(irisGeo, irisMat);
  iris.position.set(0.28, 2.72, 1.0);
  group.add(iris);

  // Pupil — deep black
  const pupilGeo = new THREE.SphereGeometry(0.11, 14, 14);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
  const pupil = new THREE.Mesh(pupilGeo, pupilMat);
  pupil.position.set(0.28, 2.72, 1.12);
  group.add(pupil);

  // Eye highlight — tiny white specular dot
  const hilightGeo = new THREE.SphereGeometry(0.045, 8, 8);
  const hilightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const hilight = new THREE.Mesh(hilightGeo, hilightMat);
  hilight.position.set(0.38, 2.82, 1.14);
  group.add(hilight);

  // ── MOUTH ──
  // Mouth cavity — dark recessed ellipse
  const mouthGeo = new THREE.SphereGeometry(0.42, 20, 14);
  const mouthMat = new THREE.MeshPhongMaterial({ color: 0x020d0d, emissive: 0x000000, shininess: 10 });
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  mouth.scale.set(1.15, 0.55, 0.6);
  mouth.position.set(-0.08, 2.28, 0.72);
  group.add(mouth);

  // Upper lip ridge
  const ulipGeo = new THREE.SphereGeometry(0.44, 18, 10);
  const ulip = new THREE.Mesh(ulipGeo, bodyMat);
  ulip.scale.set(1.1, 0.28, 0.55);
  ulip.position.set(-0.06, 2.52, 0.72);
  group.add(ulip);

  // Lower lip / chin fold
  const llipGeo = new THREE.SphereGeometry(0.4, 18, 10);
  const llip = new THREE.Mesh(llipGeo, bodyMat);
  llip.scale.set(1.05, 0.22, 0.5);
  llip.position.set(-0.04, 2.08, 0.72);
  group.add(llip);

  // Tongue — dark blue-purple blob inside mouth
  const tongueGeo = new THREE.SphereGeometry(0.22, 14, 10);
  const tongueMat = new THREE.MeshPhongMaterial({ color: 0x2233aa, emissive: 0x111155, shininess: 60 });
  const tongue = new THREE.Mesh(tongueGeo, tongueMat);
  tongue.scale.set(1.1, 0.5, 0.8);
  tongue.position.set(-0.05, 2.2, 0.68);
  group.add(tongue);

  // ── SKIN TEXTURE BUMPS — scattered small bumps like the photo ──
  const bumpPositions = [
    [0.6, 1.2, 0.7], [-0.7, 1.5, 0.5], [0.3, 1.0, 0.9],
    [-0.4, 2.0, 0.7], [0.7, 2.3, 0.4], [-0.6, 2.6, 0.3],
    [0.1, 1.6, -0.8], [-0.5, 1.1, -0.6], [0.5, 3.1, 0.2],
    [-0.3, 3.2, 0.4], [0.6, 2.8, -0.2],
  ];
  bumpPositions.forEach(([bx, by, bz]) => {
    const bump = new THREE.Mesh(
      new THREE.SphereGeometry(0.09 + Math.random() * 0.06, 8, 8),
      bodyMat
    );
    bump.position.set(bx, by, bz);
    group.add(bump);
  });

  // ── HOVERBOARD ──
  // Main deck — sleek flat shape
  const deckGeo = new THREE.BoxGeometry(2.0, 0.16, 0.85);
  const deckMat = new THREE.MeshPhongMaterial({
    color: 0x0a1520, emissive: 0x003344, shininess: 220, specular: 0x00ffcc,
  });
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.y = 0.08;
  group.add(deck);

  // Deck top surface stripe
  const stripeGeo = new THREE.BoxGeometry(1.7, 0.02, 0.3);
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.6 });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.set(0, 0.17, 0);
  group.add(stripe);

  // Thruster pods — 2 at rear, 2 at front
  [[-0.7, -0.38], [0.7, -0.38], [-0.6, 0.38], [0.6, 0.38]].forEach(([px, pz]) => {
    const podGeo = new THREE.CylinderGeometry(0.13, 0.16, 0.22, 10);
    const podMat = new THREE.MeshPhongMaterial({ color: 0x223344, emissive: 0x00aacc, emissiveIntensity: 0.8, shininess: 160 });
    const pod = new THREE.Mesh(podGeo, podMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(px, -0.04, pz);
    group.add(pod);
  });

  // Underlight glow plane
  const glowGeo = new THREE.PlaneGeometry(1.8, 0.75);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x00ffcc, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.rotation.x = Math.PI / 2;
  glow.position.y = -0.12;
  group.add(glow);

  group.scale.setScalar(1.5);
  scene.add(group);
  return { group, bodyMat, glowMat };
}

// ── HOVERBOARD (shared, added to each Glorp group) ──
function makeHoverboard(parent) {
  const deckMat = new THREE.MeshPhongMaterial({
    color: 0x0a1520, emissive: 0x003344, shininess: 220, specular: new THREE.Color(0x00ffcc),
  });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.9), deckMat);
  deck.position.y = 0.08;
  parent.add(deck);

  const stripeMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.65 });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.02, 0.32), stripeMat);
  stripe.position.set(0, 0.17, 0);
  parent.add(stripe);

  [[-0.75, -0.4], [0.75, -0.4], [-0.65, 0.4], [0.65, 0.4]].forEach(([px, pz]) => {
    const pod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.16, 0.22, 10),
      new THREE.MeshPhongMaterial({ color: 0x223344, emissive: 0x00aacc, emissiveIntensity: 0.9, shininess: 160 })
    );
    pod.rotation.x = Math.PI / 2;
    pod.position.set(px, -0.04, pz);
    parent.add(pod);
  });

  const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.8), glowMat);
  glow.rotation.x = Math.PI / 2;
  glow.position.y = -0.14;
  parent.add(glow);
  return glowMat;
}

// Create Glorp riders — load GLB model, fall back to procedural if not found
const glorpRiders = [];
const gltfLoader = new GLTFLoader();

glorpRoutes.forEach((waypoints, i) => {
  const spline = makeGlorpSpline(waypoints);
  const rider = {
    group: null, bodyMat: null, glowMat: null, spline,
    offset: i * 0.17,
    speed: 0.04 + i * 0.008,
    spawnT: 0.05 + i * 0.06,
    mixer: null,
  };
  glorpRiders.push(rider);

  gltfLoader.load(
    'glorp.glb',
    (gltf) => {
      const group = new THREE.Group();
      const model = gltf.scene;

      // Scale and position model to sit on board
      model.scale.setScalar(1.8);
      model.position.y = 0.18;

      // Tint skin color per rider using timeline-reactive material
      const skinColor = new THREE.Color(0x00aadd);
      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          // Clone material so each rider can be tinted independently
          child.material = child.material.clone();
          child.material.color = skinColor.clone();
          child.material.emissive = skinColor.clone().multiplyScalar(0.2);
        }
      });
      rider.bodyMat = { color: skinColor }; // proxy for color updates
      rider._meshes = [];
      model.traverse(c => { if (c.isMesh) rider._meshes.push(c); });

      // Animations
      if (gltf.animations && gltf.animations.length > 0) {
        rider.mixer = new THREE.AnimationMixer(model);
        rider.mixer.clipAction(gltf.animations[0]).play();
      }

      group.add(model);
      rider.glowMat = makeHoverboard(group);
      group.visible = false;
      scene.add(group);
      rider.group = group;
    },
    null,
    () => {
      // GLB not found — fall back to procedural Glorp
      const colors = [0x00cc88, 0x00aaff, 0x44ffaa, 0x00ddcc, 0x22bbff];
      const { group, bodyMat, glowMat } = makeGlorp(colors[i % colors.length]);
      group.visible = false;
      rider.group = group;
      rider.bodyMat = bodyMat;
      rider.glowMat = glowMat;
    }
  );
});

// ============================================================
// --- HUD OVERLAY (Canvas 2D on top of WebGL) ---
// ============================================================
const hud = document.createElement('canvas');
hud.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:10;';
document.body.appendChild(hud);

const hctx = hud.getContext('2d');
let scrubberT = 0;
let isPlaying = false;
const PLAY_SPEED = 0.0008;

function resizeHUD() {
  hud.width = innerWidth;
  hud.height = innerHeight;
}
resizeHUD();
window.addEventListener('resize', resizeHUD);

// Make scrubber interactive
hud.style.pointerEvents = 'none';
let draggingScrubber = false;

function isOverScrubber(e) {
  const sb = getScrubberRect();
  return e.clientX >= sb.x && e.clientX <= sb.x + sb.w &&
         e.clientY >= sb.y - 10 && e.clientY <= sb.y + sb.h + 10;
}

// Playback button layout — shared between draw and hit-test
const BTN = { x: 10, y: 170, w: 50, h: 80, startY: 186, playY: 210, endY: 234, size: 20 };

function getButtonHit(e) {
  if (e.clientX < BTN.x || e.clientX > BTN.x + BTN.w) return null;
  if (Math.abs(e.clientY - BTN.startY) < BTN.size) return 'start';
  if (Math.abs(e.clientY - BTN.playY)  < BTN.size) return 'playpause';
  if (Math.abs(e.clientY - BTN.endY)   < BTN.size) return 'end';
  return null;
}

window.addEventListener('mousedown', e => {
  const btn = getButtonHit(e);
  if (btn === 'start')     { scrubberT = 0; isPlaying = false; transitionTriggered = false; transitionState.active = false; return; }
  if (btn === 'playpause') { isPlaying = !isPlaying; return; }
  if (btn === 'end')       { scrubberT = 1; isPlaying = false; return; }
  if (isOverScrubber(e)) { draggingScrubber = true; isPlaying = false; }
});
window.addEventListener('mousemove', e => {
  const btn = getButtonHit(e);
  const overScrubber = isOverScrubber(e);
  const overPanel = selectedGlorp && isOverGlorpPanel(e);
  hud.style.pointerEvents = (btn || overScrubber || overPanel) ? 'auto' : 'none';
  hud.style.cursor = (btn || overScrubber || overPanel) ? 'pointer' : 'default';
  if (!draggingScrubber) return;
  const sb = getScrubberRect();
  scrubberT = Math.max(0, Math.min(1, (e.clientX - sb.x) / sb.w));
});
window.addEventListener('mouseup', () => { draggingScrubber = false; });

// --- Orb click popup ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let activePopup = null; // { msg, zone, screenX, screenY }
let selectedGlorp = null; // { rider, frozenU, dialogPage }

// Glorp interaction dialogue lines per phase
const glorpDialogue = {
  0: [ // green / arrival phase
    { label: 'SIGNAL', color: '#44ff88', lines: ['Skin tone: calm green.', 'Glorp is observing the city.', 'No distress detected.'] },
    { label: 'GESTURE', color: '#44ff88', lines: ['Glorp tilts body upward.', 'Pointing toward the sky.', 'Meaning: unknown.'] },
    { label: 'ROUTE LOG', color: '#44ff88', lines: ['Route logged: 2.4km today.', 'Passed this point 3 times.', 'Pattern: exploratory.'] },
  ],
  1: [ // yellow / communication phase
    { label: 'SIGNAL', color: '#ffdd00', lines: ['Skin flickering yellow-orange.', 'Urgency rising. Repeating gesture.', 'Liaisons alerted.'] },
    { label: 'GESTURE', color: '#ffdd00', lines: ['Rapid color pulse: 40bpm.', 'Glorp is trying to show something.', 'Direction: northeast.'] },
    { label: 'ROUTE LOG', color: '#ffdd00', lines: ['Same route for 6 days straight.', 'Clustering near east district.', 'Other Glorp converging here.'] },
  ],
  2: [ // red / critical phase
    { label: 'SIGNAL', color: '#ff3333', lines: ['CRITICAL. Deep red pulse.', 'Maximum distress state.', 'Message still unread by humans.'] },
    { label: 'GESTURE', color: '#ff3333', lines: ['Glorp collapsed. Revived.', 'Still signaling. Will not stop.', 'Has been here 6 days.'] },
    { label: 'ROUTE LOG', color: '#ff3333', lines: ['Route abandoned. Stationary.', 'All nearby Glorp converging.', 'Disaster window: unknown.'] },
  ],
};

window.addEventListener('click', e => {
  // Skip if interacting with HUD controls
  if (getButtonHit(e) || isOverScrubber(e)) return;

  // Check if clicking the Glorp panel dismiss or tab buttons
  if (selectedGlorp && isOverGlorpPanel(e)) {
    handleGlorpPanelClick(e);
    return;
  }

  mouse.x =  (e.clientX / innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  // Check Glorp riders first
  const glorpMeshes = [];
  glorpRiders.forEach((rider, ri) => {
    if (!rider.group || !rider.group.visible) return;
    rider.group.traverse(child => {
      if (child.isMesh) glorpMeshes.push({ mesh: child, riderIndex: ri });
    });
  });
  const glorpHits = raycaster.intersectObjects(glorpMeshes.map(g => g.mesh));
  if (glorpHits.length > 0) {
    const hit = glorpMeshes.find(g => g.mesh === glorpHits[0].object);
    if (hit) {
      const rider = glorpRiders[hit.riderIndex];
      const u = ((clock.getElapsedTime() * rider.speed + rider.offset) % 1 + 1) % 1;
      selectedGlorp = { rider, riderIndex: hit.riderIndex, frozenU: u, dialogPage: 0 };
      activePopup = null;
      return;
    }
  }

  // Deselect Glorp if clicking elsewhere
  if (selectedGlorp) { selectedGlorp = null; return; }

  // Check signal orbs
  const meshes = signalOrbs.filter(o => o.mesh.visible).map(o => o.mesh);
  const hits = raycaster.intersectObjects(meshes);
  if (hits.length > 0) {
    const orb = signalOrbs.find(o => o.mesh === hits[0].object);
    if (orb) {
      activePopup = { msg: orb.msg, zone: orb.zone, screenX: e.clientX, screenY: e.clientY };
    }
  } else {
    activePopup = null;
  }
});

// Panel bounds for hit-testing (set during draw)
const GLORP_PANEL = { x: 0, y: 0, w: 0, h: 0, tabs: [], closeX: 0, closeY: 0, closeR: 0 };

function isOverGlorpPanel(e) {
  return e.clientX >= GLORP_PANEL.x && e.clientX <= GLORP_PANEL.x + GLORP_PANEL.w &&
         e.clientY >= GLORP_PANEL.y && e.clientY <= GLORP_PANEL.y + GLORP_PANEL.h;
}

function handleGlorpPanelClick(e) {
  // Close button
  const dx = e.clientX - GLORP_PANEL.closeX, dy = e.clientY - GLORP_PANEL.closeY;
  if (Math.sqrt(dx*dx+dy*dy) < GLORP_PANEL.closeR + 6) { selectedGlorp = null; return; }
  // Tab buttons
  GLORP_PANEL.tabs.forEach((tab, i) => {
    if (e.clientX >= tab.x && e.clientX <= tab.x + tab.w &&
        e.clientY >= tab.y && e.clientY <= tab.y + tab.h) {
      selectedGlorp.dialogPage = i;
    }
  });
}

function getScrubberRect() {
  const W = hud.width, H = hud.height;
  return { x: W * 0.22, y: H - 58, w: W * 0.56, h: 20 };
}


function drawHUD(t) {
  const W = hud.width, H = hud.height;
  hctx.clearRect(0, 0, W, H);

  const f = (sz, bold) => `${bold?'bold ':''}${sz}px 'Courier New',monospace`;
  const box = (x, y, w, h, a=0.85) => {
    hctx.save();
    hctx.fillStyle = `rgba(6,10,18,${a})`;
    hctx.strokeStyle = 'rgba(100,200,255,0.7)';
    hctx.lineWidth = 2;
    hctx.beginPath(); hctx.roundRect(x,y,w,h,8);
    hctx.fill(); hctx.stroke();
    hctx.restore();
  };

  // ── TITLE BAR ──────────────────────────────────────────
  box(10, 10, W-20, 62, 0.9);
  hctx.font = f(34, true); hctx.fillStyle = '#e8f4ff';
  hctx.fillText('HALVERTON', 26, 56);
  hctx.font = f(17, true); hctx.fillStyle = '#88ccff';
  hctx.textAlign = 'right';
  hctx.fillText('SIGNAL FIELD MAP', W-26, 56);
  hctx.textAlign = 'left';

  // ── TOP-LEFT: ARCHIVE / SIGNAL LOG ─────────────────────
  box(10, 82, 240, 148);
  hctx.font = f(14, true); hctx.fillStyle = '#00ffcc';
  hctx.fillText('ARCHIVE DATA', 24, 106);
  const totalVisible = signalOrbs.filter(o => scrubberT >= o.spawnT).length;
  const barData = Array.from({length:10},(_,i)=>signalOrbs.filter(o=>o.spawnT<=(i+1)/10).length/signalOrbs.length);
  barData.forEach((v,i)=>{
    const bx=24+i*20, bh=v*64, by=202-bh;
    const r=Math.floor(i/9>0.5?255:i/9*2*255), g=Math.floor(i/9<0.5?255:(1-(i/9-0.5)*2)*255);
    hctx.fillStyle=`rgba(${r},${g},40,0.85)`;
    hctx.fillRect(bx,by,16,bh);
    if(Math.abs(scrubberT-(i+0.5)/10)<0.06){hctx.strokeStyle='#fff';hctx.lineWidth=1.5;hctx.strokeRect(bx,by,16,bh);}
  });
  hctx.font=f(13,false); hctx.fillStyle='#88aacc';
  hctx.fillText(`${totalVisible} signals logged`, 24, 220);

  // ── LEFT: PLAYBACK ─────────────────────────────────────
  const BX=10, BY=240, BW=68, BH=118;
  box(BX, BY, BW, BH);
  hctx.font = f(24, false);
  const playIcon = isPlaying ? '⏸' : '▶';
  [['⏮', BY+36],[playIcon, BY+70],['⏭', BY+104]].forEach(([ic,y])=>{
    hctx.fillStyle='#88ccff'; hctx.fillText(ic, BX+12, y);
  });
  BTN.x=BX; BTN.y=BY; BTN.w=BW; BTN.h=BH;
  BTN.startY=BY+36; BTN.playY=BY+70; BTN.endY=BY+104; BTN.size=22;

  // ── BOTTOM-LEFT: LEGEND ────────────────────────────────
  const LX=10, LY=H-280, LW=310, LH=168;
  box(LX, LY, LW, LH);
  hctx.font=f(14,true); hctx.fillStyle='#00ffcc';
  hctx.fillText('GLORP SIGNALS', LX+14, LY+26);
  const items=[
    {c:'#44ff88', label:'GREEN',  sub:'Calm / moving through city'},
    {c:'#ffdd00', label:'YELLOW', sub:'Agitated / signaling urgency'},
    {c:'#ff3333', label:'RED',    sub:'Peak distress / warning critical'},
    {c:'#00ffcc', label:'HOVERBOARD ROUTES', line:true, sub:'Tracked movement paths'},
  ];
  items.forEach((item,i)=>{
    const ly = LY+46+i*30;
    if(item.line){
      hctx.beginPath(); hctx.strokeStyle=item.c; hctx.lineWidth=2;
      hctx.moveTo(LX+14,ly); hctx.lineTo(LX+36,ly); hctx.stroke();
      hctx.beginPath(); hctx.moveTo(LX+34,ly-5); hctx.lineTo(LX+43,ly); hctx.lineTo(LX+34,ly+5); hctx.stroke();
    } else {
      hctx.beginPath(); hctx.arc(LX+22,ly,9,0,Math.PI*2); hctx.fillStyle=item.c; hctx.fill();
    }
    hctx.font=f(14,true); hctx.fillStyle=item.c;
    hctx.fillText(item.label, LX+50, ly+5);
    hctx.font=f(12,false); hctx.fillStyle='#778899';
    hctx.fillText(item.sub, LX+50, ly+20);
  });

  // ── TOP-RIGHT: SIGNAL DENSITY ──────────────────────────
  const RW=300, RX=W-RW-10;
  box(RX, 82, RW, 78);
  hctx.font=f(14,true); hctx.fillStyle='#88ccff';
  hctx.fillText('SIGNAL DENSITY:', RX+14, 106);
  const tX=RX+14, tW=RW-28, tY=116;
  const g=hctx.createLinearGradient(tX,0,tX+tW,0);
  g.addColorStop(0,'#00ff44'); g.addColorStop(0.5,'#ffdd00'); g.addColorStop(1,'#ff2200');
  hctx.fillStyle=g; hctx.fillRect(tX,tY,tW,12);
  hctx.beginPath(); hctx.arc(tX+scrubberT*tW,tY+6,8,0,Math.PI*2);
  hctx.fillStyle='#fff'; hctx.fill();
  hctx.font=f(12,false); hctx.fillStyle='#88aacc';
  hctx.fillText('ARRIVAL',tX,tY+28);
  hctx.textAlign='right'; hctx.fillText('CRITICAL',tX+tW,tY+28); hctx.textAlign='left';

  // ── RIGHT: GLORP PHASE (ALERT LEVEL) ──────────────────
  const phase = scrubberT<0.33?0:scrubberT<0.66?1:2;
  const phaseColor = ['#44ff88','#ffdd00','#ff3333'][phase];
  const phaseLabel = ['ARRIVAL','COMMUNICATION','CRITICAL WARNING'][phase];
  const phaseDesc  = ['Glorp move through Halverton. No contact yet.','Signals intensify. Pattern emerging.','Disaster imminent. Message still unread.'][phase];
  box(RX, 170, RW, 140);
  hctx.font=f(13,true); hctx.fillStyle='#88ccff';
  hctx.fillText('ALERT LEVEL:', RX+14, 192);
  // Auto-fit phaseLabel font so it never overflows the box
  let phaseFontSize = 28;
  hctx.font = f(phaseFontSize, true);
  while (hctx.measureText(phaseLabel).width > RW - 28 && phaseFontSize > 14) {
    phaseFontSize -= 1;
    hctx.font = f(phaseFontSize, true);
  }
  hctx.fillStyle=phaseColor;
  hctx.fillText(phaseLabel, RX+14, 228);
  hctx.font=f(13,false); hctx.fillStyle='#aabbcc';
  // word wrap desc
  const dwords=phaseDesc.split(' '); let dl='', dly=252;
  dwords.forEach(w=>{const tt=dl+w+' '; if(hctx.measureText(tt).width>RW-28&&dl){hctx.fillText(dl.trim(),RX+14,dly);dl=w+' ';dly+=19;}else dl=tt;});
  hctx.fillText(dl.trim(),RX+14,dly);

  // ── BOTTOM-RIGHT: WAVEFORM ─────────────────────────────
  box(RX, H-168, RW, 108);
  hctx.font=f(13,true); hctx.fillStyle='#88ccff';
  hctx.fillText('GLORP PULSE FREQUENCY', RX+14, H-144);
  const chaos=0.5+scrubberT*3.5, midY=H-106;
  hctx.beginPath(); hctx.strokeStyle=phaseColor; hctx.lineWidth=2;
  for(let i=0;i<=140;i++){
    const wx=RX+12+i*((RW-24)/140);
    const wy=midY+Math.sin(i*0.25+t*chaos)*(4+scrubberT*10)+Math.sin(i*0.6+t*chaos*1.4)*(2+scrubberT*6);
    i===0?hctx.moveTo(wx,wy):hctx.lineTo(wx,wy);
  }
  hctx.stroke();
  hctx.font=f(12,false); hctx.fillStyle='#445566';
  hctx.fillText('calm ←──────────────────→ erratic', RX+14, H-72);

  // ── BOTTOM-CENTER: TIME SCRUBBER ───────────────────────
  const sb = getScrubberRect();
  box(sb.x-14, H-102, sb.w+28, 94, 0.9);
  hctx.font=f(13,true); hctx.fillStyle='#88ccff';
  hctx.textAlign='center';
  hctx.fillText('— TIME SCRUBBER —', sb.x+sb.w/2, H-80);
  hctx.textAlign='left';

  // track
  const tg=hctx.createLinearGradient(sb.x,0,sb.x+sb.w,0);
  tg.addColorStop(0,'#0a1a0a'); tg.addColorStop(0.33,'#1a3a10');
  tg.addColorStop(0.66,'#3a3a00'); tg.addColorStop(1,'#3a0a00');
  hctx.fillStyle=tg; hctx.fillRect(sb.x,sb.y,sb.w,sb.h);

  // phase markers
  [[0.33,'COMM.'],[0.66,'WARNING']].forEach(([p,l])=>{
    const mx=sb.x+p*sb.w;
    hctx.beginPath(); hctx.strokeStyle='rgba(255,255,255,0.35)'; hctx.lineWidth=1;
    hctx.moveTo(mx,sb.y); hctx.lineTo(mx,sb.y+sb.h); hctx.stroke();
    hctx.font=f(12,false); hctx.fillStyle='rgba(255,255,255,0.5)';
    hctx.textAlign='center'; hctx.fillText(l,mx,sb.y-5);
  });

  // thumb
  const tx=sb.x+scrubberT*sb.w;
  hctx.fillStyle='#fff'; hctx.fillRect(tx-5,sb.y-5,10,sb.h+10);

  // labels
  hctx.font=f(13,false); hctx.fillStyle='#88aacc';
  hctx.textAlign='left';  hctx.fillText('◄ 2 YEARS AGO', sb.x, H-14);
  hctx.textAlign='right'; hctx.fillText('NOW ►', sb.x+sb.w, H-14);
  hctx.textAlign='left';

  // End-of-timeline nudge — pulse when scrubber is near the end
  if (scrubberT > 0.88) {
    const nudgeA = 0.5 + Math.sin(t * 4) * 0.5;
    hctx.save();
    hctx.font = f(14, true);
    hctx.fillStyle = `rgba(0,255,200,${nudgeA})`;
    hctx.textAlign = 'center';
    hctx.fillText('⏭  DRAG TO END OR CLICK ⏭ TO UNLOCK INTERFACE 2', W/2, H - 114);
    hctx.textAlign = 'left';
    hctx.restore();
  }

  // ── GLORP INTERACTION PANEL ───────────────────────────
  if (selectedGlorp) {
    const phase = scrubberT < 0.33 ? 0 : scrubberT < 0.66 ? 1 : 2;
    const pages = glorpDialogue[phase];
    const page = pages[selectedGlorp.dialogPage];
    const pw = 320, ph = 240;
    const px = Math.min(W - pw - 14, Math.max(14, W / 2 - pw / 2));
    const py = Math.max(76, H / 2 - ph / 2);

    // Store bounds for hit-testing
    GLORP_PANEL.x = px; GLORP_PANEL.y = py; GLORP_PANEL.w = pw; GLORP_PANEL.h = ph;

    // Panel background
    hctx.save();
    hctx.fillStyle = 'rgba(4,8,16,0.96)';
    hctx.strokeStyle = page.color;
    hctx.lineWidth = 2;
    hctx.beginPath(); hctx.roundRect(px, py, pw, ph, 10);
    hctx.fill(); hctx.stroke();

    // Header bar
    hctx.fillStyle = page.color + '22';
    hctx.beginPath(); hctx.roundRect(px, py, pw, 42, [10, 10, 0, 0]);
    hctx.fill();

    // Glorp icon
    hctx.beginPath(); hctx.arc(px + 24, py + 21, 11, 0, Math.PI * 2);
    hctx.fillStyle = page.color; hctx.fill();
    hctx.beginPath(); hctx.arc(px + 27, py + 18, 4, 0, Math.PI * 2);
    hctx.fillStyle = '#fff'; hctx.fill();
    hctx.beginPath(); hctx.arc(px + 28, py + 18, 2, 0, Math.PI * 2);
    hctx.fillStyle = '#880000'; hctx.fill();

    // Title — auto-shrink to fit
    let titleSz = 14;
    const titleStr = `GLORP #${selectedGlorp.riderIndex + 1}  ·  ${page.label}`;
    hctx.font = f(titleSz, true);
    while (hctx.measureText(titleStr).width > pw - 80 && titleSz > 11) { titleSz--; hctx.font = f(titleSz, true); }
    hctx.fillStyle = page.color;
    hctx.fillText(titleStr, px + 44, py + 27);

    // Close button
    const cx = px + pw - 20, cy = py + 21;
    GLORP_PANEL.closeX = cx; GLORP_PANEL.closeY = cy; GLORP_PANEL.closeR = 11;
    hctx.beginPath(); hctx.arc(cx, cy, 11, 0, Math.PI * 2);
    hctx.fillStyle = 'rgba(255,60,60,0.25)'; hctx.fill();
    hctx.strokeStyle = '#ff4444'; hctx.lineWidth = 1.5; hctx.stroke();
    hctx.font = f(14, true); hctx.fillStyle = '#ff6666';
    hctx.textAlign = 'center'; hctx.fillText('✕', cx, cy + 5); hctx.textAlign = 'left';

    // Skin swatch + phase
    const swatchColors = ['#44ff88', '#ffdd00', '#ff3333'];
    const phaseNames = ['CALM', 'AGITATED', 'CRITICAL'];
    hctx.fillStyle = swatchColors[phase];
    hctx.fillRect(px + 14, py + 52, 15, 15);
    hctx.font = f(13, true); hctx.fillStyle = swatchColors[phase];
    hctx.fillText(`SKIN: ${phaseNames[phase]}`, px + 36, py + 64);

    // Signal strength bar
    hctx.font = f(12, false); hctx.fillStyle = '#556677';
    hctx.fillText('SIGNAL STRENGTH', px + 150, py + 64);
    const barW = 110, barX = px + 150, barY = py + 68;
    hctx.fillStyle = '#0a1520'; hctx.fillRect(barX, barY, barW, 8);
    const strength = 0.3 + phase * 0.35;
    const sg = hctx.createLinearGradient(barX, 0, barX + barW, 0);
    sg.addColorStop(0, '#00ff44'); sg.addColorStop(0.5, '#ffdd00'); sg.addColorStop(1, '#ff2200');
    hctx.fillStyle = sg; hctx.fillRect(barX, barY, barW * strength, 8);

    // Divider
    hctx.strokeStyle = page.color + '44'; hctx.lineWidth = 1;
    hctx.beginPath(); hctx.moveTo(px + 14, py + 88); hctx.lineTo(px + pw - 14, py + 88); hctx.stroke();

    // Content lines
    hctx.font = f(14, false); hctx.fillStyle = '#ccdde8';
    page.lines.forEach((line, li) => {
      hctx.fillText(line, px + 14, py + 110 + li * 24);
    });

    // Tab buttons
    GLORP_PANEL.tabs = [];
    pages.forEach((pg, ti) => {
      const tw = 86, tx = px + 14 + ti * (tw + 8), ty = py + ph - 42;
      GLORP_PANEL.tabs.push({ x: tx, y: ty, w: tw, h: 30 });
      const active = ti === selectedGlorp.dialogPage;
      hctx.fillStyle = active ? pg.color + 'cc' : 'rgba(20,35,50,0.9)';
      hctx.strokeStyle = pg.color; hctx.lineWidth = 1.5;
      hctx.beginPath(); hctx.roundRect(tx, ty, tw, 30, 5);
      hctx.fill(); hctx.stroke();
      hctx.font = f(12, true);
      hctx.fillStyle = active ? '#000' : pg.color;
      hctx.textAlign = 'center';
      hctx.fillText(pg.label, tx + tw / 2, ty + 20);
      hctx.textAlign = 'left';
    });

    hctx.font = f(11, false); hctx.fillStyle = '#334455';
    hctx.textAlign = 'center';
    hctx.fillText('click elsewhere to dismiss', px + pw / 2, py + ph - 6);
    hctx.textAlign = 'left';
    hctx.restore();
  }

  // ── ORB POPUP ──────────────────────────────────────────
  if(activePopup){
    const zc=activePopup.zone==='green'?'#44ff88':activePopup.zone==='yellow'?'#ffdd00':'#ff3333';
    const zl=activePopup.zone==='green'?'GREEN SIGNAL':activePopup.zone==='yellow'?'YELLOW SIGNAL':'RED SIGNAL';
    // word-wrap message first to size box
    hctx.font=f(13,false);
    const ws=activePopup.msg.split(' '); const msgLines=[]; let wl='';
    ws.forEach(w=>{const tt=wl+w+' ';if(hctx.measureText(tt).width>240&&wl){msgLines.push(wl.trim());wl=w+' ';}else wl=tt;});
    msgLines.push(wl.trim());
    const pw=280, ph=56+msgLines.length*18;
    let px=activePopup.screenX+18, py=activePopup.screenY-ph/2;
    if(px+pw>W-10) px=activePopup.screenX-pw-18;
    if(py<10) py=10; if(py+ph>H-10) py=H-ph-10;
    hctx.fillStyle='rgba(6,10,18,0.95)'; hctx.strokeStyle=zc; hctx.lineWidth=2;
    hctx.beginPath(); hctx.roundRect(px,py,pw,ph,8); hctx.fill(); hctx.stroke();
    hctx.beginPath(); hctx.arc(px+20,py+24,8,0,Math.PI*2); hctx.fillStyle=zc; hctx.fill();
    hctx.font=f(14,true); hctx.fillStyle=zc; hctx.fillText(zl,px+36,py+28);
    hctx.font=f(13,false); hctx.fillStyle='#ccdde8';
    msgLines.forEach((l,li)=>hctx.fillText(l,px+12,py+50+li*18));
    hctx.font=f(11,false); hctx.fillStyle='#445566';
    hctx.textAlign='right'; hctx.fillText('click to close',px+pw-8,py+ph-6); hctx.textAlign='left';
  }
}

// ============================================================
// --- UFO SHIPS (visible at start of timeline, depart as time passes) ---
// ============================================================
function makeUFO(x, y, z) {
  const group = new THREE.Group();

  // Main saucer hull — flattened ellipsoid via scaled sphere
  const hullGeo = new THREE.SphereGeometry(5, 32, 16);
  const hullMat = new THREE.MeshPhongMaterial({
    color: 0x8899bb, emissive: 0x223344, shininess: 120,
    transparent: true, opacity: 1,
  });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.scale.set(1, 0.28, 1);
  group.add(hull);

  // Dome on top
  const domeGeo = new THREE.SphereGeometry(2.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMat = new THREE.MeshPhongMaterial({
    color: 0x44ffcc, emissive: 0x00ffaa, emissiveIntensity: 1.2,
    transparent: true, opacity: 0.75, shininess: 200,
  });
  group.add(new THREE.Mesh(domeGeo, domeMat));

  // Rim ring of lights
  const rimCount = 10;
  for (let i = 0; i < rimCount; i++) {
    const angle = (i / rimCount) * Math.PI * 2;
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 8, 8),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x00ffcc : 0xffdd00 })
    );
    light.position.set(Math.cos(angle) * 4.6, -0.5, Math.sin(angle) * 4.6);
    group.add(light);
  }

  // Tractor beam cone (pointing down)
  const beamGeo = new THREE.ConeGeometry(3.5, 14, 24, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x00ffcc, transparent: true, opacity: 0.08, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = -8;
  group.add(beam);

  group.position.set(x, y, z);
  scene.add(group);

  return { group, hullMat, domeMat, beamMat, baseX: x, baseY: y, baseZ: z };
}

// Spawn 5 UFOs hovering over different parts of the city
const ufos = [
  makeUFO(-30, 55, -10),
  makeUFO( 20, 60,  15),
  makeUFO(  5, 50, -30),
  makeUFO(-10, 58,  30),
  makeUFO( 38, 52, -5),
];

// ============================================================
// --- METEOR STRIKE ---
// ============================================================
const meteor = {
  active: false, hit: false,
  startT: 0,
  // Meteor mesh + trail particles
  mesh: null, trailParticles: null, trailPositions: null,
  craterRing: null, shockwave: null, fireball: null,
  debrisMeshes: [],
};

function buildMeteor() {
  // Meteor rock
  const geo = new THREE.SphereGeometry(2.2, 10, 10);
  const mat = new THREE.MeshPhongMaterial({ color: 0x884422, emissive: 0xff4400, emissiveIntensity: 1.5 });
  meteor.mesh = new THREE.Mesh(geo, mat);
  meteor.mesh.visible = false;
  scene.add(meteor.mesh);

  // Trail — line of glowing particles
  const trailCount = 60;
  const trailGeo = new THREE.BufferGeometry();
  meteor.trailPositions = new Float32Array(trailCount * 3);
  trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(meteor.trailPositions, 3));
  const trailMat = new THREE.PointsMaterial({ color: 0xff6600, size: 1.8, transparent: true, opacity: 0.7, sizeAttenuation: true });
  meteor.trailParticles = new THREE.Points(trailGeo, trailMat);
  meteor.trailParticles.visible = false;
  scene.add(meteor.trailParticles);

  // Shockwave ring (flat expanding ring on ground)
  const swGeo = new THREE.RingGeometry(0.1, 1, 48);
  swGeo.rotateX(-Math.PI / 2);
  const swMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  meteor.shockwave = new THREE.Mesh(swGeo, swMat);
  meteor.shockwave.position.set(-5, 0.5, -10);
  meteor.shockwave.visible = false;
  scene.add(meteor.shockwave);

  // Fireball (expanding sphere at impact)
  const fbGeo = new THREE.SphereGeometry(1, 16, 16);
  const fbMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.9 });
  meteor.fireball = new THREE.Mesh(fbGeo, fbMat);
  meteor.fireball.position.set(-5, 2, -10);
  meteor.fireball.visible = false;
  scene.add(meteor.fireball);

  // Debris chunks
  for (let i = 0; i < 18; i++) {
    const dGeo = new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 6, 6);
    const dMat = new THREE.MeshPhongMaterial({ color: 0x993300, emissive: 0xff2200, emissiveIntensity: 0.8 });
    const d = new THREE.Mesh(dGeo, dMat);
    d.visible = false;
    const angle = Math.random() * Math.PI * 2;
    const speed = 8 + Math.random() * 18;
    d.userData = {
      vx: Math.cos(angle) * speed, vy: 12 + Math.random() * 20,
      vz: Math.sin(angle) * speed, vy0: 12 + Math.random() * 20,
    };
    scene.add(d);
    meteor.debrisMeshes.push(d);
  }
}
buildMeteor();

function triggerMeteorStrike() {
  meteor.active = true;
  meteor.hit = false;
  meteor.startT = clock.getElapsedTime();
  meteor.mesh.visible = true;
  meteor.trailParticles.visible = true;
  // Start high up, aimed at city center-ish
  meteor.mesh.position.set(60, 280, -80);
}

function animateMeteor(t) {
  if (!meteor.active) return;
  const elapsed = t - meteor.startT;
  const impactT = 2.2;

  if (!meteor.hit) {
    const progress = Math.min(1, elapsed / impactT);
    const ease = progress * progress;
    meteor.mesh.position.set(60 - ease*65, 280 - ease*278, -80 + ease*70);
    meteor.mesh.rotation.x += 0.08;
    meteor.mesh.rotation.z += 0.05;

    const tp = meteor.trailPositions;
    for (let i = (60-1)*3; i >= 3; i -= 3) {
      tp[i]=tp[i-3]; tp[i+1]=tp[i-2]; tp[i+2]=tp[i-1];
    }
    tp[0]=meteor.mesh.position.x; tp[1]=meteor.mesh.position.y; tp[2]=meteor.mesh.position.z;
    meteor.trailParticles.geometry.attributes.position.needsUpdate = true;
    meteor.mesh.material.emissiveIntensity = 1.5 + progress * 4;

    if (progress >= 1) {
      meteor.hit = true;
      meteor.hitT = t;
      meteor.mesh.visible = false;
      meteor.trailParticles.visible = false;
      meteor.shockwave.visible = true;
      meteor.fireball.visible = true;
      meteor.debrisMeshes.forEach(d => { d.visible = true; d.position.set(-5,1,-10); });
      // White flash
      scene.background = new THREE.Color(0xffffff);
      scene.fog.color.set(0xffffff);
      setTimeout(() => { scene.background.set(0x4aa8d8); scene.fog.color.set(0x4aa8d8); }, 120);
      // Create fullscreen explosion canvas
      if (!meteor.explosionCanvas) {
        meteor.explosionCanvas = document.createElement('canvas');
        meteor.explosionCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:50;pointer-events:none;';
        document.body.appendChild(meteor.explosionCanvas);
      }
      meteor.explosionCanvas.width = innerWidth;
      meteor.explosionCanvas.height = innerHeight;
      meteor.explosionCanvas.style.display = 'block';
    }
  } else {
    const postT = t - meteor.hitT;

    // 3D shockwave + fireball
    const swScale = 1 + postT * 28;
    meteor.shockwave.scale.set(swScale, 1, swScale);
    meteor.shockwave.material.opacity = Math.max(0, 0.8 - postT * 0.5);
    const fbScale = 1 + postT * 12;
    meteor.fireball.scale.setScalar(fbScale);
    meteor.fireball.material.opacity = Math.max(0, 0.9 - postT * 0.6);
    meteor.fireball.material.color.setHex(postT < 0.5 ? 0xffffff : postT < 1.2 ? 0xff8800 : 0xff2200);
    meteor.debrisMeshes.forEach(d => {
      if (!d.visible) return;
      d.position.set(-5+d.userData.vx*postT, 1+d.userData.vy*postT-9.8*postT*postT, -10+d.userData.vz*postT);
      d.material.emissiveIntensity = Math.max(0, 1.2 - postT * 0.4);
      if (d.position.y < 0) d.visible = false;
    });

    // Fullscreen explosion overlay
    if (meteor.explosionCanvas) {
      const ec = meteor.explosionCanvas;
      // Keep pixel buffer in sync with window size every frame
      ec.width = innerWidth;
      ec.height = innerHeight;
      const ectx = ec.getContext('2d');
      const W = ec.width, H = ec.height;
      const cx = W / 2, cy = H / 2;
      const diag = Math.sqrt(W*W + H*H);

      // Always start with a black base so nothing bleeds through
      ectx.fillStyle = '#000000';
      ectx.fillRect(0, 0, W, H);

      if (postT < 4.0) {
        // ── FIREBALL (0 → 4s) ──────────────────────────────────────────
        // Starts pure white, transitions to orange/red, fades out
        const p = Math.min(1, postT / 4.0);
        const a = 1 - p * 0.9; // stays very bright for a long time

        // White core flash (strongest at start)
        const whiteA = Math.max(0, 1 - postT / 0.5);
        ectx.fillStyle = `rgba(255,255,255,${whiteA})`;
        ectx.fillRect(0, 0, W, H);

        // Main fireball — full corner-to-corner radial
        const g1 = ectx.createRadialGradient(cx, cy, 0, cx, cy, diag);
        g1.addColorStop(0,    `rgba(255,255,255,${a})`);
        g1.addColorStop(0.05, `rgba(255,240,120,${a})`);
        g1.addColorStop(0.15, `rgba(255,140,0,${a})`);
        g1.addColorStop(0.35, `rgba(220,50,0,${a * 0.95})`);
        g1.addColorStop(0.6,  `rgba(100,15,0,${a * 0.9})`);
        g1.addColorStop(1,    `rgba(20,0,0,${a * 0.85})`);
        ectx.fillStyle = g1;
        ectx.fillRect(0, 0, W, H);

        // Second asymmetric bloom
        const g2 = ectx.createRadialGradient(cx * 0.55, cy * 0.65, 0, cx * 0.55, cy * 0.65, diag * 0.85);
        g2.addColorStop(0,   `rgba(255,200,50,${a * 0.7})`);
        g2.addColorStop(0.25,`rgba(255,80,0,${a * 0.5})`);
        g2.addColorStop(0.6, `rgba(80,10,0,${a * 0.3})`);
        g2.addColorStop(1,   `rgba(0,0,0,0)`);
        ectx.fillStyle = g2;
        ectx.fillRect(0, 0, W, H);

        // ── SMOKE EDGES (2.0 → 4.0s) ───────────────────────────────────
        if (postT > 2.0) {
          const sp = Math.min(1, (postT - 2.0) / 2.0);
          [[0,0],[W,0],[0,H],[W,H]].forEach(([sx,sy]) => {
            const sg = ectx.createRadialGradient(sx, sy, 0, sx, sy, diag * sp * 1.1);
            sg.addColorStop(0,   `rgba(4,2,0,${sp * 0.98})`);
            sg.addColorStop(0.45,`rgba(8,3,0,${sp * 0.75})`);
            sg.addColorStop(1,   `rgba(0,0,0,0)`);
            ectx.fillStyle = sg;
            ectx.fillRect(0, 0, W, H);
          });
        }
      } else {
        // ── FULL BLACK (4s+) ────────────────────────────────────────────
        const p = Math.min(1, (postT - 4.0) / 0.5);
        ectx.fillStyle = `rgba(0,0,0,${p})`;
        ectx.fillRect(0, 0, W, H);
      }

      // Restart at full black
      if (postT > 5.8 && !meteor._restarted) {
        meteor._restarted = true;
        // Full reset
        meteor.active = false;
        meteor.hit = false;
        meteor._restarted = false;
        meteor.shockwave.visible = false;
        meteor.fireball.visible = false;
        meteor.debrisMeshes.forEach(d => d.visible = false);
        meteor.shockwave.scale.set(1,1,1);
        meteor.fireball.scale.setScalar(1);
        scene.fog.near = 200;
        // Reset Interface 1 to start
        scrubberT = 0;
        isPlaying = false;
        transitionTriggered = false;
        transitionState.active = false;
        i3._meteorTriggered = false;
        camera.position.set(0, 140, 170);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        // Fade out explosion canvas
        ec.style.transition = 'opacity 1s';
        ec.style.opacity = '0';
        setTimeout(() => { ec.style.display = 'none'; ec.style.opacity = '1'; ec.style.transition = ''; }, 1000);
      }
    }
  }
}
// ============================================================
// --- TRANSITION + INTERFACE 2 STATE (must be before animate) ---
// ============================================================
const transitionState = { active: false, startT: 0, btnX:0, btnY:0, btnW:0, btnH:0 };
const interface2 = {
  active: false, selectedSite: 0,
  decodeProgress: [0, 0, 0], scrubber: 0.5,
  dragging: false, canvas: null, ctx: null,
};
let transitionTriggered = false;
const userSequences = [
  [null,null,null,null,null,null],
  [null,null,null,null,null,null],
  [null,null,null,null,null,null],
];
let selectedColor = '#44ff88';
let i2HitZones = [];

// i3 state — declared here so animate() can reference it
const i3 = {
  active: false,
  hud: null, hctx: null,
  sequence: ['#ffdd00','#ffdd00','#cc00ff','#cc00ff','#ff8800','#ff3333'],
  selectedOrb: null,
  phase: 0,
  traceStartT: 0,
  revealStartT: 0,
  endingStartT: 0,
  matchResults: [],
};

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Advance scrubber if playing
  if (isPlaying) {
    scrubberT = Math.min(1, scrubberT + PLAY_SPEED);
    if (scrubberT >= 1) isPlaying = false;
  }

  // Animate ocean waves
  const pos = oceanGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, oceanOrigY[i] + Math.sin(x * 0.15 + t * 1.2) * 0.35 + Math.cos(z * 0.12 + t * 0.9) * 0.25);
  }
  pos.needsUpdate = true;
  oceanGeo.computeVertexNormals();

  // Scroll river texture
  riverTex.offset.y -= 0.004;

  // Animate signal wave ribbons
  waveMats.forEach((m, i) => {
    m.opacity = 0.10 + Math.sin(t * 1.5 + i) * 0.06;
  });

  // Animate signal orbs — show/hide based on scrubber, pulse + float
  signalOrbs.forEach(orb => {
    const visible = scrubberT >= orb.spawnT;
    orb.mesh.visible = visible;
    if (orb.glow) orb.glow.visible = visible;
    if (orb.ring) orb.ring.visible = visible;
    if (visible) {
      const pulse = 0.85 + Math.sin(t * 2.5 + orb.phase) * 0.15;
      orb.mesh.scale.setScalar(pulse);
      if (orb.glow) orb.glow.scale.setScalar(pulse * 1.1);
      orb.mesh.position.y = orb.baseY + Math.sin(t * 1.8 + orb.phase) * 0.4;
      if (orb.glow) orb.glow.position.y = orb.mesh.position.y;
      // Ensure materials are visible
      orb.mat.opacity = 0.92;
      if (orb.glowMat) orb.glowMat.opacity = 0.35;
      if (orb.ringMat) orb.ringMat.opacity = 0.5;
    } else {
      orb.mat.opacity = 0;
      if (orb.glowMat) orb.glowMat.opacity = 0;
      if (orb.ringMat) orb.ringMat.opacity = 0;
    }
  });

  // Animate UFOs — hover at start, depart (rise + fade) as timeline advances
  // Fully visible scrubberT 0→0.08, fade out 0.08→0.18, gone after 0.18
  ufos.forEach((ufo, i) => {
    const fadeStart = 0.08, fadeEnd = 0.18;
    let opacity = 1;
    if (scrubberT > fadeEnd) {
      opacity = 0;
    } else if (scrubberT > fadeStart) {
      opacity = 1 - (scrubberT - fadeStart) / (fadeEnd - fadeStart);
    }

    ufo.group.visible = opacity > 0;
    if (!ufo.group.visible) return;

    // Hover bob + slow rotation
    ufo.group.position.y = ufo.baseY + Math.sin(t * 0.8 + i * 1.2) * 1.5;
    ufo.group.rotation.y = t * 0.3 + i * 0.6;

    // Drift slightly sideways while departing
    const departLift = scrubberT > fadeStart
      ? ((scrubberT - fadeStart) / (fadeEnd - fadeStart)) * 40
      : 0;
    ufo.group.position.y = ufo.baseY + Math.sin(t * 0.8 + i * 1.2) * 1.5 + departLift;

    // Apply fade to all materials
    ufo.hullMat.opacity = opacity;
    ufo.domeMat.opacity = opacity * 0.75;
    ufo.beamMat.opacity = opacity * 0.08;
  });

  // Animate Glorp riders along hoverboard routes
  glorpRiders.forEach((rider, i) => {
    if (!rider.group) return; // still loading
    const visible = scrubberT >= rider.spawnT;
    rider.group.visible = visible;
    if (!visible) return;

    // Freeze if selected
    const frozen = selectedGlorp && selectedGlorp.riderIndex === i;
    const u = frozen
      ? selectedGlorp.frozenU
      : ((t * rider.speed + rider.offset) % 1 + 1) % 1;

    const uNext = (u + 0.01) % 1;
    const pos = rider.spline.getPoint(u);
    const posNext = rider.spline.getPoint(uNext);
    rider.group.position.copy(pos);

    if (!frozen) {
      const dir = posNext.clone().sub(pos).normalize();
      if (dir.length() > 0.001) rider.group.rotation.y = Math.atan2(dir.x, dir.z);
      rider.group.position.y = pos.y + Math.sin(t * 3 + i) * 0.15;
    } else {
      // Frozen: face camera, gentle idle bob
      const toCam = camera.position.clone().sub(rider.group.position);
      rider.group.rotation.y = Math.atan2(toCam.x, toCam.z);
      rider.group.position.y = pos.y + Math.sin(t * 1.5) * 0.08;
    }

    // Skin color shifts green→yellow→red with scrubberT
    const newColor = new THREE.Color(
      Math.min(scrubberT * 2, 1.0) * 0.1,
      Math.max(1.0 - scrubberT * 1.5, 0.3) * 0.75,
      Math.max(0.85 - scrubberT * 1.2, 0.05) * 0.9
    );
    if (rider._meshes) {
      rider._meshes.forEach(m => {
        m.material.color.copy(newColor);
        m.material.emissive.copy(newColor).multiplyScalar(0.25);
      });
    } else if (rider.bodyMat) {
      rider.bodyMat.color.copy(newColor);
      rider.bodyMat.emissive.copy(newColor).multiplyScalar(0.3);
    }

    if (rider.mixer) rider.mixer.update(0.016);
    if (rider.glowMat) rider.glowMat.opacity = 0.35 + Math.sin(t * 4 + i) * 0.15;
  });

  // Skip Interface 1 rendering when Interface 2 is active
  checkTransitionTrigger(t);
  if (i3.active) {
    drawInterface3(t);
    return;
  }
  if (interface2.active) {
    drawInterface2(t);
    return;
  }

  controls.update();
  animateMeteor(t);
  renderer.render(scene, camera);
  drawHUD(t);

  // Transition overlay
  if (transitionState.active) drawTransition(t);
}

animate();

// ============================================================
// --- TRANSITION + INTERFACE 2 ---
// ============================================================

// Trigger transition when scrubberT hits 1
function checkTransitionTrigger(t) {
  if (!transitionTriggered && scrubberT >= 1) {
    transitionTriggered = true;
    transitionState.active = true;
    transitionState.startT = t;
  }
}

// Site data for Interface 2
const sites = [
  {
    name: 'SITE A', subtitle: 'Westpark Plaza',
    color: '#ffaa00', colorHex: 0xffaa00,
    lastVisit: '9 MIN AGO', totalVisits: 14136,
    unknownPct: 31,
    colorDist: [0.45, 0.32, 0.23], // green, yellow, red
    signals: [
      { t: 0.1, c: '#44ff88' }, { t: 0.2, c: '#44ff88' }, { t: 0.35, c: '#ffdd00' },
      { t: 0.5, c: '#ffdd00' }, { t: 0.65, c: '#ff3333' }, { t: 0.8, c: '#ff3333' },
      { t: 0.9, c: '#cc00ff' }, { t: 0.95, c: '#cc00ff' },
    ],
    lore: 'Glorp returned here 847 times. Signal intensity tripled in final 3 months.',
  },
  {
    name: 'SITE B', subtitle: 'East Commerce District',
    color: '#ffdd00', colorHex: 0xffdd00,
    lastVisit: '2 MIN AGO', totalVisits: 19204,
    unknownPct: 44,
    colorDist: [0.28, 0.41, 0.31],
    signals: [
      { t: 0.05, c: '#44ff88' }, { t: 0.15, c: '#44ff88' }, { t: 0.3, c: '#ffdd00' },
      { t: 0.45, c: '#ffdd00' }, { t: 0.6, c: '#ff3333' }, { t: 0.75, c: '#ff3333' },
      { t: 0.85, c: '#cc00ff' }, { t: 0.92, c: '#cc00ff' }, { t: 0.98, c: '#cc00ff' },
    ],
    lore: 'Highest signal density in Halverton. Unknown purple signals began 4 months ago.',
  },
  {
    name: 'SITE C', subtitle: 'Harbor Interchange',
    color: '#cc00ff', colorHex: 0xcc00ff,
    lastVisit: '31 MIN AGO', totalVisits: 9871,
    unknownPct: 58,
    colorDist: [0.18, 0.24, 0.58],
    signals: [
      { t: 0.2, c: '#44ff88' }, { t: 0.4, c: '#ffdd00' },
      { t: 0.55, c: '#ff3333' }, { t: 0.7, c: '#ff3333' },
      { t: 0.78, c: '#cc00ff' }, { t: 0.84, c: '#cc00ff' },
      { t: 0.9, c: '#cc00ff' }, { t: 0.96, c: '#cc00ff' },
    ],
    lore: 'Most unknown signals of any site. Glorp behavior here is unlike anywhere else.',
  },
];

// Decode sequences — color patterns the user needs to match
const decodeSequences = [
  ['#44ff88','#ffdd00','#ff3333','#cc00ff','#ff3333','#ffdd00'],
  ['#cc00ff','#cc00ff','#ff3333','#44ff88','#cc00ff','#ff3333'],
  ['#ff3333','#cc00ff','#cc00ff','#cc00ff','#ff3333','#44ff88'],
];
const colorPalette = ['#44ff88','#ffdd00','#ff3333','#cc00ff','#00ffcc','#ff8800'];

// Create Interface 2 canvas overlay
// ============================================================
// --- INTERFACE 2: 3D SITE EXPLORER ---
// ============================================================

const i2 = {
  scene: null, camera: null, controls: null,
  hud: null, hctx: null,       // 2D overlay for labels/panels
  selectedSite: null,          // 0/1/2 or null
  examinePanel: null,          // { site, screenX, screenY }
  raycaster: new THREE.Raycaster(),
  mouse: new THREE.Vector2(),
  siteObjects: [],             // { group, orb, rings, beams, label }
  connectionBeam: null,
  connectionRevealed: false,
  hitZones: [],
};

const i2SiteData = [
  {
    name: 'SITE A', sub: 'Westpark Plaza',
    pos: new THREE.Vector3(-55, 0, 10),
    color: 0xffaa00, colorCSS: '#ffaa00',
    visits: 14136, lastVisit: '9 min ago', unknownPct: 31,
    signals: ['#44ff88','#44ff88','#ffdd00','#ffdd00','#ff3333','#cc00ff'],
    log: [
      'Glorp returned 847 times over 2 years.',
      'Signal color: green → yellow → red → unknown purple.',
      'Final 3 months: intensity tripled.',
      'Glorp always faces northeast when signaling.',
    ],
  },
  {
    name: 'SITE B', sub: 'East Commerce District',
    pos: new THREE.Vector3(50, 0, -35),
    color: 0xffdd00, colorCSS: '#ffdd00',
    visits: 19204, lastVisit: '2 min ago', unknownPct: 44,
    signals: ['#44ff88','#ffdd00','#ff3333','#cc00ff','#cc00ff','#cc00ff'],
    log: [
      'Highest signal density in Halverton.',
      'Unknown purple signals began 4 months ago.',
      'Glorp gather here in groups of 6–8.',
      'All Glorp face the same direction: northeast.',
    ],
  },
  {
    name: 'SITE C', sub: 'Harbor Interchange',
    pos: new THREE.Vector3(10, 0, 55),
    color: 0xcc00ff, colorCSS: '#cc00ff',
    visits: 9871, lastVisit: '31 min ago', unknownPct: 58,
    signals: ['#ffdd00','#ff3333','#cc00ff','#cc00ff','#cc00ff','#cc00ff'],
    log: [
      'Most unknown signals of any site.',
      'Glorp behavior here unlike anywhere else.',
      'Signal pulses synchronized across all 3 sites.',
      'All Glorp face northeast. Always northeast.',
    ],
  },
];

// ============================================================
// --- INTERFACE 2: 3D SITE EXPLORER (FULL REBUILD) ---
// ============================================================

// --- I2 Scene setup ---
function buildI2Scene() {
  i2.scene = new THREE.Scene();
  i2.scene.background = new THREE.Color(0x0d1f3c);
  i2.scene.fog = new THREE.FogExp2(0x0d1f3c, 0.007);

  // Star backdrop
  const starGeo = new THREE.BufferGeometry();
  const starVerts = [];
  for (let i = 0; i < 3000; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 400 + Math.random() * 100;
    starVerts.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
  i2.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, sizeAttenuation: true })));

  // Ground plane — lighter reflective surface
  const groundMat = new THREE.MeshPhongMaterial({ color: 0x1a2e4a, emissive: 0x0a1828, shininess: 80 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600, 1, 1), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  i2.scene.add(ground);

  // Ambient + directional — much brighter
  i2.scene.add(new THREE.AmbientLight(0x6688bb, 1.8));
  const dLight = new THREE.DirectionalLight(0xaaccff, 1.4);
  dLight.position.set(50, 100, 50);
  i2.scene.add(dLight);
  const dLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
  dLight2.position.set(-60, 60, -40);
  i2.scene.add(dLight2);

  // Camera
  i2.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 800);
  i2.camera.position.set(0, 45, 90);
  i2.camera.lookAt(0, 0, 0);

  // OrbitControls for i2
  i2.controls = new OrbitControls(i2.camera, renderer.domElement);
  i2.controls.enableDamping = true;
  i2.controls.dampingFactor = 0.06;
  i2.controls.minDistance = 20;
  i2.controls.maxDistance = 200;
  i2.controls.maxPolarAngle = Math.PI / 2.05;
  i2.controls.enabled = false;

  // Build sites
  i2.siteObjects = [];
  i2SiteData.forEach((sd, idx) => buildI2Site(sd, idx));

  // Route lines between sites
  buildI2Routes();

  // HUD canvas
  if (!i2.hud) {
    i2.hud = document.createElement('canvas');
    i2.hud.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:20;display:none;';
    document.body.appendChild(i2.hud);
    i2.hctx = i2.hud.getContext('2d');
  }
  i2.hud.width = innerWidth;
  i2.hud.height = innerHeight;

  // Clue tracking
  i2.cluesFound = [[], [], []]; // per site
  i2.connectionRevealed = false;
  i2.convergenceBeam = null;
  i2.travelSpheres = [];
  i2.routeCurves = [];
}

function buildI2Site(sd, idx) {
  const group = new THREE.Group();
  group.position.copy(sd.pos);
  i2.scene.add(group);

  // Environment fog color per site
  const envColors = [0x1a0800, 0x0a1200, 0x0a0018];
  const envLight = new THREE.PointLight(sd.color, 6, 100);
  envLight.position.set(0, 20, 0);
  group.add(envLight);

  // Ground glow disc — more visible
  const discGeo = new THREE.CircleGeometry(22, 48);
  const discMat = new THREE.MeshBasicMaterial({ color: sd.color, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.05;
  group.add(disc);

  // Concentric platform rings
  for (let r = 0; r < 4; r++) {
    const radius = 6 + r * 4;
    const ringGeo = new THREE.RingGeometry(radius - 0.3, radius, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: sd.color, transparent: true,
      opacity: 0.28 + (3 - r) * 0.08, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1 + r * 0.02;
    group.add(ring);
  }

  // Central pedestal
  const pedGeo = new THREE.CylinderGeometry(2.5, 3.2, 1.8, 16);
  const pedMat = new THREE.MeshPhongMaterial({ color: 0x1e3a55, emissive: new THREE.Color(sd.color).multiplyScalar(0.3), shininess: 120 });
  const ped = new THREE.Mesh(pedGeo, pedMat);
  ped.position.y = 0.9;
  group.add(ped);

  // Main orb — large, layered glow
  const orbGeo = new THREE.SphereGeometry(3.5, 32, 32);
  const orbMat = new THREE.MeshPhongMaterial({
    color: sd.color, emissive: new THREE.Color(sd.color),
    emissiveIntensity: 1.8, transparent: true, opacity: 0.92, shininess: 200,
  });
  const orb = new THREE.Mesh(orbGeo, orbMat);
  orb.position.y = 5.5;
  orb.userData = { siteIdx: idx, type: 'orb' };
  group.add(orb);

  // Glow shells (3 layers) — brighter
  const glowShells = [];
  [5.5, 7.5, 10.5].forEach((r, gi) => {
    const gGeo = new THREE.SphereGeometry(r, 24, 24);
    const gMat = new THREE.MeshBasicMaterial({
      color: sd.color, transparent: true,
      opacity: [0.35, 0.20, 0.10][gi], side: THREE.BackSide,
    });
    const gMesh = new THREE.Mesh(gGeo, gMat);
    gMesh.position.y = 5.5;
    group.add(gMesh);
    glowShells.push(gMat);
  });

  // Vertical beam
  const beamGeo = new THREE.CylinderGeometry(0.3, 1.2, 60, 12, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({ color: sd.color, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = 32;
  group.add(beam);

  // Orbiting signal rings (like planet rings)
  const orbitRings = [];
  for (let ri = 0; ri < 3; ri++) {
    const orRingGeo = new THREE.TorusGeometry(5 + ri * 2.5, 0.18, 8, 48);
    const orRingMat = new THREE.MeshBasicMaterial({ color: sd.color, transparent: true, opacity: 0.55 - ri * 0.12 });
    const orRing = new THREE.Mesh(orRingGeo, orRingMat);
    orRing.position.y = 5.5;
    orRing.rotation.x = (0.4 + ri * 0.35);
    orRing.rotation.z = ri * 0.6;
    group.add(orRing);
    orbitRings.push(orRing);
  }

  // Particle system — color dust floating up
  const partCount = 120;
  const partGeo = new THREE.BufferGeometry();
  const partPos = new Float32Array(partCount * 3);
  const partPhase = new Float32Array(partCount);
  for (let p = 0; p < partCount; p++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 14;
    partPos[p * 3]     = Math.cos(a) * r;
    partPos[p * 3 + 1] = Math.random() * 20;
    partPos[p * 3 + 2] = Math.sin(a) * r;
    partPhase[p] = Math.random() * Math.PI * 2;
  }
  partGeo.setAttribute('position', new THREE.Float32BufferAttribute(partPos, 3));
  const partMat = new THREE.PointsMaterial({ color: sd.color, size: 0.35, transparent: true, opacity: 0.7, sizeAttenuation: true });
  const particles = new THREE.Points(partGeo, partMat);
  group.add(particles);

  // Glorp figure facing northeast
  const glorpFig = makeI2Glorp(sd.color);
  glorpFig.position.set(5, 0, -5);
  glorpFig.rotation.y = -Math.PI / 4; // northeast
  group.add(glorpFig);

  // 3 clue objects per site
  const clueObjects = buildI2Clues(group, sd, idx);

  // Small environment buildings around edge
  buildI2Environment(group, sd, idx);

  i2.siteObjects.push({ group, orb, orbMat, glowShells, beam, beamMat, orbitRings, particles, partGeo, partPhase, clueObjects, envLight, discMat });
}

function makeI2Glorp(color) {
  const g = new THREE.Group();
  const c = new THREE.Color(color);
  const mat = new THREE.MeshPhongMaterial({ color: c, emissive: c.clone().multiplyScalar(0.3), shininess: 80 });
  // Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 16), mat);
  body.scale.set(1, 1.2, 0.9);
  body.position.y = 1.2;
  g.add(body);
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 16), mat);
  head.position.y = 2.5;
  g.add(head);
  // Eye
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 }));
  eye.position.set(0.22, 2.6, 0.62);
  g.add(eye);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0x880000 }));
  pupil.position.set(0.22, 2.6, 0.78);
  g.add(pupil);
  g.scale.setScalar(1.4);
  return g;
}

const clueTypes = [
  { id: 'tablet',    label: 'DATA TABLET',        color: 0x00ffcc },
  { id: 'recorder', label: 'SIGNAL RECORDER',     color: 0xffdd00 },
  { id: 'footprint', label: 'GLORP FOOTPRINT',    color: 0xff88ff },
];

const clueMessages = [
  [ // Site A clues
    { title: 'DATA TABLET — SITE A', lines: ['Recovered from plaza bench.', 'Contains 847 logged visits.', 'All entries end: "NE. NE. NE."'] },
    { title: 'SIGNAL RECORDER — SITE A', lines: ['Frequency: 40Hz repeating.', 'Pattern matches Site B + C.', 'Signal origin: unknown.'] },
    { title: 'GLORP FOOTPRINT — SITE A', lines: ['Footprint faces northeast.', 'Depth increases over time.', 'Glorp stood here for hours.'] },
  ],
  [ // Site B clues
    { title: 'DATA TABLET — SITE B', lines: ['19,204 visits logged.', 'Purple signals: 4 months old.', 'Timestamp: always 3:17 AM.'] },
    { title: 'SIGNAL RECORDER — SITE B', lines: ['Highest density in Halverton.', 'Synchronized with Site A + C.', 'Pulse: every 40 seconds.'] },
    { title: 'GLORP FOOTPRINT — SITE B', lines: ['6–8 Glorp gathered here.', 'All facing same direction.', 'Direction: northeast.'] },
  ],
  [ // Site C clues
    { title: 'DATA TABLET — SITE C', lines: ['58% unknown signal type.', 'Behavior unlike any site.', 'Last entry: "IT IS THERE."'] },
    { title: 'SIGNAL RECORDER — SITE C', lines: ['Pulses sync with A and B.', 'Unknown purple dominant.', 'Interval: 40 seconds exact.'] },
    { title: 'GLORP FOOTPRINT — SITE C', lines: ['Deepest footprint found.', 'Glorp collapsed here twice.', 'Still facing: northeast.'] },
  ],
];

function buildI2Clues(group, sd, siteIdx) {
  const clueObjs = [];
  const positions = [
    new THREE.Vector3(-8, 0, 6),
    new THREE.Vector3(9, 0, 3),
    new THREE.Vector3(0, 0, -9),
  ];
  clueTypes.forEach((ct, ci) => {
    const cg = new THREE.Group();
    cg.position.copy(positions[ci]);

    // Pedestal
    const pedMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.8, 0.5, 10),
      new THREE.MeshPhongMaterial({ color: 0x0a1520, emissive: new THREE.Color(ct.color).multiplyScalar(0.2) })
    );
    pedMesh.position.y = 0.25;
    cg.add(pedMesh);

    // Clue object shape
    let clueShape;
    if (ct.id === 'tablet') {
      clueShape = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.1, 0.08),
        new THREE.MeshPhongMaterial({ color: ct.color, emissive: new THREE.Color(ct.color).multiplyScalar(0.5), shininess: 200 })
      );
      clueShape.position.y = 1.3;
    } else if (ct.id === 'recorder') {
      clueShape = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 1.0, 12),
        new THREE.MeshPhongMaterial({ color: ct.color, emissive: new THREE.Color(ct.color).multiplyScalar(0.4), shininess: 160 })
      );
      clueShape.position.y = 1.3;
    } else {
      // Footprint — flat disc with bumps
      clueShape = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, 0.12, 16),
        new THREE.MeshPhongMaterial({ color: ct.color, emissive: new THREE.Color(ct.color).multiplyScalar(0.35) })
      );
      clueShape.position.y = 0.56;
    }
    clueShape.userData = { siteIdx, clueIdx: ci, type: 'clue' };
    cg.add(clueShape);

    // Glow ring around clue
    const glowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.3, 24),
      new THREE.MeshBasicMaterial({ color: ct.color, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.1;
    cg.add(glowRing);

    group.add(cg);
    clueObjs.push({ group: cg, shape: clueShape, glowRing, collected: false, color: ct.color, label: ct.label });
  });
  return clueObjs;
}

function buildI2Environment(group, sd, idx) {
  // Each site has a distinct environment feel via small props
  const envConfigs = [
    // Site A: park — trees
    () => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = 16 + Math.random() * 4;
        const tg = new THREE.Group();
        tg.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3, 6), new THREE.MeshPhongMaterial({ color: 0x2a1a08 }));
        trunk.position.y = 1.5;
        tg.add(trunk);
        const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 10), new THREE.MeshPhongMaterial({ color: 0x2a7a2a, emissive: 0x0a3a0a, emissiveIntensity: 0.4 }));
        foliage.position.y = 4;
        tg.add(foliage);
        group.add(tg);
      }
    },
    // Site B: urban — neon pillars
    () => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = 15;
        const pillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 8 + Math.random() * 6, 0.6),
          new THREE.MeshPhongMaterial({ color: 0x1a2e44, emissive: 0xffdd00, emissiveIntensity: 0.8 })
        );
        pillar.position.set(Math.cos(a) * r, 4, Math.sin(a) * r);
        group.add(pillar);
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffdd00 }));
        top.position.set(Math.cos(a) * r, 9 + Math.random() * 3, Math.sin(a) * r);
        group.add(top);
      }
    },
    // Site C: harbor — dark water patches + mist columns
    () => {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const r = 14;
        const mist = new THREE.Mesh(
          new THREE.CylinderGeometry(1.5, 2.5, 12, 10, 1, true),
          new THREE.MeshBasicMaterial({ color: 0xaa66ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
        );
        mist.position.set(Math.cos(a) * r, 6, Math.sin(a) * r);
        group.add(mist);
      }
      // Dark water patches
      for (let i = 0; i < 4; i++) {
        const wp = new THREE.Mesh(
          new THREE.CircleGeometry(3 + Math.random() * 2, 16),
          new THREE.MeshPhongMaterial({ color: 0x0a1a30, emissive: 0x220055, shininess: 200 })
        );
        wp.rotation.x = -Math.PI / 2;
        wp.position.set((Math.random() - 0.5) * 24, 0.06, (Math.random() - 0.5) * 24);
        group.add(wp);
      }
    },
  ];
  envConfigs[idx]();
}

function buildI2Routes() {
  const positions = i2SiteData.map(s => s.pos);
  const pairs = [[0,1],[1,2],[0,2]];
  i2.routeCurves = [];
  i2.travelSpheres = [];

  pairs.forEach(([a, b]) => {
    const mid = positions[a].clone().lerp(positions[b], 0.5).add(new THREE.Vector3(0, 20, 0));
    const curve = new THREE.QuadraticBezierCurve3(positions[a].clone().add(new THREE.Vector3(0,2,0)), mid, positions[b].clone().add(new THREE.Vector3(0,2,0)));
    const pts = curve.getPoints(80);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.6 });
    i2.scene.add(new THREE.Line(geo, mat));

    // Travel sphere along route
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.8 })
    );
    i2.scene.add(sphere);
    i2.travelSpheres.push({ sphere, curve, offset: Math.random() });
    i2.routeCurves.push(curve);
  });
}

// --- Transition glitch + overlay ---
function drawTransition(t) {
  const W = innerWidth, H = innerHeight;
  const elapsed = t - transitionState.startT;
  const ctx = hctx;

  // Phase 1: glitch (0–1.5s)
  if (elapsed < 1.5) {
    const intensity = Math.min(1, elapsed / 0.5);
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const gy = Math.random() * H;
      const gh = 2 + Math.random() * 12;
      const gx = (Math.random() - 0.5) * 20 * intensity;
      ctx.fillStyle = `rgba(0,255,200,${0.05 + Math.random() * 0.1})`;
      ctx.fillRect(gx, gy, W, gh);
    }
    ctx.restore();
    return;
  }

  // Phase 2: dark overlay with message (1.5–5s)
  const fadeIn = Math.min(1, (elapsed - 1.5) / 0.8);
  ctx.save();
  ctx.fillStyle = `rgba(2,8,16,${fadeIn * 0.97})`;
  ctx.fillRect(0, 0, W, H);

  if (elapsed > 2.2) {
    const ta = Math.min(1, (elapsed - 2.2) / 0.6);
    ctx.font = `bold 28px 'Courier New',monospace`;
    ctx.fillStyle = `rgba(0,255,200,${ta})`;
    ctx.textAlign = 'center';
    ctx.fillText('ALL ROUTES RETURN HERE', W / 2, H / 2 - 40);
    ctx.font = `18px 'Courier New',monospace`;
    ctx.fillStyle = `rgba(136,204,255,${ta})`;
    ctx.fillText('2 YEARS OF DATA.  3 SITES.  ONE MESSAGE.', W / 2, H / 2);
  }

  // Phase 3: button appears after 3s
  if (elapsed > 3.2) {
    const ba = Math.min(1, (elapsed - 3.2) / 0.5);
    const bw = 260, bh = 46;
    const bx = W / 2 - bw / 2, by = H / 2 + 50;
    transitionState.btnX = bx; transitionState.btnY = by;
    transitionState.btnW = bw; transitionState.btnH = bh;

    ctx.fillStyle = `rgba(0,255,200,${ba * 0.15})`;
    ctx.strokeStyle = `rgba(0,255,200,${ba})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill(); ctx.stroke();
    ctx.font = `bold 16px 'Courier New',monospace`;
    ctx.fillStyle = `rgba(0,255,200,${ba})`;
    ctx.fillText('OPEN DECODE TERMINAL  →', W / 2, by + 30);
  }
  ctx.textAlign = 'left';
  ctx.restore();
}

// Click handler for transition button
window.addEventListener('click', e => {
  if (!transitionState.active || interface2.active) return;
  const elapsed = clock.getElapsedTime() - transitionState.startT;
  if (elapsed < 3.2) return;
  const { btnX, btnY, btnW, btnH } = transitionState;
  if (e.clientX >= btnX && e.clientX <= btnX + btnW && e.clientY >= btnY && e.clientY <= btnY + btnH) {
    activateInterface2();
  }
});

function activateInterface2() {
  interface2.active = true;
  transitionState.active = false;
  hud.style.display = 'none';
  buildI2Scene();
  i2.hud.style.display = 'block';
  i2.hud.width = innerWidth;
  i2.hud.height = innerHeight;
  i2.controls.enabled = true;
  controls.enabled = false;
  renderer.domElement.addEventListener('click', onI2Click);
  i2.examinePanel = null;
  i2.notebookOpen = false;
}

// --- I2 Click handler ---
function onI2Click(e) {
  if (!interface2.active) return;
  const W = innerWidth;

  // Back button
  if (e.clientX >= W - 150 && e.clientX <= W - 20 && e.clientY >= 16 && e.clientY <= 48) return; // handled by window listener

  // Notebook toggle button
  if (e.clientX >= W - 150 && e.clientX <= W - 20 && e.clientY >= 60 && e.clientY <= 92) {
    i2.notebookOpen = !i2.notebookOpen;
    return;
  }

  // Connect button (only if all 9 clues found)
  const allClues = i2.cluesFound.every(arr => arr.length >= 3);
  if (allClues && !i2.connectionRevealed) {
    const cx = W / 2 - 100, cy = innerHeight - 80;
    if (e.clientX >= cx && e.clientX <= cx + 200 && e.clientY >= cy && e.clientY <= cy + 44) {
      triggerConvergence();
      return;
    }
  }

  // DECODE SIGNAL button
  if (i2.connectionRevealed && i2.decodeBtnBounds) {
    const b = i2.decodeBtnBounds;
    if (e.clientX >= b.x && e.clientX <= b.x+b.w && e.clientY >= b.y && e.clientY <= b.y+b.h) {
      activateInterface3();
      return;
    }
  }

  // Dismiss examine panel
  if (i2.examinePanel) { i2.examinePanel = null; return; }

  // Raycast
  i2.mouse.x =  (e.clientX / innerWidth)  * 2 - 1;
  i2.mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  i2.raycaster.setFromCamera(i2.mouse, i2.camera);

  // Collect all clickable meshes
  const clickables = [];
  i2.siteObjects.forEach((so, si) => {
    clickables.push({ mesh: so.orb, siteIdx: si, type: 'orb' });
    so.clueObjects.forEach((co, ci) => {
      clickables.push({ mesh: co.shape, siteIdx: si, clueIdx: ci, type: 'clue' });
    });
  });

  const hits = i2.raycaster.intersectObjects(clickables.map(c => c.mesh));
  if (hits.length > 0) {
    const hit = clickables.find(c => c.mesh === hits[0].object);
    if (!hit) return;
    if (hit.type === 'orb') {
      i2.examinePanel = { siteIdx: hit.siteIdx };
      // Fly camera toward site
      const sd = i2SiteData[hit.siteIdx];
      const target = sd.pos.clone().add(new THREE.Vector3(0, 10, 25));
      i2.camera.position.lerp(target, 0.3);
      i2.controls.target.lerp(sd.pos.clone().add(new THREE.Vector3(0, 5, 0)), 0.3);
    } else if (hit.type === 'clue') {
      const si = hit.siteIdx, ci = hit.clueIdx;
      const co = i2.siteObjects[si].clueObjects[ci];
      if (!co.collected) {
        co.collected = true;
        if (!i2.cluesFound[si].includes(ci)) i2.cluesFound[si].push(ci);
      }
      i2.examinePanel = { siteIdx: si, clueIdx: ci, isClue: true };
    }
  }
}

function triggerConvergence() {
  i2.connectionRevealed = true;
  i2.convergenceTime = clock.getElapsedTime();
  // Pull camera back
  const pullTarget = new THREE.Vector3(0, 80, 120);
  i2.camera.position.copy(pullTarget);
  i2.controls.target.set(0, 0, 0);

  // Convergence beams from each site to northeast coordinate
  const neTarget = new THREE.Vector3(80, 0, -80);
  i2SiteData.forEach((sd, idx) => {
    const pts = [sd.pos.clone().add(new THREE.Vector3(0, 6, 0)), neTarget.clone().add(new THREE.Vector3(0, 30, 0))];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: sd.color, transparent: true, opacity: 0.9 });
    i2.scene.add(new THREE.Line(geo, mat));
  });

  // Bright flash at northeast
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(8, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
  );
  flash.position.copy(neTarget).add(new THREE.Vector3(0, 30, 0));
  i2.scene.add(flash);
  i2.convergenceFlash = flash;
}

// --- Draw Interface 2 HUD ---
function drawInterface2(t) {
  if (!i2.scene) return;

  // Animate scene
  const so = i2.siteObjects;
  so.forEach((s, idx) => {
    // Pulse orb
    const pulse = 1 + Math.sin(t * 2 + idx) * 0.08;
    s.orb.scale.setScalar(pulse);
    s.glowShells.forEach((gm, gi) => { gm.opacity = [0.35,0.20,0.10][gi] * (0.7 + Math.sin(t*1.5+idx)*0.3); });
    // Spin orbit rings
    s.orbitRings.forEach((r, ri) => { r.rotation.y += 0.008 + ri * 0.004; });
    // Float particles
    const pp = s.partGeo.attributes.position;
    for (let p = 0; p < pp.count; p++) {
      let py = pp.getY(p) + 0.04;
      if (py > 22) py = 0;
      pp.setY(p, py);
    }
    pp.needsUpdate = true;
    // Beam pulse
    s.beamMat.opacity = 0.16 + Math.sin(t * 1.2 + idx) * 0.06;
    // Glow disc pulse
    s.discMat.opacity = 0.14 + Math.sin(t * 0.8 + idx) * 0.05;
    // Clue objects float
    s.clueObjects.forEach((co, ci) => {
      if (!co.collected) {
        co.shape.position.y = (co.shape.userData.type === 'footprint' ? 0.56 : 1.3) + Math.sin(t * 2 + ci * 1.5) * 0.15;
        co.glowRing.material.opacity = 0.3 + Math.sin(t * 3 + ci) * 0.15;
      } else {
        co.shape.material.opacity = 0.3;
        co.glowRing.material.opacity = 0.1;
      }
    });
  });

  // Travel spheres along routes
  i2.travelSpheres.forEach((ts, ti) => {
    const u = ((t * 0.12 + ts.offset) % 1);
    const pt = ts.curve.getPoint(u);
    ts.sphere.position.copy(pt);
  });

  // Convergence flash fade
  if (i2.convergenceFlash) {
    i2.convergenceFlash.material.opacity = Math.max(0, i2.convergenceFlash.material.opacity - 0.005);
    i2.convergenceFlash.scale.setScalar(1 + (1 - i2.convergenceFlash.material.opacity) * 3);
  }

  if (i2.controls) i2.controls.update();
  renderer.render(i2.scene, i2.camera);

  // Draw 2D HUD overlay
  const ctx = i2.hctx;
  const W = i2.hud.width, H = i2.hud.height;
  ctx.clearRect(0, 0, W, H);
  const f = (sz, bold) => `${bold?'bold ':''}${sz}px 'Courier New',monospace`;

  // Title bar
  ctx.fillStyle = 'rgba(2,8,16,0.88)';
  ctx.strokeStyle = 'rgba(0,255,200,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(10, 10, W - 170, 52, 6); ctx.fill(); ctx.stroke();
  ctx.font = f(24, true); ctx.fillStyle = '#00ffcc';
  ctx.fillText('HALVERTON  ·  SITE EXPLORER', 24, 48);

  // Back button
  ctx.fillStyle = 'rgba(2,8,16,0.9)';
  ctx.strokeStyle = 'rgba(0,255,200,0.7)';
  ctx.beginPath(); ctx.roundRect(W - 152, 12, 138, 38, 6); ctx.fill(); ctx.stroke();
  ctx.font = f(14, true); ctx.fillStyle = '#00ffcc';
  ctx.fillText('← BACK TO MAP', W - 142, 36);

  // Notebook toggle button
  const totalFound = i2.cluesFound ? i2.cluesFound.reduce((a,b) => a + b.length, 0) : 0;
  ctx.fillStyle = 'rgba(2,8,16,0.9)';
  ctx.strokeStyle = totalFound > 0 ? 'rgba(255,220,0,0.8)' : 'rgba(80,100,120,0.5)';
  ctx.beginPath(); ctx.roundRect(W - 152, 58, 138, 38, 6); ctx.fill(); ctx.stroke();
  ctx.font = f(14, true); ctx.fillStyle = totalFound > 0 ? '#ffdd00' : '#445566';
  ctx.fillText(`NOTEBOOK  [${totalFound}/9]`, W - 142, 82);

  // Site labels in 3D space (project to screen)
  i2SiteData.forEach((sd, idx) => {
    const worldPos = sd.pos.clone().add(new THREE.Vector3(0, 16, 0));
    worldPos.project(i2.camera);
    const sx = (worldPos.x * 0.5 + 0.5) * W;
    const sy = (-worldPos.y * 0.5 + 0.5) * H;
    if (worldPos.z > 1) return;

    const allFound = i2.cluesFound && i2.cluesFound[idx].length >= 3;
    ctx.save();
    ctx.textAlign = 'center';
    // Measure both lines and size box to fit
    ctx.font = f(14, true);
    const line1 = sd.name + ' · ' + sd.sub;
    ctx.font = f(13, false);
    const line2 = `Clues: ${i2.cluesFound ? i2.cluesFound[idx].length : 0}/3${allFound ? ' ✓' : ''}`;
    ctx.font = f(14, true);
    const lw = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width) + 28;
    const lh = 48;
    ctx.fillStyle = 'rgba(2,8,16,0.88)';
    ctx.strokeStyle = sd.colorCSS;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(sx - lw/2, sy - 22, lw, lh, 5); ctx.fill(); ctx.stroke();
    ctx.font = f(14, true); ctx.fillStyle = sd.colorCSS;
    ctx.fillText(line1, sx, sy - 4);
    ctx.font = f(13, false); ctx.fillStyle = '#aabbcc';
    ctx.fillText(line2, sx, sy + 16);
    ctx.textAlign = 'left';
    ctx.restore();
  });

  // Helper: word-wrap text into lines that fit maxW
  function wrapText(text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    words.forEach(w => {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = test;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  // Examine panel
  if (i2.examinePanel) {
    const { siteIdx, clueIdx, isClue } = i2.examinePanel;
    const sd = i2SiteData[siteIdx];
    const pw = 340;
    const px = 20;
    const innerW = pw - 28;

    if (isClue) {
      const cm = clueMessages[siteIdx][clueIdx];
      const ph = 200;
      const py = Math.min(H - ph - 10, Math.max(10, H / 2 - ph / 2));
      ctx.fillStyle = 'rgba(2,8,16,0.96)';
      ctx.strokeStyle = sd.colorCSS;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.fill(); ctx.stroke();
      // Title — auto-shrink font to fit
      let titleSz = 15;
      ctx.font = f(titleSz, true);
      while (ctx.measureText(cm.title).width > innerW && titleSz > 11) { titleSz--; ctx.font = f(titleSz, true); }
      ctx.fillStyle = sd.colorCSS;
      ctx.fillText(cm.title, px + 14, py + 30);
      ctx.strokeStyle = sd.colorCSS + '44'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px+14, py+40); ctx.lineTo(px+pw-14, py+40); ctx.stroke();
      ctx.font = f(14, false); ctx.fillStyle = '#ccdde8';
      cm.lines.forEach((l, li) => ctx.fillText(l, px + 14, py + 64 + li * 24));
      ctx.font = f(11, false); ctx.fillStyle = '#334455';
      ctx.textAlign = 'center'; ctx.fillText('click anywhere to close', px + pw/2, py + ph - 8); ctx.textAlign = 'left';
    } else {
      // Orb examine panel — measure log lines first to size box
      ctx.font = f(13, false);
      const logLines = sd.log.flatMap(l => wrapText(l, innerW));
      const ph = 130 + logLines.length * 20 + 24;
      const py = Math.min(H - ph - 10, Math.max(10, H / 2 - ph / 2));
      ctx.fillStyle = 'rgba(2,8,16,0.96)';
      ctx.strokeStyle = sd.colorCSS;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.fill(); ctx.stroke();
      ctx.font = f(15, true); ctx.fillStyle = sd.colorCSS;
      ctx.fillText(sd.name, px + 14, py + 28);
      ctx.font = f(13, false); ctx.fillStyle = '#aabbcc';
      ctx.fillText(sd.sub, px + 14, py + 46);
      ctx.strokeStyle = sd.colorCSS + '44'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px+14, py+56); ctx.lineTo(px+pw-14, py+56); ctx.stroke();
      ctx.font = f(13, false); ctx.fillStyle = '#aabbcc';
      ctx.fillText(`Visits: ${sd.visits.toLocaleString()}`, px+14, py+74);
      ctx.fillText(`Last visit: ${sd.lastVisit}`, px+14, py+92);
      ctx.fillText(`Unknown signals: ${sd.unknownPct}%`, px+14, py+110);
      ctx.strokeStyle = sd.colorCSS + '44'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px+14, py+118); ctx.lineTo(px+pw-14, py+118); ctx.stroke();
      ctx.font = f(13, true); ctx.fillStyle = '#00ffcc'; ctx.fillText('FIELD LOG:', px+14, py+136);
      ctx.font = f(13, false); ctx.fillStyle = '#ccdde8';
      logLines.forEach((l, li) => ctx.fillText(l, px+14, py+154+li*20));
      ctx.font = f(11, false); ctx.fillStyle = '#334455';
      ctx.textAlign = 'center'; ctx.fillText('click anywhere to close', px+pw/2, py+ph-8); ctx.textAlign = 'left';
    }
  }

  // Notebook panel
  if (i2.notebookOpen) {
    const nw = 320, nx = W - nw - 20, ny = 106;
    // Calculate height dynamically
    const nbLineH = 18, nbSiteH = 20;
    const nbContentH = i2SiteData.length * (nbSiteH + clueTypes.length * nbLineH + 6);
    const nh = 70 + nbContentH + 40;
    ctx.fillStyle = 'rgba(2,8,16,0.97)';
    ctx.strokeStyle = 'rgba(255,220,0,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(nx, ny, nw, nh, 10); ctx.fill(); ctx.stroke();
    ctx.font = f(15, true); ctx.fillStyle = '#ffdd00';
    ctx.fillText('FIELD NOTEBOOK', nx+14, ny+28);
    ctx.font = f(13, false); ctx.fillStyle = '#556677';
    ctx.fillText(`${totalFound} of 9 clues collected`, nx+14, ny+48);
    ctx.strokeStyle = '#ffdd0044'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(nx+14, ny+58); ctx.lineTo(nx+nw-14, ny+58); ctx.stroke();

    let ey = ny + 76;
    i2SiteData.forEach((sd, si) => {
      ctx.font = f(14, true); ctx.fillStyle = sd.colorCSS;
      ctx.fillText(sd.name, nx+14, ey); ey += nbSiteH;
      clueTypes.forEach((ct, ci) => {
        const found = i2.cluesFound && i2.cluesFound[si].includes(ci);
        ctx.font = f(13, false); ctx.fillStyle = found ? '#ccdde8' : '#334455';
        ctx.fillText((found ? '✓ ' : '○ ') + ct.label, nx+24, ey); ey += nbLineH;
      });
      ey += 6;
    });

    if (totalFound >= 9) {
      ctx.font = f(13, true); ctx.fillStyle = '#00ffcc';
      ctx.fillText('ALL CLUES FOUND', nx+14, ey+6);
      ctx.font = f(12, false); ctx.fillStyle = '#00ccaa';
      ctx.fillText('→ CONNECT THE SITES below', nx+14, ey+22);
    } else {
      ctx.font = f(12, false); ctx.fillStyle = '#334455';
      ctx.fillText('Find all clues to reveal', nx+14, ey+6);
      ctx.fillText('the connection.', nx+14, ey+22);
    }
  }

  const allClues = i2.cluesFound && i2.cluesFound.every(arr => arr.length >= 3);
  if (allClues && !i2.connectionRevealed) {
    const bw = 240, bh = 50, bx = W/2 - bw/2, by = H - 86;
    const pulse = 0.6 + Math.sin(t * 3) * 0.4;
    ctx.fillStyle = `rgba(0,255,200,${0.15 * pulse})`;
    ctx.strokeStyle = `rgba(0,255,200,${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
    ctx.font = f(16, true); ctx.fillStyle = `rgba(0,255,200,${pulse})`;
    ctx.textAlign = 'center'; ctx.fillText('CONNECT THE SITES', W/2, by+32); ctx.textAlign = 'left';
  }

  // Convergence revealed message + DECODE button
  if (i2.connectionRevealed) {
    ctx.save();
    const elapsed = i2.convergenceTime ? (clock.getElapsedTime() - i2.convergenceTime) : 0;
    const msg1 = 'ALL ROUTES POINT NORTHEAST';
    const msg2 = 'Coordinate: 47.3°N  ·  Signal still broadcasting.';
    const msg3 = 'The Glorp were warning us.';
    ctx.font = f(15, true);
    const mw = Math.max(ctx.measureText(msg1).width, ctx.measureText(msg2).width) + 48;
    const mh = 80, mx = W/2 - mw/2, my = H/2 - 60;
    ctx.fillStyle = 'rgba(2,8,16,0.95)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 10); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = f(15, true); ctx.fillStyle = '#ffffff';
    ctx.fillText(msg1, W/2, my + 26);
    ctx.font = f(13, false); ctx.fillStyle = '#aabbcc';
    ctx.fillText(msg2, W/2, my + 48);
    ctx.font = f(13, false); ctx.fillStyle = '#00ffcc';
    ctx.fillText(msg3, W/2, my + 68);
    ctx.textAlign = 'left';

    // DECODE SIGNAL button — appears after 2.5s
    if (elapsed > 2.5) {
      const ba = Math.min(1, (elapsed - 2.5) / 0.8);
      const pulse = ba * (0.7 + Math.sin(t * 3) * 0.3);
      const bw = 260, bh = 52, bx = W/2 - bw/2, by = H/2 + 40;
      i2.decodeBtnBounds = { x: bx, y: by, w: bw, h: bh };
      ctx.fillStyle = `rgba(255,180,0,${0.15 * pulse})`;
      ctx.strokeStyle = `rgba(255,180,0,${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill(); ctx.stroke();
      ctx.font = f(17, true); ctx.fillStyle = `rgba(255,220,0,${pulse})`;
      ctx.textAlign = 'center';
      ctx.fillText('DECODE SIGNAL  →', W/2, by + 34);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }
}
// Handle back button in Interface 2 (HUD is pointer-events:none, use window)
// Handle back button in Interface 2 (HUD is pointer-events:none, use window)
window.addEventListener('click', e => {
  if (!interface2.active) return;
  // Back button
  const W = innerWidth;
  if (e.clientX >= W-150 && e.clientX <= W-20 && e.clientY >= 16 && e.clientY <= 48) {
    interface2.active = false;
    transitionState.active = false;
    transitionTriggered = false;
    scrubberT = 0.99;
    renderer.domElement.removeEventListener('click', onI2Click);
    controls.enabled = true;
    if (i2.controls) i2.controls.enabled = false;
    if (i2.hud) i2.hud.style.display = 'none';
    hud.style.display = 'block';  // restore i1 HUD
  }
});


// ============================================================
// --- INTERFACE 3: TRANSLATION INTERFACE ---
// ============================================================

// The correct answer sequence
const I3_ANSWER = ['#ffdd00','#cc00ff','#ff8800','#cc00ff','#ffdd00','#ff3333'];

// Color palette for orb cycling
const I3_PALETTE = ['#ffdd00','#cc00ff','#ff8800','#ff3333','#44ff88','#00ffcc'];

const I3_PALETTE_LABELS = ['YELLOW','PURPLE','ORANGE','RED','GREEN','CYAN'];

// Known signal patterns from the 3 sites (match candidates)
const I3_KNOWN_PATTERNS = [
  { pct: 89, label: 'Match 01', sites: 'Sites A, B, C', seq: ['#ffdd00','#cc00ff','#ff8800','#cc00ff','#ffdd00','#ff3333'] },
  { pct: 61, label: 'Match 02', sites: 'Sites A, B',    seq: ['#ffdd00','#ffdd00','#cc00ff','#ff8800','#ff3333','#ff3333'] },
  { pct: 54, label: 'Match 03', sites: 'Sites B, C',    seq: ['#cc00ff','#ffdd00','#ff8800','#cc00ff','#ff3333','#ffdd00'] },
  { pct: 47, label: 'Match 04', sites: 'Site C',        seq: ['#ffdd00','#cc00ff','#cc00ff','#ff8800','#ff3333','#44ff88'] },
];

// Possible meanings legend
const I3_MEANINGS = [
  { color: '#ffdd00', text: 'Warning / Danger ahead' },
  { color: '#cc00ff', text: 'Convergence / Gathering' },
  { color: '#ff8800', text: 'Direction / Location' },
  { color: '#ff3333', text: 'Urgent / Time-critical' },
  { color: '#44ff88', text: 'Calm / Observation' },
  { color: '#00ffcc', text: 'Unknown / Unclassified' },
];

function activateInterface3() {
  i3.active = true;
  interface2.active = false;
  if (i2.hud) i2.hud.style.display = 'none';
  renderer.domElement.removeEventListener('click', onI2Click);
  if (i2.controls) i2.controls.enabled = false;

  if (!i3.hud) {
    i3.hud = document.createElement('canvas');
    i3.hud.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:30;cursor:pointer;';
    document.body.appendChild(i3.hud);
    i3.hctx = i3.hud.getContext('2d');
    i3.hud.addEventListener('click', onI3Click);
  }
  i3.hud.width = innerWidth;
  i3.hud.height = innerHeight;
  i3.hud.style.display = 'block';
  i3.phase = 0;
  i3.sequence = ['#ffdd00','#ffdd00','#cc00ff','#cc00ff','#ff8800','#ff3333'];
  i3.selectedOrb = null;
  i3.matchResults = computeMatches(i3.sequence);

  window.addEventListener('resize', onI3Resize);
}

function onI3Resize() {
  if (!i3.hud) return;
  i3.hud.width = innerWidth;
  i3.hud.height = innerHeight;
}

function computeMatches(seq) {
  return I3_KNOWN_PATTERNS.map(p => {
    let matches = 0;
    seq.forEach((c, i) => { if (c === p.seq[i]) matches++; });
    const pct = Math.round((matches / 6) * 100);
    return { ...p, pct };
  }).sort((a, b) => b.pct - a.pct);
}

function onI3Click(e) {
  if (!i3.active) return;
  const W = i3.hud.width, H = i3.hud.height;

  // Convert mouse coords to canvas space (handles any CSS scaling/offset)
  const rect = i3.hud.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top)  * scaleY;

  if (i3.phase === 0) {
    // --- exact same layout math as drawI3Main ---
    const leftW = W * 0.44;
    const orbR = Math.min(leftW * 0.075, 38);
    const orbSpacing = orbR * 2.8;
    const orbStartX = 30 + orbR;
    const orbY = H * 0.26;

    // Check orb clicks
    for (let i = 0; i < 6; i++) {
      const ox = orbStartX + i * orbSpacing;
      const dx = mx - ox, dy = my - orbY;
      if (Math.sqrt(dx*dx+dy*dy) < orbR + 8) {
        i3.selectedOrb = (i3.selectedOrb === i) ? null : i;
        return;
      }
    }

    // Check palette clicks (only if orb selected)
    if (i3.selectedOrb !== null) {
      const palY = H * 0.42;
      const palR = Math.min(W * 0.032, 26);
      const palSpacing = palR * 2.6;
      const palStartX = orbStartX;
      for (let p = 0; p < I3_PALETTE.length; p++) {
        const px = palStartX + p * palSpacing;
        const dx = mx - px, dy = my - palY;
        if (Math.sqrt(dx*dx+dy*dy) < palR + 8) {
          i3.sequence[i3.selectedOrb] = I3_PALETTE[p];
          i3.selectedOrb = null;
          i3.matchResults = computeMatches(i3.sequence);
          return;
        }
      }
    }

    // Check TRACE SEQUENCE button
    const bw = Math.min(260, W * 0.22), bh = 52;
    const bx = W - bw - 24, by = H - 80;
    if (mx >= bx && mx <= bx+bw && my >= by && my <= by+bh) {
      i3.phase = 1;
      i3.traceStartT = clock.getElapsedTime();
    }
  } else if (i3.phase >= 3) {
    // Clicking during ending does nothing — intentional silence
  }
}

function drawInterface3(t) {
  if (!i3.active || !i3.hctx) return;
  const ctx = i3.hctx;
  const W = i3.hud.width, H = i3.hud.height;
  const f = (sz, bold) => `${bold?'bold ':''}${sz}px 'Courier New',monospace`;

  // Background
  ctx.fillStyle = '#06080f';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(0,255,200,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  if (i3.phase === 0 || i3.phase === 1) {
    drawI3Main(ctx, t, W, H, f);
  } else if (i3.phase === 2) {
    drawI3Reveal(ctx, t, W, H, f);
  } else if (i3.phase === 3) {
    drawI3Ending(ctx, t, W, H, f);
  }
}

function drawI3Main(ctx, t, W, H, f) {
  const elapsed = i3.phase === 1 ? t - i3.traceStartT : 0;

  // Title
  ctx.font = f(28, true); ctx.fillStyle = '#e8f4ff';
  ctx.textAlign = 'center';
  ctx.fillText('TRANSLATION INTERFACE', W/2, 52);
  ctx.textAlign = 'left';
  ctx.font = f(13, false); ctx.fillStyle = '#445566';
  ctx.textAlign = 'center';
  ctx.fillText('Halverton Signal Analysis  ·  Glorp Communication Decoder', W/2, 74);
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = 'rgba(0,255,200,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(20, 86); ctx.lineTo(W-20, 86); ctx.stroke();

  const leftW = W * 0.44, rightX = W * 0.5, rightW = W - rightX - 20;
  const orbR = Math.min(leftW * 0.075, 38);
  const orbSpacing = orbR * 2.8;
  const orbStartX = 30 + orbR;
  const orbY = H * 0.26;

  // ── INPUT SEQUENCE BOX ──────────────────────────────────
  const seqBoxH = orbR * 4.5;
  ctx.fillStyle = 'rgba(10,20,35,0.9)';
  ctx.strokeStyle = 'rgba(0,255,200,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(20, 100, leftW - 10, seqBoxH, 8); ctx.fill(); ctx.stroke();
  ctx.font = f(14, true); ctx.fillStyle = '#00ffcc';
  ctx.fillText('INPUT SEQUENCE', 36, 124);

  // Track lines
  const trackY = orbY + orbR * 0.6;
  ctx.strokeStyle = 'rgba(100,160,220,0.4)'; ctx.lineWidth = 2;
  [-orbR*0.25, orbR*0.25].forEach(dy => {
    ctx.beginPath(); ctx.moveTo(orbStartX - orbR, trackY+dy); ctx.lineTo(orbStartX + 5*orbSpacing + orbR, trackY+dy); ctx.stroke();
  });
  // Track tick marks
  ctx.strokeStyle = 'rgba(100,160,220,0.3)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const tx = orbStartX + i * orbSpacing;
    ctx.beginPath(); ctx.moveTo(tx, trackY + orbR*0.5); ctx.lineTo(tx, trackY + orbR*0.9); ctx.stroke();
  }

  // Orbs
  for (let i = 0; i < 6; i++) {
    const ox = orbStartX + i * orbSpacing;
    const col = i3.sequence[i];
    const isSelected = i3.selectedOrb === i;
    const pulse = isSelected ? 1 + Math.sin(t * 5) * 0.08 : 1;

    // Glow
    const grd = ctx.createRadialGradient(ox, orbY, 0, ox, orbY, orbR * 2.2 * pulse);
    grd.addColorStop(0, col + 'aa');
    grd.addColorStop(1, col + '00');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(ox, orbY, orbR * 2.2 * pulse, 0, Math.PI*2); ctx.fill();

    // Orb body
    const orbGrd = ctx.createRadialGradient(ox - orbR*0.3, orbY - orbR*0.3, orbR*0.1, ox, orbY, orbR * pulse);
    orbGrd.addColorStop(0, '#ffffff88');
    orbGrd.addColorStop(0.3, col);
    orbGrd.addColorStop(1, col + 'cc');
    ctx.fillStyle = orbGrd;
    ctx.beginPath(); ctx.arc(ox, orbY, orbR * pulse, 0, Math.PI*2); ctx.fill();

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(ox, orbY, orbR * pulse + 5, 0, Math.PI*2); ctx.stroke();
    }

    // Index number below
    ctx.font = f(12, false); ctx.fillStyle = '#445566';
    ctx.textAlign = 'center'; ctx.fillText(i+1, ox, orbY + orbR + 18); ctx.textAlign = 'left';
  }

  // Palette picker (shown when orb selected)
  if (i3.selectedOrb !== null) {
    const palY = H * 0.42, palR = Math.min(W * 0.032, 26);
    const palSpacing = palR * 2.6;
    const palStartX = orbStartX;

    ctx.font = f(13, true); ctx.fillStyle = '#88aacc';
    ctx.fillText('SELECT COLOR:', 30, palY - palR - 8);

    I3_PALETTE.forEach((col, p) => {
      const px = palStartX + p * palSpacing;
      const grd = ctx.createRadialGradient(px - palR*0.3, palY - palR*0.3, palR*0.1, px, palY, palR);
      grd.addColorStop(0, '#ffffff88'); grd.addColorStop(0.3, col); grd.addColorStop(1, col+'cc');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(px, palY, palR, 0, Math.PI*2); ctx.fill();
      if (col === i3.sequence[i3.selectedOrb]) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, palY, palR+4, 0, Math.PI*2); ctx.stroke();
      }
      ctx.font = f(10, false); ctx.fillStyle = '#556677';
      ctx.textAlign = 'center'; ctx.fillText(I3_PALETTE_LABELS[p], px, palY + palR + 14); ctx.textAlign = 'left';
    });
  } else {
    ctx.font = f(12, false); ctx.fillStyle = '#334455';
    ctx.fillText('Click an orb to change its color', 30, H * 0.42);
  }

  // ── POSSIBLE MEANINGS BOX ───────────────────────────────
  const meanY = H * 0.52, meanH = I3_MEANINGS.length * 28 + 44;
  ctx.fillStyle = 'rgba(10,20,35,0.9)';
  ctx.strokeStyle = 'rgba(100,160,220,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(20, meanY, leftW - 10, meanH, 8); ctx.fill(); ctx.stroke();
  ctx.font = f(14, true); ctx.fillStyle = '#88ccff';
  ctx.fillText('POSSIBLE MEANINGS', 36, meanY + 24);
  I3_MEANINGS.forEach((m, mi) => {
    const ly = meanY + 46 + mi * 28;
    const grd = ctx.createRadialGradient(46, ly, 0, 46, ly, 11);
    grd.addColorStop(0, '#ffffff88'); grd.addColorStop(0.4, m.color); grd.addColorStop(1, m.color+'cc');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(46, ly, 11, 0, Math.PI*2); ctx.fill();
    ctx.font = f(13, false); ctx.fillStyle = '#ccdde8';
    ctx.fillText(m.text, 66, ly + 5);
  });

  // ── MATCH RESULTS BOX ───────────────────────────────────
  const matchH = i3.matchResults.length * 72 + 50;
  ctx.fillStyle = 'rgba(10,20,35,0.9)';
  ctx.strokeStyle = 'rgba(100,160,220,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(rightX, 100, rightW, matchH, 8); ctx.fill(); ctx.stroke();
  ctx.font = f(14, true); ctx.fillStyle = '#88ccff';
  ctx.fillText('MATCH RESULTS', rightX + 16, 124);

  i3.matchResults.forEach((m, mi) => {
    const my = 140 + mi * 72;
    const isTop = mi === 0;
    // Highlight top match
    if (isTop) {
      ctx.fillStyle = 'rgba(0,255,200,0.06)';
      ctx.beginPath(); ctx.roundRect(rightX + 8, my - 4, rightW - 16, 66, 6); ctx.fill();
    }
    // Percentage
    const pctColor = m.pct >= 80 ? '#00ffcc' : m.pct >= 60 ? '#ffdd00' : '#778899';
    ctx.font = f(isTop ? 22 : 18, true); ctx.fillStyle = pctColor;
    ctx.fillText(`${m.pct}%`, rightX + 16, my + 22);
    ctx.font = f(13, true); ctx.fillStyle = '#aabbcc';
    ctx.fillText(m.label, rightX + 80, my + 22);
    ctx.font = f(11, false); ctx.fillStyle = '#445566';
    ctx.fillText(m.sites, rightX + 80, my + 38);

    // Mini color strip
    const stripX = rightX + rightW - 6 * 22 - 16;
    const stripY = my + 8;
    m.seq.forEach((col, si) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.roundRect(stripX + si * 22, stripY, 18, 18, 3); ctx.fill();
      // dim if mismatch with user sequence
      if (col !== i3.sequence[si]) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.roundRect(stripX + si * 22, stripY, 18, 18, 3); ctx.fill();
      }
    });

    // Divider
    if (mi < i3.matchResults.length - 1) {
      ctx.strokeStyle = 'rgba(100,160,220,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rightX+16, my+68); ctx.lineTo(rightX+rightW-16, my+68); ctx.stroke();
    }
  });

  // ── TRACE SEQUENCE BUTTON ───────────────────────────────
  const bw = Math.min(260, W * 0.22), bh = 52;
  const bx = W - bw - 24, by = H - 80;
  const tracing = i3.phase === 1;
  const traceProgress = tracing ? Math.min(1, elapsed / 3.0) : 0;

  ctx.fillStyle = tracing ? 'rgba(0,255,200,0.12)' : 'rgba(255,180,0,0.12)';
  ctx.strokeStyle = tracing ? '#00ffcc' : '#ffdd00';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill(); ctx.stroke();

  if (tracing) {
    // Progress bar inside button
    ctx.fillStyle = 'rgba(0,255,200,0.3)';
    ctx.beginPath(); ctx.roundRect(bx+4, by+4, (bw-8)*traceProgress, bh-8, 7); ctx.fill();
    ctx.font = f(15, true); ctx.fillStyle = '#00ffcc';
    ctx.textAlign = 'center'; ctx.fillText('TRACING...', bx+bw/2, by+33); ctx.textAlign = 'left';
    // Transition to reveal when done
    if (traceProgress >= 1) {
      i3.phase = 2;
      i3.revealStartT = clock.getElapsedTime();
    }
  } else {
    ctx.font = f(15, true); ctx.fillStyle = '#ffdd00';
    ctx.textAlign = 'center'; ctx.fillText('TRACE SEQUENCE', bx+bw/2, by+33); ctx.textAlign = 'left';
  }
}

function drawI3Reveal(ctx, t, W, H, f) {
  const elapsed = t - i3.revealStartT;

  // Dark overlay fades in
  const fadeIn = Math.min(1, elapsed / 0.6);
  ctx.fillStyle = `rgba(2,4,10,${fadeIn})`;
  ctx.fillRect(0, 0, W, H);

  if (elapsed < 0.6) return;

  // Glitch lines
  if (elapsed < 1.4) {
    for (let i = 0; i < 6; i++) {
      const gy = Math.random() * H;
      ctx.fillStyle = `rgba(0,255,200,${Math.random() * 0.12})`;
      ctx.fillRect(0, gy, W, 2 + Math.random() * 8);
    }
    return;
  }

  // Signal header
  const a1 = Math.min(1, (elapsed - 1.4) / 0.5);
  ctx.font = f(13, false); ctx.fillStyle = `rgba(0,255,200,${a1 * 0.6})`;
  ctx.textAlign = 'center';
  ctx.fillText('SIGNAL ORIGIN: 47.3°N  ·  BROADCAST DURATION: 2 YEARS, 0 DAYS  ·  HUMAN RESPONSES: 0', W/2, 44);
  ctx.textAlign = 'left';

  // Decoded sequence display
  if (elapsed > 2.0) {
    const a2 = Math.min(1, (elapsed - 2.0) / 0.6);
    ctx.font = f(14, true); ctx.fillStyle = `rgba(136,204,255,${a2})`;
    ctx.textAlign = 'center'; ctx.fillText('DECODED SEQUENCE', W/2, H/2 - 120); ctx.textAlign = 'left';

    const orbR = 28, orbSpacing = orbR * 2.8;
    const totalW = 5 * orbSpacing + orbR * 2;
    const startX = W/2 - totalW/2 + orbR;
    I3_ANSWER.forEach((col, i) => {
      const ox = startX + i * orbSpacing;
      const oy = H/2 - 72;
      const grd = ctx.createRadialGradient(ox-8, oy-8, 2, ox, oy, orbR);
      grd.addColorStop(0, '#ffffff88'); grd.addColorStop(0.3, col); grd.addColorStop(1, col+'cc');
      ctx.fillStyle = `rgba(0,0,0,${a2})`; // shadow
      ctx.beginPath(); ctx.arc(ox+2, oy+2, orbR, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = a2;
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(ox, oy, orbR, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  // Translation lines appear one by one
  const lines = [
    { delay: 2.8, text: '"DANGER APPROACHES FROM ABOVE.', color: '#ff3333' },
    { delay: 3.6, text: ' WE CAME TO SHOW YOU.', color: '#ffdd00' },
    { delay: 4.4, text: ' LOOK NORTHEAST.', color: '#cc00ff' },
    { delay: 5.2, text: ' YOU HAVE UNTIL—"', color: '#ff8800' },
    { delay: 6.2, text: '[ SIGNAL INTERRUPTED ]', color: '#445566' },
  ];

  lines.forEach((line, li) => {
    if (elapsed > line.delay) {
      const la = Math.min(1, (elapsed - line.delay) / 0.5);
      ctx.font = li === 4 ? f(14, false) : f(li < 3 ? 22 : 20, true);
      ctx.fillStyle = line.color.replace(')', `,${la})`).replace('rgb', 'rgba').replace('#', 'rgba(').replace('rgba(', '#');
      // simpler approach:
      ctx.globalAlpha = la;
      ctx.fillStyle = line.color;
      ctx.textAlign = 'center';
      ctx.fillText(line.text, W/2, H/2 + li * 38);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
  });

  // Transition to ending
  if (elapsed > 7.5 && i3.phase === 2) {
    i3.phase = 3;
    i3.endingStartT = clock.getElapsedTime();
  }
}

function drawI3Ending(ctx, t, W, H, f) {
  const elapsed = t - i3.endingStartT;

  // After last line + pause, fade out and return to island with meteor
  const meteorDelay = 16.5;
  if (elapsed > meteorDelay) {
    const fadeOut = Math.min(1, (elapsed - meteorDelay) / 1.2);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    if (fadeOut >= 1 && !i3._meteorTriggered) {
      i3._meteorTriggered = true;
      // Hide i3, restore Interface 1, fire meteor
      i3.hud.style.display = 'none';
      i3.active = false;
      hud.style.display = 'block';
      controls.enabled = true;
      scrubberT = 1.0;
      // Pull camera back to dramatic angle
      camera.position.set(0, 120, 200);
      camera.lookAt(0, 0, 0);
      triggerMeteorStrike();
    }
    return;
  }

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  const endingLines = [
    { delay: 0.5,  text: 'The Glorp left Halverton 6 days ago.',  size: 20, color: '#aabbcc' },
    { delay: 2.5,  text: 'No one knows where they went.',          size: 20, color: '#778899' },
    { delay: 5.0,  text: 'The signal is still broadcasting.',      size: 20, color: '#aabbcc' },
    { delay: 7.0,  text: 'From northeast.',                        size: 20, color: '#88aacc' },
    { delay: 8.5,  text: 'Unattended.',                            size: 20, color: '#556677' },
    { delay: 11.5, text: 'You decoded it.',                        size: 22, color: '#ffffff' },
    { delay: 13.5, text: "But you're already too late.",           size: 22, color: '#ff3333' },
  ];

  endingLines.forEach((line, li) => {
    if (elapsed < line.delay) return;
    const la = Math.min(1, (elapsed - line.delay) / 1.2);
    ctx.globalAlpha = la;
    ctx.font = f(line.size, li >= 5);
    ctx.fillStyle = line.color;
    ctx.textAlign = 'center';
    ctx.fillText(line.text, W/2, H/2 - 80 + li * 44);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  });

  // Timestamp counter
  if (elapsed > 9.0) {
    const ca = Math.min(1, (elapsed - 9.0) / 1.0);
    ctx.globalAlpha = ca * 0.5;
    ctx.font = f(12, false); ctx.fillStyle = '#334455';
    ctx.textAlign = 'center';
    const secs = Math.floor(elapsed - 9.0) + 63072000;
    const hrs = Math.floor(secs / 3600), mins = Math.floor((secs % 3600) / 60), s = secs % 60;
    ctx.fillText(`SIGNAL ACTIVE: ${String(hrs).padStart(6,'0')}h ${String(mins).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`, W/2, H - 60);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // Pulsing red dot
  if (elapsed > 15.0) {
    const pulse = 0.4 + Math.sin(t * 0.8) * 0.4;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ff3333';
    ctx.beginPath(); ctx.arc(W/2, H - 30, 5, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}



