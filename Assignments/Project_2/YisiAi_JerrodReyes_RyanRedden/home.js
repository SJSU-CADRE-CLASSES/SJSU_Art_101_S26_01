import * as THREE from "https://esm.sh/three@0.163.0";
import { CSS3DObject, CSS3DRenderer } from "https://esm.sh/three@0.163.0/examples/jsm/renderers/CSS3DRenderer.js";
import { EffectComposer } from "https://esm.sh/three@0.163.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://esm.sh/three@0.163.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://esm.sh/three@0.163.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "https://esm.sh/three@0.163.0/examples/jsm/postprocessing/ShaderPass.js";

const sceneRoot = document.getElementById("scene-root");
const navButtons = Array.from(document.querySelectorAll(".nav-btn"));
const entryPrompt = document.getElementById("entry-prompt");

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02070b, 0.015);

const camera = new THREE.PerspectiveCamera(
  52,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(0, 8, 54);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.domElement.className = "webgl-layer";
sceneRoot.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.22,
  0.4,
  0.65
);
composer.addPass(bloomPass);

const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 0.003 },
    radialModulation: { value: 1 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float radialModulation;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv - 0.5;
      float dist = length(uv);
      vec2 direction = normalize(uv);
      float amount = offset * radialModulation * dist;
      float r = texture2D(tDiffuse, vUv + direction * amount).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - direction * amount).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `
};
const chromaticPass = new ShaderPass(ChromaticAberrationShader);
chromaticPass.uniforms.offset.value = 0.0025;
composer.addPass(chromaticPass);

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.className = "css3d-layer";
sceneRoot.appendChild(cssRenderer.domElement);

const world = new THREE.Group();
scene.add(world);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const hoverOffset = new THREE.Vector2();

const targetCameraPosition = new THREE.Vector3();
const currentLookTarget = new THREE.Vector3(0, 4, 0);
const desiredLookTarget = new THREE.Vector3(0, 4, 0);
const tempWorldPosition = new THREE.Vector3();
const tempWorldDirection = new THREE.Vector3();
const tempNodeVelocity = new THREE.Vector3();
const neuralFieldConfig = {
  count: 68,
  maxConnections: 8,
  connectionDistance: 34,
  bounds: {
    x: 92,
    yMin: -4,
    yMax: 228,
    z: 92
  }
};
let atmosphericNetwork = null;
const haloPhraseBank = [
  "SHADOW MARKET",
  "GHOST PROTOCOL",
  "NULL ROUTE",
  "BLACK ICE",
  "SECTOR BREACH",
  "PHANTOM PAYLOAD",
  "DARKWIRE EXCHANGE",
  "ANON RELAY",
  "NEURAL SPOOF",
  "CONTRABAND INDEX",
  "TRACE EVADE",
  "SILENT EXFIL"
];
const haloTextTextureCache = new Map();
const overviewState = {
  label: "Overview",
  description: "A drifting command view of the shadow-market network.",
  position: new THREE.Vector3(0, 8, 54),
  target: new THREE.Vector3(0, 4, 0)
};
const introState = {
  label: "Access Gateway",
  description: "Acquire the core module from above, then enter the market to unlock node navigation.",
  position: new THREE.Vector3(0, 46, 8),
  target: new THREE.Vector3(0, 6, 0)
};
const introCameraLimits = {
  minY: 30,
  maxY: 204
};

let focusedStation = null;
let hasEnteredMarket = false;
let isHoveringCore = false;
let coreModule = null;
let introCameraHeight = introState.position.y;

const stationDefs = [
  {
    id: "marketplace",
    label: "Marketplace",
    href: "marketplace.html",
    description: "Contraband listings, anonymous sellers, and live deal flow orbiting the core.",
    color: 0x3fffdc,
    radius: 24,
    angle: -20,
    y: 4
  },
  {
    id: "wallet",
    label: "Wallet",
    href: "wallet.html",
    description: "Anonymous credit routing, fast transfers, and volatile balances.",
    color: 0xffcb69,
    radius: 28,
    angle: 55,
    y: 7
  },
  {
    id: "login",
    label: "Login",
    href: "login.html",
    description: "A neural checkpoint node for entering the market under a forged identity.",
    color: 0xff5a7a,
    radius: 26,
    angle: 138,
    y: 5
  },
  {
    id: "neural",
    label: "Neural Link",
    href: "neural_stream.html",
    description: "Nearby broadcasts, sync activity, and illicit nervous-system telemetry.",
    color: 0x77a6ff,
    radius: 29,
    angle: 220,
    y: 9
  },
  {
    id: "listing",
    label: "Featured Listing",
    href: "product5.html",
    description: "A premium cube focused on the Neural Ghost V.4 listing and its purchase flow.",
    color: 0xb17aff,
    radius: 25,
    angle: 300,
    y: 6
  }
];

const stations = stationDefs.map(createStation);
const rotatingRings = createBackgroundRings();
createLights();
createEnvironment();

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!hasEnteredMarket) {
      return;
    }

    const station = stations.find((item) => item.id === button.dataset.view);
    if (station) {
      focusStation(station);
    }
  });
});

sceneRoot.addEventListener("click", onSceneClick);
sceneRoot.addEventListener("wheel", onIntroWheel, { passive: false });
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("resize", onResize);
window.addEventListener("keydown", onKeydown);

document.body.classList.add("intro-mode");
animate();

function createLights() {
  const ambient = new THREE.AmbientLight(0xa7d8ff, 0.48);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0x8bfde3, 1.5);
  keyLight.position.set(16, 18, 20);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0xff5a7a, 26, 90, 2);
  rimLight.position.set(-26, 14, -18);
  scene.add(rimLight);

  const coreGlow = new THREE.PointLight(0x3fffdc, 32, 120, 2);
  coreGlow.position.set(0, 8, 0);
  scene.add(coreGlow);
}

function createEnvironment() {
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(48, 96),
    new THREE.MeshBasicMaterial({
      color: 0x051018,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3;
  world.add(floor);

  const grid = new THREE.GridHelper(120, 32, 0x4a4a4a, 0x3a3a3a);
  grid.position.y = -2.9;
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
  gridMaterials.forEach((material) => {
    material.transparent = true;
    material.opacity = 0.28;
  });
  world.add(grid);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.4, 1),
    new THREE.MeshPhysicalMaterial({
      color: 0x07161d,
      emissive: 0x3fffdc,
      emissiveIntensity: 1.25,
      metalness: 0.65,
      roughness: 0.24,
      transparent: true,
      opacity: 0.92
    })
  );
  core.position.set(0, 7, 0);
  core.name = "core";
  core.userData.isEntryCore = true;
  world.add(core);
  coreModule = core;

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(4.8, 0.12, 20, 120),
    new THREE.MeshBasicMaterial({
      color: 0x3fffdc,
      transparent: true,
      opacity: 0.6
    })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.copy(core.position);
  halo.name = "halo";
  world.add(halo);

  const starGeometry = new THREE.BufferGeometry();
  const starCount = 1200;
  const starPositions = new Float32Array(starCount * 3);

  for (let index = 0; index < starCount; index += 1) {
    const stride = index * 3;
    const radius = 65 + Math.random() * 80;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    starPositions[stride] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[stride + 1] = radius * Math.cos(phi) * 0.45;
    starPositions[stride + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));

  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0x8eefff,
      size: 0.35,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    })
  );
  world.add(stars);

  atmosphericNetwork = createAtmosphericNetwork();
  world.add(atmosphericNetwork.group);
}

function createAtmosphericNetwork() {
  const { count, maxConnections } = neuralFieldConfig;
  const maxSegments = count * maxConnections;
  const nodes = [];
  const pointPositions = new Float32Array(count * 3);
  const linePositions = new Float32Array(maxSegments * 6);
  const lineColors = new Float32Array(maxSegments * 6);

  for (let index = 0; index < count; index += 1) {
    const position = randomAtmosphericPosition();
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.08,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.08
    );

    nodes.push({
      position,
      velocity,
      phase: Math.random() * Math.PI * 2
    });

    const stride = index * 3;
    pointPositions[stride] = position.x;
    pointPositions[stride + 1] = position.y;
    pointPositions[stride + 2] = position.z;
  }

  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));

  const points = new THREE.Points(
    pointGeometry,
    new THREE.PointsMaterial({
      color: 0xa8fff3,
      size: 0.72,
      transparent: true,
      opacity: 0.82,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );

  const lineGeometry = new THREE.BufferGeometry();
  const linePositionAttribute = new THREE.BufferAttribute(linePositions, 3);
  const lineColorAttribute = new THREE.BufferAttribute(lineColors, 3);
  linePositionAttribute.setUsage(THREE.DynamicDrawUsage);
  lineColorAttribute.setUsage(THREE.DynamicDrawUsage);
  lineGeometry.setAttribute("position", linePositionAttribute);
  lineGeometry.setAttribute("color", lineColorAttribute);
  lineGeometry.setDrawRange(0, 0);

  const lines = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );

  const group = new THREE.Group();
  group.name = "atmospheric-network";
  group.add(lines);
  group.add(points);

  return {
    group,
    nodes,
    points,
    lines,
    pointPositions,
    linePositions,
    lineColors,
    maxSegments
  };
}

function randomAtmosphericPosition() {
  const { bounds } = neuralFieldConfig;
  return new THREE.Vector3(
    (Math.random() - 0.5) * bounds.x * 2,
    bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin),
    (Math.random() - 0.5) * bounds.z * 2
  );
}

function updateAtmosphericNetwork(elapsed) {
  if (!atmosphericNetwork) {
    return;
  }

  const { bounds, connectionDistance, maxConnections } = neuralFieldConfig;
  const {
    nodes,
    pointPositions,
    linePositions,
    lineColors,
    points,
    lines
  } = atmosphericNetwork;

  nodes.forEach((node, index) => {
    tempNodeVelocity.copy(node.velocity);
    tempNodeVelocity.x += Math.sin(elapsed * 0.37 + node.phase) * 0.0009;
    tempNodeVelocity.y += Math.cos(elapsed * 0.28 + node.phase) * 0.0005;
    tempNodeVelocity.z += Math.sin(elapsed * 0.41 + node.phase * 1.7) * 0.0009;
    tempNodeVelocity.clampLength(0.012, 0.09);
    node.velocity.copy(tempNodeVelocity);

    node.position.add(node.velocity);

    if (node.position.x < -bounds.x || node.position.x > bounds.x) {
      node.velocity.x *= -1;
      node.position.x = THREE.MathUtils.clamp(node.position.x, -bounds.x, bounds.x);
    }

    if (node.position.y < bounds.yMin || node.position.y > bounds.yMax) {
      node.velocity.y *= -1;
      node.position.y = THREE.MathUtils.clamp(node.position.y, bounds.yMin, bounds.yMax);
    }

    if (node.position.z < -bounds.z || node.position.z > bounds.z) {
      node.velocity.z *= -1;
      node.position.z = THREE.MathUtils.clamp(node.position.z, -bounds.z, bounds.z);
    }

    const stride = index * 3;
    pointPositions[stride] = node.position.x;
    pointPositions[stride + 1] = node.position.y;
    pointPositions[stride + 2] = node.position.z;
  });

  let segmentCount = 0;

  for (let aIndex = 0; aIndex < nodes.length; aIndex += 1) {
    let localConnections = 0;

    for (let bIndex = aIndex + 1; bIndex < nodes.length; bIndex += 1) {
      if (localConnections >= maxConnections) {
        break;
      }

      const distance = nodes[aIndex].position.distanceTo(nodes[bIndex].position);
      if (distance > connectionDistance) {
        continue;
      }

      const alpha = 1 - distance / connectionDistance;
      const baseOffset = segmentCount * 6;

      linePositions[baseOffset] = nodes[aIndex].position.x;
      linePositions[baseOffset + 1] = nodes[aIndex].position.y;
      linePositions[baseOffset + 2] = nodes[aIndex].position.z;
      linePositions[baseOffset + 3] = nodes[bIndex].position.x;
      linePositions[baseOffset + 4] = nodes[bIndex].position.y;
      linePositions[baseOffset + 5] = nodes[bIndex].position.z;

      const hueA = new THREE.Color().setHSL(0.48 + alpha * 0.06, 0.95, 0.62);
      const hueB = new THREE.Color().setHSL(0.56 + alpha * 0.04, 0.9, 0.58);

      lineColors[baseOffset] = hueA.r * alpha;
      lineColors[baseOffset + 1] = hueA.g * alpha;
      lineColors[baseOffset + 2] = hueA.b * alpha;
      lineColors[baseOffset + 3] = hueB.r * alpha;
      lineColors[baseOffset + 4] = hueB.g * alpha;
      lineColors[baseOffset + 5] = hueB.b * alpha;

      segmentCount += 1;
      localConnections += 1;
    }
  }

  points.geometry.attributes.position.needsUpdate = true;
  lines.geometry.attributes.position.needsUpdate = true;
  lines.geometry.attributes.color.needsUpdate = true;
  lines.geometry.setDrawRange(0, segmentCount * 2);
}

function createStation(def) {
  const station = {
    ...def,
    basePosition: polarPosition(def.radius, def.angle, def.y)
  };

  const group = new THREE.Group();
  group.position.copy(station.basePosition);
  group.userData.stationId = def.id;
  world.add(group);

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(10, 6.4, 3.2),
    createBoxMaterials(def.color)
  );
  box.userData.stationId = def.id;
  group.add(box);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(box.geometry),
    new THREE.LineBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.9
    })
  );
  edges.scale.setScalar(1.025);
  group.add(edges);

  const glowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 9),
    new THREE.MeshBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
  );
  glowPlane.position.z = 1.7;
  group.add(glowPlane);

  const strut = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 6, 8),
    new THREE.MeshBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.45
    })
  );
  strut.position.set(0, -6, 0);
  group.add(strut);

  const screenNode = buildScreenNode(def);
  const screenObject = new CSS3DObject(screenNode);
  screenObject.position.set(0, 0, 1.74);
  screenObject.scale.setScalar(0.01);
  group.add(screenObject);

  group.lookAt(0, group.position.y * 0.2, 0);

  station.group = group;
  station.box = box;
  station.edges = edges;
  station.glowPlane = glowPlane;
  station.screenNode = screenNode;
  station.screenObject = screenObject;
  station.floatPhase = Math.random() * Math.PI * 2;

  return station;
}

function createBoxMaterials(color) {
  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x07141c,
    emissive: color,
    emissiveIntensity: 0.38,
    metalness: 0.72,
    roughness: 0.24,
    transparent: true,
    opacity: 0.94
  });

  const frontMaterial = new THREE.MeshBasicMaterial({
    color: 0x041017,
    transparent: true,
    opacity: 0.16
  });

  return [
    shellMaterial,
    shellMaterial.clone(),
    shellMaterial.clone(),
    shellMaterial.clone(),
    frontMaterial,
    shellMaterial.clone()
  ];
}

function buildScreenNode(def) {
  const container = document.createElement("div");
  container.className = "screen-node";

  const topbar = document.createElement("div");
  topbar.className = "screen-topbar";
  topbar.innerHTML = `
    <span class="screen-title">${def.label}</span>
    <span class="screen-meta">${def.href}</span>
  `;

  const frame = document.createElement("div");
  frame.className = "screen-frame";

  const iframe = document.createElement("iframe");
  iframe.src = def.href;
  iframe.loading = "lazy";
  iframe.title = `${def.label} screen`;

  frame.appendChild(iframe);
  container.append(topbar, frame);

  return container;
}

function createHaloLabels(config, layerIndex) {
  const labels = [];
  const phrases = createHaloPhraseSequence(layerIndex, config.labelCount);
  const angleStep = (Math.PI * 2) / config.labelCount;

  for (let index = 0; index < config.labelCount; index += 1) {
    const text = phrases[index % phrases.length];
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(config.labelWidth, 1.55),
      new THREE.MeshBasicMaterial({
        map: getHaloTextTexture(text, config.color),
        transparent: true,
        opacity: config.opacity,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    const angle = index * angleStep;
    panel.position.set(
      Math.cos(angle) * config.radius,
      Math.sin(angle) * config.radius,
      0
    );
    panel.rotation.z = angle + Math.PI / 2;
    labels.push(panel);
  }

  return labels;
}

function createHaloPhraseSequence(layerIndex, count) {
  return Array.from({ length: count }, (_, index) => {
    const phrase = haloPhraseBank[(layerIndex * 3 + index) % haloPhraseBank.length];
    const sector = String((layerIndex * 37 + index * 19 + 1207) % 9999).padStart(4, "0");
    return `${phrase} // SECTOR-${sector}`;
  });
}

