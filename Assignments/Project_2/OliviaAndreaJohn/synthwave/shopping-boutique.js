import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

const stage = document.querySelector(".boutique-stage");
const itemsRoot = document.getElementById("boutique-items");
const tryOnOpenBtn = document.getElementById("tryon-open");
const buyBtn = document.getElementById("buy-btn");

if (!stage || !itemsRoot || !tryOnOpenBtn || !buyBtn) {
  throw new Error("Shopping boutique UI is missing required elements.");
}

// --- Data ---
const catalog = [
  {
    id: "pulse-coat",
    name: "Pulse Prism Coat",
    note: "Layered panels, luminous seams, chrome-quiet silhouette.",
    priceTokens: 24500,
    color: 0xff37b9,
  },
  {
    id: "grid-suit",
    name: "Gridline Suit",
    note: "Architected lines; formal enough for surveillance lounges.",
    priceTokens: 31900,
    color: 0x46f5ff,
  },
  {
    id: "neon-shell",
    name: "Neon Shell Hoodie",
    note: "Soft armor. Drawstring emits compliance-approved glow.",
    priceTokens: 18200,
    color: 0xffe66b,
  },
  {
    id: "mirror-set",
    name: "Mirror Track Set",
    note: "Reflective weave calibrated for camera-friendly contrast.",
    priceTokens: 27700,
    color: 0x8d72ff,
  },
];

let selectedId = catalog[0].id;

// --- Build list UI ---
function formatTokens(n) {
  return `${n.toLocaleString()} TOK`;
}

function renderList() {
  itemsRoot.innerHTML = "";
  for (const item of catalog) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `boutique-item${item.id === selectedId ? " is-active" : ""}`;
    btn.dataset.id = item.id;

    const name = document.createElement("div");
    name.className = "boutique-name";
    name.textContent = item.name;

    const price = document.createElement("div");
    price.className = "boutique-price";
    price.textContent = formatTokens(item.priceTokens);

    const note = document.createElement("p");
    note.className = "boutique-note";
    note.textContent = item.note;

    btn.appendChild(name);
    btn.appendChild(price);
    btn.appendChild(note);
    btn.addEventListener("click", () => {
      selectedId = item.id;
      renderList();
      applySelection(item);
    });

    itemsRoot.appendChild(btn);
  }
}

// --- Three.js scene ---
let width = stage.clientWidth || 900;
let height = stage.clientHeight || 600;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050011, 0.06);

