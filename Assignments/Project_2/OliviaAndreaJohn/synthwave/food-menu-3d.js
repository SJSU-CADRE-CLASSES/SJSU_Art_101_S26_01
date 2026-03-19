import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

const stage = document.querySelector(".menu-stage");
const titleEl = document.getElementById("menu-title");
const descEl = document.getElementById("menu-desc");
const tagEl = document.getElementById("menu-tag");
const notesEl = document.getElementById("menu-notes");
const orderBtn = document.getElementById("menu-order");
const randomBtn = document.getElementById("menu-random");

if (
  !stage ||
  !titleEl ||
  !descEl ||
  !tagEl ||
  !notesEl ||
  !orderBtn ||
  !randomBtn
) {
  throw new Error("Food 3D menu is missing required DOM elements.");
}

const dishes = [
  {
    id: "prism-donut",
    name: "Prism-Glazed Donut",
    desc: "Sugar glass, citrus static, and a neon glaze that refracts the room.",
    profile: "Sweet / Spark",
    notes: "Recommended for first-time visitors. Comfort calibration: high.",
    priceTokens: 920,
    color: 0xff37b9,
    shape: "torus",
  },
  {
    id: "noodle-bowl",
    name: "Phosphor Noodle Bowl",
    desc: "Broth that glows like signage; steam that looks like music.",
    profile: "Umami / Warm",
    notes: "Stabilizes mood during late loops. Steam is cosmetic only.",
    priceTokens: 1850,
    color: 0x46f5ff,
    shape: "bowl",
  },
  {
    id: "chrome-burger",
    name: "Chrome Diner Burger",
    desc: "Classic comfort rebuilt with reflective buns and peppered synth-smoke.",
    profile: "Savory / Heavy",
    notes: "Pairs with a slow track. Aftertaste flagged as “nostalgic.”",
    priceTokens: 2400,
    color: 0xffe66b,
    shape: "stack",
  },
  {
    id: "signal-soda",
    name: "Signal Soda",
    desc: "Bubbles rise in perfect rhythm. The label knows your name.",
    profile: "Crisp / Bright",
    notes: "Flavor varies by district. Do not share without authorization.",
    priceTokens: 680,
    color: 0x8d72ff,
    shape: "can",
  },
  {
    id: "sunset-parfait",
    name: "Sunset Parfait",
    desc: "Layered light, chilled fruit, and a finish like a horizon band.",
    profile: "Sweet / Cool",
    notes: "Curator-approved for balcony viewing. Melts precisely on schedule.",
    priceTokens: 1600,
    color: 0xff6b6b,
    shape: "parfait",
  },
  {
    id: "arcade-skewer",
    name: "Arcade Skewer",
    desc: "Glazed bites on a glowing rod — street food with showroom lighting.",
    profile: "Spicy / Neon",
    notes: "Heat level locked to your profile. Consent is assumed in menus.",
    priceTokens: 2100,
    color: 0x2dff9d,
    shape: "skewer",
  },
];

let index = 0;

function formatTokens(n) {
  return `${n.toLocaleString()} TOK`;
}

function setUI(d) {
  titleEl.textContent = d.name;
  descEl.textContent = d.desc;
  tagEl.textContent = d.profile;
  notesEl.textContent = d.notes;
  orderBtn.textContent = `Order (${formatTokens(d.priceTokens)})`;
}

// --- Three.js ---
let width = stage.clientWidth || 900;
let height = stage.clientHeight || 600;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050011, 0.06);