function getHaloTextTexture(text, color) {
  const cacheKey = `${color}:${text}`;
  const cached = haloTextTextureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = applyAlpha(color, 0.95);
  ctx.font = "700 44px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = applyAlpha(color, 0.5);
  ctx.shadowBlur = 18;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  haloTextTextureCache.set(cacheKey, texture);
  return texture;
}

function createBackgroundRings() {
  const ringConfigs = [
    {
      radius: 28,
      speed: 0.0028,
      color: 0xff4d4d,
      opacity: 0.72,
      y: 4.2,
      tiltX: -75,
      tiltY: 6,
      tiltZ: -10,
      labelCount: 12,
      labelWidth: 12
    },
    {
      radius: 37,
      speed: -0.0022,
      color: 0x4dff7a,
      opacity: 0.68,
      y: 7.1,
      tiltX: -75,
      tiltY: -4,
      tiltZ: 8,
      labelCount: 14,
      labelWidth: 11
    },
    {
      radius: 47,
      speed: 0.0016,
      color: 0x4d7aff,
      opacity: 0.64,
      y: 10.4,
      tiltX: -75,
      tiltY: 5,
      tiltZ: -6,
      labelCount: 16,
      labelWidth: 10
    }
  ];

  const mounts = [];
  for (let i = 0; i < ringConfigs.length; i += 1) {
    const config = ringConfigs[i];
    const mount = new THREE.Group();
    mount.position.set(0, config.y, 0);
    mount.rotation.set(
      THREE.MathUtils.degToRad(config.tiltX),
      THREE.MathUtils.degToRad(config.tiltY),
      THREE.MathUtils.degToRad(config.tiltZ)
    );

    const spinGroup = new THREE.Group();
    mount.add(spinGroup);

    const band = new THREE.Mesh(
      new THREE.TorusGeometry(config.radius, 0.2, 16, 96),
      new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: config.opacity * 0.4,
        side: THREE.DoubleSide
      })
    );
    band.rotation.x = Math.PI / 2;
    spinGroup.add(band);

    const labelPanels = createHaloLabels(config, i);
    labelPanels.forEach((panel) => spinGroup.add(panel));

    mount.userData.speed = config.speed;
    mount.userData.spinGroup = spinGroup;
    world.add(mount);
    mounts.push(mount);
  }

  return mounts;
}