const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 120);
camera.position.set(0, 2.2, 8.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(width, height);
renderer.setClearColor(0x050011, 0);
stage.appendChild(renderer.domElement);

// Sky / vibe
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

const grid = new THREE.GridHelper(80, 60, 0xff00ff, 0x00ffff);
grid.material.opacity = 0.55;
grid.material.transparent = true;
scene.add(grid);

const ambient = new THREE.AmbientLight(0xffaaff, 0.5);
scene.add(ambient);

const keyLight = new THREE.SpotLight(0x46f5ff, 3.0, 60, Math.PI / 6, 0.35);
keyLight.position.set(7, 12, 8);
keyLight.target.position.set(0, 2, 0);
scene.add(keyLight);
scene.add(keyLight.target);

const fillLight = new THREE.SpotLight(0xff37b9, 2.4, 60, Math.PI / 6, 0.4);
fillLight.position.set(-7, 10, 6);
fillLight.target.position.set(0, 1.5, 0);
scene.add(fillLight);
scene.add(fillLight.target);

// Outfit group (wireframe + glow)
const outfit = new THREE.Group();
outfit.position.set(0, 0, 0);
scene.add(outfit);

function wireMat(hex, opacity = 0.9) {
  return new THREE.MeshBasicMaterial({
    color: hex,
    wireframe: true,
    transparent: true,
    opacity,
  });
}

function glowMat(hex) {
  return new THREE.MeshStandardMaterial({
    color: 0x0a031e,
    emissive: hex,
    emissiveIntensity: 1.4,
    metalness: 0.2,
    roughness: 0.55,
    transparent: true,
    opacity: 0.22,
  });
}

function clearOutfit() {
  while (outfit.children.length) outfit.remove(outfit.children[0]);
}

function buildOutfit(style, colorHex) {
  clearOutfit();

  const body = new THREE.Group();
  outfit.add(body);

  // Gender-neutral mannequin-ish base
  const torsoGeo = new THREE.CapsuleGeometry(0.85, 1.35, 8, 18);
  const torso = new THREE.Mesh(torsoGeo, glowMat(colorHex));
  torso.position.set(0, 2.2, 0);
  body.add(torso);

  const torsoWire = new THREE.Mesh(torsoGeo, wireMat(colorHex, 0.95));
  torsoWire.position.copy(torso.position);
  body.add(torsoWire);

  const headGeo = new THREE.SphereGeometry(0.38, 16, 14);
  const head = new THREE.Mesh(headGeo, glowMat(colorHex));
  head.position.set(0, 3.55, 0);
  body.add(head);

  const headWire = new THREE.Mesh(headGeo, wireMat(colorHex, 0.95));
  headWire.position.copy(head.position);
  body.add(headWire);

  const hipGeo = new THREE.CapsuleGeometry(0.78, 0.55, 6, 16);
  const hips = new THREE.Mesh(hipGeo, glowMat(colorHex));
  hips.position.set(0, 1.35, 0);
  body.add(hips);

  const hipsWire = new THREE.Mesh(hipGeo, wireMat(colorHex, 0.95));
  hipsWire.position.copy(hips.position);
  body.add(hipsWire);

  // Style variations: add coat/hoodie/suit panels
  const panelMat = wireMat(colorHex, 0.85);

  if (style === "coat") {
    const coatGeo = new THREE.BoxGeometry(2.1, 2.1, 1.2);
    const coat = new THREE.Mesh(coatGeo, panelMat);
    coat.position.set(0, 2.1, 0.1);
    body.add(coat);
  } else if (style === "suit") {
    const lapelGeo = new THREE.BoxGeometry(1.75, 1.85, 1.05);
    const lapel = new THREE.Mesh(lapelGeo, panelMat);
    lapel.position.set(0, 2.25, 0.05);
    body.add(lapel);

    const stripeGeo = new THREE.TorusGeometry(0.98, 0.04, 10, 40);
    const stripe = new THREE.Mesh(stripeGeo, panelMat);
    stripe.rotation.x = Math.PI / 2;
    stripe.position.set(0, 2.05, 0.45);
    body.add(stripe);
  } else if (style === "hoodie") {
    const hoodGeo = new THREE.TorusGeometry(0.65, 0.16, 12, 36);
    const hood = new THREE.Mesh(hoodGeo, panelMat);
    hood.position.set(0, 3.25, -0.05);
    hood.rotation.x = Math.PI / 2;
    body.add(hood);

    const pocketGeo = new THREE.BoxGeometry(1.4, 0.55, 0.25);
    const pocket = new THREE.Mesh(pocketGeo, panelMat);
    pocket.position.set(0, 1.95, 0.55);
    body.add(pocket);
  } else if (style === "track") {
    const stripesGeo = new THREE.BoxGeometry(2.25, 2.0, 1.15);
    const stripes = new THREE.Mesh(stripesGeo, panelMat);
    stripes.position.set(0, 2.15, 0.05);
    body.add(stripes);

    const bandGeo = new THREE.TorusGeometry(0.92, 0.05, 10, 44);
    const band = new THREE.Mesh(bandGeo, panelMat);
    band.rotation.x = Math.PI / 2;
    band.position.set(0, 1.2, 0.42);
    body.add(band);
  }

  // Ground ring
  const ringGeo = new THREE.TorusGeometry(2.3, 0.03, 10, 80);
  const ring = new THREE.Mesh(ringGeo, wireMat(colorHex, 0.7));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.18;
  outfit.add(ring);
}

function applySelection(item) {
  const mapping = {
    "pulse-coat": "coat",
    "grid-suit": "suit",
    "neon-shell": "hoodie",
    "mirror-set": "track",
  };
  buildOutfit(mapping[item.id] || "coat", item.color);
  buyBtn.textContent = `Buy (${formatTokens(item.priceTokens)})`;
}

renderList();
applySelection(catalog[0]);

// Rotation (drag to spin)
let isDragging = false;
let lastX = 0;
let spin = 0.0;

stage.addEventListener("pointerdown", (e) => {
  isDragging = true;
  lastX = e.clientX;
});

window.addEventListener("pointerup", () => {
  isDragging = false;
});

window.addEventListener("pointermove", (e) => {
  if (!isDragging) return;
  const dx = e.clientX - lastX;
  lastX = e.clientX;
  spin += dx * 0.0035;
});

// --- Try-on modal (built + managed in JS so shopping.html stays simple) ---
const modal = document.createElement("div");
modal.className = "tryon-modal";
modal.innerHTML = `
  <div class="tryon-shell" role="dialog" aria-modal="true" aria-label="Try-on customizer">
    <div class="tryon-stage" id="tryon-stage"></div>
    <aside class="tryon-panel">
      <h3 class="tryon-title">Try-On Customizer</h3>
      <p class="tryon-desc">
        Rotate the character with mouse drag. Switch outfits below. Clothing is
        gender-neutral by design — the Waves prefer silhouettes, not labels.
      </p>
      <div class="tryon-row">
        <label>
          <span style="display:block; font-size:0.72rem; opacity:0.85; letter-spacing:0.14em; text-transform:uppercase; margin-bottom:0.35rem;">Outfit</span>
          <select class="tryon-select" id="tryon-outfit"></select>
        </label>
        <label>
          <span style="display:block; font-size:0.72rem; opacity:0.85; letter-spacing:0.14em; text-transform:uppercase; margin-bottom:0.35rem;">Colorway</span>
          <select class="tryon-select" id="tryon-color">
            <option value="ff37b9">Magenta Pulse</option>
            <option value="46f5ff">Cyan Grid</option>
            <option value="ffe66b">Signal Gold</option>
            <option value="8d72ff">Violet Mirror</option>
          </select>
        </label>
        <button class="boutique-btn" id="tryon-buy">Buy (tokens)</button>
      </div>
      <div style="margin-top:0.9rem; font-size:0.75rem; opacity:0.78; line-height:1.45;">
        Tip: if the fit feels “too perfect,” it is. The sector tailors for cameras first.
      </div>
    </aside>
    <button class="boutique-btn boutique-btn--ghost tryon-close" id="tryon-close" type="button">Close</button>
  </div>
`;
document.body.appendChild(modal);

const tryonStage = modal.querySelector("#tryon-stage");
const tryonSelect = modal.querySelector("#tryon-outfit");
const tryonColor = modal.querySelector("#tryon-color");
const tryonClose = modal.querySelector("#tryon-close");
const tryonBuy = modal.querySelector("#tryon-buy");

for (const item of catalog) {
  const opt = document.createElement("option");
  opt.value = item.id;
  opt.textContent = `${item.name} · ${formatTokens(item.priceTokens)}`;
  tryonSelect.appendChild(opt);
}

function openModal() {
  modal.classList.add("is-open");
  tryonSelect.value = selectedId;
  const current = catalog.find((c) => c.id === selectedId) || catalog[0];
  tryonBuy.textContent = `Buy (${formatTokens(current.priceTokens)})`;
  if (!tryonWorld) initTryonWorld();
  syncTryon();
}

function closeModal() {
  modal.classList.remove("is-open");
}

tryOnOpenBtn.addEventListener("click", openModal);
tryonClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

buyBtn.addEventListener("click", () => {
  const current = catalog.find((c) => c.id === selectedId) || catalog[0];
  alert(
    `Purchase request queued: ${current.name}\nCost: ${formatTokens(current.priceTokens)}\n\nTop up tokens to complete checkout.`,
  );
});

// --- Try-on 3D world ---
let tryonWorld = null;

function initTryonWorld() {
  const w = tryonStage.clientWidth || 800;
  const h = tryonStage.clientHeight || 600;

  const sc = new THREE.Scene();
  sc.fog = new THREE.FogExp2(0x050011, 0.07);

  const cam = new THREE.PerspectiveCamera(60, w / h, 0.1, 120);
  cam.position.set(0, 2.25, 7.8);

  const r = new THREE.WebGLRenderer({ antialias: true });
  r.setPixelRatio(window.devicePixelRatio || 1);
  r.setSize(w, h);
  r.setClearColor(0x050011, 1);
  tryonStage.appendChild(r.domElement);

  const amb = new THREE.AmbientLight(0xffaaff, 0.42);
  sc.add(amb);

  const pink = new THREE.SpotLight(0xff37b9, 2.4, 55, Math.PI / 6, 0.4);
  pink.position.set(-8, 12, 8);
  pink.target.position.set(0, 2.1, 0);
  sc.add(pink);
  sc.add(pink.target);

  const cyan = new THREE.SpotLight(0x46f5ff, 2.8, 55, Math.PI / 6, 0.4);
  cyan.position.set(8, 12, 7);
  cyan.target.position.set(0, 2.0, 0);
  sc.add(cyan);
  sc.add(cyan.target);

  const g = new THREE.GridHelper(70, 54, 0xff00ff, 0x00ffff);
  g.material.opacity = 0.45;
  g.material.transparent = true;
  sc.add(g);

  const avatar = new THREE.Group();
  avatar.position.set(0, 0, 0);
  sc.add(avatar);

  const outfitGroup = new THREE.Group();
  avatar.add(outfitGroup);

  function rebuild(outfitId, colorHex) {
    while (outfitGroup.children.length) outfitGroup.remove(outfitGroup.children[0]);
    const col = parseInt(colorHex, 16);

    // Neutral body base
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0a031e,
      emissive: col,
      emissiveIntensity: 0.28,
      metalness: 0.2,
      roughness: 0.7,
      transparent: true,
      opacity: 0.55,
    });
    const wire = new THREE.MeshBasicMaterial({
      color: col,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
    });

    const torsoGeo = new THREE.CapsuleGeometry(0.86, 1.4, 10, 20);
    const torso = new THREE.Mesh(torsoGeo, baseMat);
    torso.position.set(0, 2.25, 0);
    outfitGroup.add(torso);
    const torsoW = new THREE.Mesh(torsoGeo, wire);
    torsoW.position.copy(torso.position);
    outfitGroup.add(torsoW);

    const headGeo = new THREE.SphereGeometry(0.38, 18, 16);
    const head = new THREE.Mesh(headGeo, baseMat);
    head.position.set(0, 3.65, 0);
    outfitGroup.add(head);
    const headW = new THREE.Mesh(headGeo, wire);
    headW.position.copy(head.position);
    outfitGroup.add(headW);

    const legsGeo = new THREE.CapsuleGeometry(0.55, 1.1, 8, 18);
    const legL = new THREE.Mesh(legsGeo, baseMat);
    legL.position.set(-0.35, 0.9, 0);
    outfitGroup.add(legL);
    const legLW = new THREE.Mesh(legsGeo, wire);
    legLW.position.copy(legL.position);
    outfitGroup.add(legLW);
    const legR = new THREE.Mesh(legsGeo, baseMat);
    legR.position.set(0.35, 0.9, 0);
    outfitGroup.add(legR);
    const legRW = new THREE.Mesh(legsGeo, wire);
    legRW.position.copy(legR.position);
    outfitGroup.add(legRW);

    const variant = {
      "pulse-coat": "coat",
      "grid-suit": "suit",
      "neon-shell": "hoodie",
      "mirror-set": "track",
    }[outfitId];

    const accent = new THREE.MeshBasicMaterial({
      color: col,
      wireframe: true,
      transparent: true,
      opacity: 0.78,
    });

    if (variant === "coat") {
      const coatGeo = new THREE.BoxGeometry(2.2, 2.25, 1.25);
      const coat = new THREE.Mesh(coatGeo, accent);
      coat.position.set(0, 2.15, 0.12);
      outfitGroup.add(coat);
    } else if (variant === "suit") {
      const jacketGeo = new THREE.BoxGeometry(1.95, 2.0, 1.15);
      const jacket = new THREE.Mesh(jacketGeo, accent);
      jacket.position.set(0, 2.25, 0.06);
      outfitGroup.add(jacket);
      const tieGeo = new THREE.ConeGeometry(0.12, 0.55, 10);
      const tie = new THREE.Mesh(tieGeo, accent);
      tie.position.set(0, 2.35, 0.62);
      tie.rotation.x = Math.PI;
      outfitGroup.add(tie);
    } else if (variant === "hoodie") {
      const hoodGeo = new THREE.TorusGeometry(0.65, 0.16, 12, 36);
      const hood = new THREE.Mesh(hoodGeo, accent);
      hood.position.set(0, 3.25, -0.06);
      hood.rotation.x = Math.PI / 2;
      outfitGroup.add(hood);
      const pocketGeo = new THREE.BoxGeometry(1.45, 0.55, 0.25);
      const pocket = new THREE.Mesh(pocketGeo, accent);
      pocket.position.set(0, 2.0, 0.58);
      outfitGroup.add(pocket);
    } else if (variant === "track") {
      const topGeo = new THREE.BoxGeometry(2.25, 2.0, 1.2);
      const top = new THREE.Mesh(topGeo, accent);
      top.position.set(0, 2.15, 0.05);
      outfitGroup.add(top);
      const beltGeo = new THREE.TorusGeometry(0.92, 0.05, 10, 44);
      const belt = new THREE.Mesh(beltGeo, accent);
      belt.rotation.x = Math.PI / 2;
      belt.position.set(0, 1.25, 0.45);
      outfitGroup.add(belt);
    }
  }

  // Drag to rotate avatar
  let dragging = false;
  let x0 = 0;
  let yRot = 0;
  r.domElement.addEventListener("pointerdown", (e) => {
    dragging = true;
    x0 = e.clientX;
  });
  window.addEventListener("pointerup", () => {
    dragging = false;
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - x0;
    x0 = e.clientX;
    yRot += dx * 0.004;
  });

  const clock = new THREE.Clock();
  function loop() {
    if (!tryonWorld) return;
    requestAnimationFrame(loop);
    const dt = clock.getDelta();
    avatar.rotation.y = THREE.MathUtils.lerp(avatar.rotation.y, yRot, 6 * dt);
    r.render(sc, cam);
  }
  loop();

  window.addEventListener("resize", () => {
    if (!tryonWorld) return;
    const nw = tryonStage.clientWidth || w;
    const nh = tryonStage.clientHeight || h;
    cam.aspect = nw / nh;
    cam.updateProjectionMatrix();
    r.setSize(nw, nh);
  });

  tryonWorld = { rebuild };
}