const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 120);
camera.position.set(0, 3.2, 9.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(width, height);
renderer.setClearColor(0x050011, 0);
stage.appendChild(renderer.domElement);

const skyGeo = new THREE.SphereGeometry(80, 40, 26);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {
    topColor: { value: new THREE.Color(0xff00cc) },
    bottomColor: { value: new THREE.Color(0x050011) },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPosition = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    varying vec3 vWorldPosition;
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    void main() {
      float h = normalize(vWorldPosition).y * 0.5 + 0.5;
      vec3 col = mix(bottomColor, topColor, pow(h, 1.35));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

const grid = new THREE.GridHelper(90, 64, 0xff00ff, 0x00ffff);
grid.material.opacity = 0.45;
grid.material.transparent = true;
scene.add(grid);

const ambient = new THREE.AmbientLight(0xffaaff, 0.48);
scene.add(ambient);

const pink = new THREE.SpotLight(0xff37b9, 2.4, 65, Math.PI / 6, 0.4);
pink.position.set(-8, 12, 8);
pink.target.position.set(0, 2.0, 0);
scene.add(pink);
scene.add(pink.target);

const cyan = new THREE.SpotLight(0x46f5ff, 2.6, 65, Math.PI / 6, 0.4);
cyan.position.set(8, 12, 8);
cyan.target.position.set(0, 2.0, 0);
scene.add(cyan);
scene.add(cyan.target);

const carousel = new THREE.Group();
carousel.position.set(0, 1.2, 0);
scene.add(carousel);

function wire(hex, opacity = 0.9) {
  return new THREE.MeshBasicMaterial({
    color: hex,
    wireframe: true,
    transparent: true,
    opacity,
  });
}

function glow(hex) {
  return new THREE.MeshStandardMaterial({
    color: 0x0a031e,
    emissive: hex,
    emissiveIntensity: 1.25,
    metalness: 0.2,
    roughness: 0.6,
    transparent: true,
    opacity: 0.22,
  });
}

function makeDishMesh(d) {
  const g = new THREE.Group();
  const col = d.color;

  let geo;
  if (d.shape === "torus") geo = new THREE.TorusGeometry(0.9, 0.32, 12, 36);
  else if (d.shape === "bowl") geo = new THREE.SphereGeometry(0.95, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62);
  else if (d.shape === "stack") geo = new THREE.CylinderGeometry(0.85, 0.95, 1.35, 18);
  else if (d.shape === "can") geo = new THREE.CylinderGeometry(0.55, 0.55, 1.55, 18);
  else if (d.shape === "parfait") geo = new THREE.ConeGeometry(0.85, 1.8, 18, 1, true);
  else if (d.shape === "skewer") geo = new THREE.CapsuleGeometry(0.22, 2.0, 8, 16);
  else geo = new THREE.SphereGeometry(0.9, 18, 14);

  const mGlow = new THREE.Mesh(geo, glow(col));
  g.add(mGlow);

  const mWire = new THREE.Mesh(geo, wire(col, 0.95));
  g.add(mWire);

  // Accent plate ring
  const ringGeo = new THREE.TorusGeometry(1.45, 0.03, 10, 80);
  const ring = new THREE.Mesh(ringGeo, wire(col, 0.7));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.9;
  g.add(ring);

  return g;
}

const dishMeshes = dishes.map((d) => makeDishMesh(d));
for (const m of dishMeshes) carousel.add(m);

function layoutCarousel() {
  const radius = 4.2;
  for (let i = 0; i < dishMeshes.length; i++) {
    const angle = ((i - index) / dishMeshes.length) * Math.PI * 2;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const m = dishMeshes[i];
    m.position.set(x, 0, z);
    m.rotation.y = angle;
    const focus = i === index ? 1.0 : 0.55;
    m.scale.setScalar(focus);
  }
}

function select(nextIndex) {
  index = (nextIndex + dishes.length) % dishes.length;
  setUI(dishes[index]);
  layoutCarousel();
}

select(0);

// Input: wheel scroll changes selection
let wheelCooldownMs = 0;
stage.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (wheelCooldownMs > 0) return;
    wheelCooldownMs = 180;
    select(index + (e.deltaY > 0 ? 1 : -1));
  },
  { passive: false },
);

// Click selects closest dish to camera center (simple: choose current)
stage.addEventListener("click", () => {
  select(index);
});

randomBtn.addEventListener("click", () => {
  const next = Math.floor(Math.random() * dishes.length);
  select(next);
});

orderBtn.addEventListener("click", () => {
  const d = dishes[index];
  alert(
    `Order request queued: ${d.name}\nCost: ${formatTokens(d.priceTokens)}\n\nYour taste profile will be updated after consumption.`,
  );
});

let last = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;

  wheelCooldownMs = Math.max(0, wheelCooldownMs - dt * 1000);

  // Slow rotation per dish
  for (let i = 0; i < dishMeshes.length; i++) {
    dishMeshes[i].rotation.y += (i === index ? 0.55 : 0.2) * dt;
    dishMeshes[i].rotation.x = Math.sin(now * 0.001 + i) * 0.05;
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  const newWidth = stage.clientWidth || window.innerWidth || width;
  const newHeight = stage.clientHeight || window.innerHeight || height;
  width = newWidth;
  height = newHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