function applyAlpha(hexColor, alpha) {
  const color = new THREE.Color(hexColor);
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function polarPosition(radius, angleDegrees, y) {
  const angle = THREE.MathUtils.degToRad(angleDegrees);
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    y,
    Math.sin(angle) * radius
  );
}

function focusStation(station) {
  if (!hasEnteredMarket) {
    return;
  }

  focusedStation = station;

  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === station.id);
  });

  stations.forEach((item) => {
    const isActive = item.id === station.id;
    item.screenNode.classList.toggle("active", isActive);
    item.box.material[4].opacity = isActive ? 0.05 : 0.16;
    item.glowPlane.material.opacity = isActive ? 0.2 : 0.08;
    item.edges.material.opacity = isActive ? 1 : 0.75;
    item.box.material.forEach((material, index) => {
      if (index !== 4) {
        material.emissiveIntensity = isActive ? 0.72 : 0.38;
      }
    });
  });

}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  hoverOffset.set(pointer.x, pointer.y);

  if (!hasEnteredMarket) {
    updateIntroHoverState();
  }
}

function onSceneClick(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  if (!hasEnteredMarket) {
    const coreHit = coreModule ? raycaster.intersectObject(coreModule, false) : [];
    if (coreHit.length > 0) {
      enterShadowMarket();
    }
    return;
  }

  const hits = raycaster.intersectObjects(stations.map((station) => station.box), false);
  if (hits.length > 0) {
    const stationId = hits[0].object.userData.stationId;
    const station = stations.find((item) => item.id === stationId);
    if (station) {
      focusStation(station);
    }
  }
}