function syncTryon() {
  const outfitId = tryonSelect.value || selectedId;
  const colorHex = tryonColor.value || "ff37b9";
  const current = catalog.find((c) => c.id === outfitId) || catalog[0];
  tryonBuy.textContent = `Buy (${formatTokens(current.priceTokens)})`;
  tryonWorld?.rebuild(outfitId, colorHex);
}

tryonSelect.addEventListener("change", () => {
  selectedId = tryonSelect.value;
  renderList();
  const current = catalog.find((c) => c.id === selectedId) || catalog[0];
  applySelection(current);
  syncTryon();
});

tryonColor.addEventListener("change", syncTryon);

tryonBuy.addEventListener("click", () => {
  const outfitId = tryonSelect.value || selectedId;
  const current = catalog.find((c) => c.id === outfitId) || catalog[0];
  alert(
    `Purchase request queued: ${current.name}\nCost: ${formatTokens(current.priceTokens)}\n\nTop up tokens to complete checkout.`,
  );
});

// Animate showroom outfit rotation
let last = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;

  outfit.rotation.y += (0.35 + Math.abs(spin) * 0.15) * dt;
  outfit.rotation.y += spin * dt;
  spin *= 0.92;

  // Gentle bob
  outfit.position.y = 0.05 + Math.sin(now * 0.001) * 0.06;

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