function onKeydown(event) {
  if (document.activeElement?.tagName === "IFRAME") {
    return;
  }

  if (event.key === "Escape") {
    returnToIntroView();
    return;
  }

  if (!hasEnteredMarket) {
    return;
  }

  if (event.key === "1") {
    document.body.classList.toggle("hud-hidden");
    return;
  }

  const index = Number.parseInt(event.key, 10);
  if (!Number.isNaN(index) && stations[index - 1]) {
    focusStation(stations[index - 1]);
  }

  if (event.key.toLowerCase() === "o") {
    focusedStation = null;
    navButtons.forEach((button) => button.classList.remove("active"));
    stations.forEach((station) => {
      station.screenNode.classList.remove("active");
      station.glowPlane.material.opacity = 0.08;
      station.edges.material.opacity = 0.75;
      station.box.material[4].opacity = 0.16;
      station.box.material.forEach((material, materialIndex) => {
        if (materialIndex !== 4) {
          material.emissiveIntensity = 0.38;
        }
      });
    });
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  bloomPass.resolution.set(window.innerWidth, window.innerHeight);
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
}

function onIntroWheel(event) {
  if (hasEnteredMarket) {
    return;
  }

  event.preventDefault();

  const nextHeight = introCameraHeight + event.deltaY * 0.09;
  introCameraHeight = THREE.MathUtils.clamp(
    nextHeight,
    introCameraLimits.minY,
    introCameraLimits.maxY
  );
}

function updateStations(elapsed) {
  stations.forEach((station, index) => {
    const bob = Math.sin(elapsed * 0.7 + station.floatPhase + index) * 0.65;
    station.group.position.copy(station.basePosition);
    station.group.position.y += bob;
    station.group.lookAt(0, station.group.position.y * 0.2, 0);
  });
}

function updateEnvironment(elapsed) {
  const core = world.getObjectByName("core");
  const halo = world.getObjectByName("halo");

  if (core) {
    core.rotation.x = elapsed * 0.25;
    core.rotation.y = elapsed * 0.4;
    core.position.y = 7 + Math.sin(elapsed * 1.1) * 0.55;
    core.material.emissiveIntensity = isHoveringCore && !hasEnteredMarket ? 1.85 : 1.25;
  }

  if (halo && core) {
    halo.position.copy(core.position);
    halo.rotation.z = elapsed * 0.35;
  }

  rotatingRings.forEach((ring) => {
    ring.userData.spinGroup.rotation.z += ring.userData.speed;
  });

  updateAtmosphericNetwork(elapsed);
}

function updateCamera() {
  if (!hasEnteredMarket) {
    targetCameraPosition.set(
      introState.position.x,
      introCameraHeight,
      introState.position.z
    ).add(
      new THREE.Vector3(hoverOffset.x * 2.2, 0, hoverOffset.y * 1.4)
    );
    desiredLookTarget.copy(introState.target);
  } else if (focusedStation) {
    focusedStation.group.getWorldPosition(tempWorldPosition);
    tempWorldDirection.set(0, 0, 1).applyQuaternion(focusedStation.group.quaternion);

    targetCameraPosition.copy(tempWorldPosition)
      .addScaledVector(tempWorldDirection, 12)
      .add(new THREE.Vector3(hoverOffset.x * 1.2, hoverOffset.y * 0.8, 0));

    desiredLookTarget.copy(tempWorldPosition)
      .addScaledVector(tempWorldDirection, 1.1)
      .add(new THREE.Vector3(hoverOffset.x * 0.55, hoverOffset.y * 0.4, 0));
  } else {
    targetCameraPosition.copy(overviewState.position).add(
      new THREE.Vector3(hoverOffset.x * 1.8, hoverOffset.y * 1.1, 0)
    );
    desiredLookTarget.copy(overviewState.target);
  }

  camera.position.lerp(targetCameraPosition, 0.055);
  currentLookTarget.lerp(desiredLookTarget, 0.08);
  camera.lookAt(currentLookTarget);
}

function updateIntroHoverState() {
  if (!coreModule) {
    return;
  }

  raycaster.setFromCamera(pointer, camera);
  const coreHit = raycaster.intersectObject(coreModule, false);
  isHoveringCore = coreHit.length > 0;
  entryPrompt.hidden = !isHoveringCore;
  renderer.domElement.style.cursor = isHoveringCore ? "pointer" : "default";
}

function updateEntryPromptPosition() {
  if (!coreModule || entryPrompt.hidden) {
    return;
  }

  coreModule.getWorldPosition(tempWorldPosition);
  tempWorldPosition.project(camera);

  const x = (tempWorldPosition.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-tempWorldPosition.y * 0.5 + 0.5) * window.innerHeight - 64;

  entryPrompt.style.left = `${x}px`;
  entryPrompt.style.top = `${y}px`;
  entryPrompt.style.transform = "translate(-50%, -100%)";
}

function enterShadowMarket() {
  hasEnteredMarket = true;
  isHoveringCore = false;
  entryPrompt.hidden = true;
  renderer.domElement.style.cursor = "default";
  document.body.classList.remove("intro-mode");
  focusStation(stations[0]);
}

function returnToIntroView() {
  hasEnteredMarket = false;
  focusedStation = null;
  isHoveringCore = false;
  introCameraHeight = introState.position.y;
  entryPrompt.hidden = true;
  renderer.domElement.style.cursor = "default";
  document.body.classList.add("intro-mode");
  navButtons.forEach((button) => button.classList.remove("active"));
  stations.forEach((station) => {
    station.screenNode.classList.remove("active");
    station.glowPlane.material.opacity = 0.08;
    station.edges.material.opacity = 0.75;
    station.box.material[4].opacity = 0.16;
    station.box.material.forEach((material, materialIndex) => {
      if (materialIndex !== 4) {
        material.emissiveIntensity = 0.38;
      }
    });
  });
}

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  updateStations(elapsed);
  updateEnvironment(elapsed);
  updateCamera();
  updateEntryPromptPosition();

  composer.render();
  cssRenderer.render(scene, camera);
}
