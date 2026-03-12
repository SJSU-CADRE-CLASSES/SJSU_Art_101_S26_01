/**
 * 3D Underwater Environment — Deep ocean with seafloor, rocks, plants, fish
 * First-person navigation with PointerLockControls
 */

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const canvas = document.getElementById('canvas');
const prompt = document.getElementById('prompt');
const lightBtn = document.getElementById('light-btn');
const compassTicks = document.getElementById('compass-ticks');
const compassLibrary = document.getElementById('compass-library');

const PX_PER_DEG = 2;
const COMPASS_CENTER = 140;

let scene, camera, renderer, controls, playerLight;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let moveUp = false, moveDown = false;
let spotlightOn = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _toLibrary = new THREE.Vector3();
const MOVE_SPEED = 8;
const FISH = [];
const KELP = [];
let particlePos;
const LIBRARY_POSITION = new THREE.Vector3(55, 0, -45);

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x001a33);
  scene.fog = new THREE.FogExp2(0x001a33, 0.04);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 2, 10);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.4;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Player light (toggle with F) — PointLight for reliable illumination
  playerLight = new THREE.PointLight(0xaae5ff, 0, 30, 0.5);
  playerLight.castShadow = false;
  scene.add(playerLight);

  // Deep ocean lighting — dim, blue-green
  const ambient = new THREE.AmbientLight(0x1a3a4a, 0.15);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0x2d5a6a, 0.3);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  const hemi = new THREE.HemisphereLight(0x0a2a3a, 0x001520, 0.2);
  scene.add(hemi);

  // Seafloor
  const floorGeo = new THREE.PlaneGeometry(200, 200, 50, 50);
  const floorVerts = floorGeo.attributes.position;
  for (let i = 0; i < floorVerts.count; i++) {
    floorVerts.setZ(i, floorVerts.getZ(i) + (Math.random() - 0.5) * 2);
  }
  floorGeo.computeVertexNormals();

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x2a4a3a,
    roughness: 0.95,
    metalness: 0,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Rocks — clean icosahedrons with uniform scale, no per-vertex distortion
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x3a4a4a,
    roughness: 0.9,
    metalness: 0,
  });

  const rockShapes = [
    () => new THREE.IcosahedronGeometry(0.5, 0),
    () => new THREE.IcosahedronGeometry(0.5, 1),
    () => new THREE.OctahedronGeometry(0.5, 0),
    () => new THREE.DodecahedronGeometry(0.5, 0),
  ];

  for (let i = 0; i < 80; i++) {
    const geo = rockShapes[i % rockShapes.length]();
    const rock = new THREE.Mesh(geo, rockMat.clone());
    rock.castShadow = true;
    rock.receiveShadow = true;
    const s = 0.4 + Math.random() * 0.9;
    rock.scale.set(s, s * (0.85 + Math.random() * 0.3), s);
    rock.position.set(
      (Math.random() - 0.5) * 180,
      0,
      (Math.random() - 0.5) * 180
    );
    rock.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.2);
    scene.add(rock);
  }

  // Kelp plants — vertex deformation, rope-like ripples from base upward
  const kelpMat = new THREE.MeshStandardMaterial({
    color: 0x1a4a2a,
    roughness: 0.9,
    metalness: 0,
  });

  for (let i = 0; i < 120; i++) {
    const height = 1.5 + Math.random() * 3;
    const geo = new THREE.CylinderGeometry(0.02, 0.08, height, 6, 14);
    const pos = geo.attributes.position;
    const origPos = new Float32Array(pos.array.length);
    origPos.set(pos.array);

    const kelpMesh = new THREE.Mesh(geo, kelpMat.clone());
    kelpMesh.castShadow = true;
    kelpMesh.position.y = height / 2;

    const kelpGroup = new THREE.Group();
    kelpGroup.add(kelpMesh);
    kelpGroup.position.set(
      (Math.random() - 0.5) * 180,
      0,
      (Math.random() - 0.5) * 180
    );
    kelpGroup.userData = {
      height,
      origPos,
      freq: 0.0025 + Math.random() * 0.001,
      phase: Math.random() * Math.PI * 2,
      amp: 0.15 + Math.random() * 0.12,
      waveSpeed: 2 + Math.random() * 2,
    };
    scene.add(kelpGroup);
    KELP.push(kelpGroup);
  }

  // Fish — varied size and shape
  const fishColors = [0x4a6a5a, 0x3d5a4a, 0x5a7a6a, 0x2a4a3a, 0x6a8a7a];
  const fishMat = () => new THREE.MeshStandardMaterial({
    color: fishColors[Math.floor(Math.random() * fishColors.length)],
    roughness: 0.5 + Math.random() * 0.3,
    metalness: 0.05 + Math.random() * 0.15,
  });

  function createFish() {
    const types = [
      () => {
        const g = new THREE.SphereGeometry(0.12, 6, 6);
        const m = new THREE.Mesh(g, fishMat());
        m.scale.set(1.8, 0.4, 0.6);
        return m;
      },
      () => {
        const g = new THREE.SphereGeometry(0.2, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const m = new THREE.Mesh(g, fishMat());
        m.scale.set(1.2, 0.7, 0.5);
        return m;
      },
      () => {
        const g = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6);
        const m = new THREE.Mesh(g, fishMat());
        m.scale.set(1, 1, 2.5);
        m.rotation.x = Math.PI / 2;
        return m;
      },
      () => {
        const g = new THREE.SphereGeometry(0.15, 6, 6);
        const m = new THREE.Mesh(g, fishMat());
        m.scale.set(0.8, 1.8, 0.4);
        return m;
      },
      () => {
        const g = new THREE.ConeGeometry(0.1, 0.4, 6);
        const m = new THREE.Mesh(g, fishMat());
        m.scale.set(1.2, 1, 1.5);
        m.rotation.x = -Math.PI / 2;
        return m;
      },
      () => {
        const g = new THREE.SphereGeometry(0.25, 8, 8);
        const m = new THREE.Mesh(g, fishMat());
        m.scale.set(1.5, 0.5, 0.5);
        return m;
      },
      () => {
        const g = new THREE.DodecahedronGeometry(0.08, 0);
        const m = new THREE.Mesh(g, fishMat());
        m.scale.set(2, 0.5, 1);
        return m;
      },
    ];
    const body = types[Math.floor(Math.random() * types.length)]();
    const scale = 0.3 + Math.random() * 1.4;
    body.scale.multiplyScalar(scale);
    const group = new THREE.Group();
    group.add(body);
    group.userData = {
      speed: (0.8 + Math.random() * 1.5) * (scale < 0.6 ? 1.3 : scale > 1.2 ? 0.7 : 1),
      angle: Math.random() * Math.PI * 2,
    };
    return group;
  }

  for (let i = 0; i < 70; i++) {
    const fish = createFish();
    fish.traverse((c) => { if (c.isMesh) c.castShadow = true; });
    fish.position.set(
      (Math.random() - 0.5) * 180,
      0.5 + Math.random() * 3,
      (Math.random() - 0.5) * 180
    );
    scene.add(fish);
    FISH.push(fish);
  }

  // Library boulder — very large landmark
  const libraryGeo = new THREE.IcosahedronGeometry(4, 2);
  const libraryMat = new THREE.MeshStandardMaterial({
    color: 0x2a3a3a,
    roughness: 0.9,
    metalness: 0,
  });
  const libraryBoulder = new THREE.Mesh(libraryGeo, libraryMat);
  libraryBoulder.position.copy(LIBRARY_POSITION);
  libraryBoulder.scale.set(1.2, 1, 0.9);
  libraryBoulder.rotation.set(0.1, 0.5, 0.05);
  libraryBoulder.castShadow = true;
  libraryBoulder.receiveShadow = true;
  libraryBoulder.name = 'library';
  scene.add(libraryBoulder);

  // Float particles (plankton)
  const particleCount = 80;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 200;
    positions[i + 1] = Math.random() * 15;
    positions[i + 2] = (Math.random() - 0.5) * 200;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x2a5a4a,
    size: 0.15,
    transparent: true,
    opacity: 0.4,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);
  particlePos = particleGeo.attributes.position;

  // Controls
  controls = new PointerLockControls(camera, document.body);
  controls.pointerSpeed = 0.5;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  document.body.addEventListener('click', () => {
    if (!controls.isLocked) {
      controls.lock();
      prompt.style.opacity = '0';
    }
  });

  controls.addEventListener('unlock', () => {
    prompt.style.opacity = '1';
  });

  // Keyboard — use window + capture so F works even when pointer locked
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);

  // Light toggle button (fallback)
  lightBtn.addEventListener('click', () => {
    spotlightOn = !spotlightOn;
    playerLight.intensity = spotlightOn ? 15 : 0;
    renderer.toneMappingExposure = spotlightOn ? 0.7 : 0.4;
    lightBtn.textContent = spotlightOn ? 'Light: ON' : 'Light: OFF';
    lightBtn.classList.toggle('on', spotlightOn);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Build compass ticks — 360° strip, tick every 10°, cardinals (0=S, 90=E, 180=N, 270=W)
  const cardinals = { 0: 'S', 90: 'E', 180: 'N', 270: 'W' };
  for (let deg = 0; deg < 360; deg += 10) {
    const tick = document.createElement('div');
    tick.className = 'compass-tick ' + (cardinals[deg] ? 'cardinal' : 'small');
    tick.style.left = deg * PX_PER_DEG + 'px';
    if (cardinals[deg]) tick.dataset.dir = cardinals[deg];
    compassTicks.appendChild(tick);
  }
}

function onKeyDown(e) {
  if (e.code === 'KeyF' || e.code === 'KeyL' || e.key === 'f' || e.key === 'F' || e.key === 'l' || e.key === 'L') {
    if (!e.repeat) {
      e.preventDefault();
      spotlightOn = !spotlightOn;
      playerLight.intensity = spotlightOn ? 15 : 0;
      renderer.toneMappingExposure = spotlightOn ? 0.7 : 0.4;
      lightBtn.textContent = spotlightOn ? 'Light: ON' : 'Light: OFF';
      lightBtn.classList.toggle('on', spotlightOn);
    }
    return;
  }
  switch (e.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
    case 'Space': moveUp = true; break;
    case 'ShiftLeft': moveDown = true; break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyD': moveRight = false; break;
    case 'Space': moveUp = false; break;
    case 'ShiftLeft': moveDown = false; break;
  }
}

function updateMovement(delta) {
  if (!controls.isLocked) return;

  velocity.x -= velocity.x * 5.0 * delta;
  velocity.y -= velocity.y * 5.0 * delta;
  velocity.z -= velocity.z * 5.0 * delta;

  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.y = Number(moveUp) - Number(moveDown);
  direction.normalize();

  if (moveForward || moveBackward) velocity.z -= direction.z * MOVE_SPEED * delta;
  if (moveLeft || moveRight) velocity.x -= direction.x * MOVE_SPEED * delta;
  if (moveUp || moveDown) velocity.y += direction.y * MOVE_SPEED * delta;

  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);
  camera.position.y += velocity.y * delta;

  camera.position.y = Math.max(0.5, Math.min(15, camera.position.y));
}

function animate(time) {
  requestAnimationFrame(animate);
  time = time ?? performance.now();
  const delta = Math.min(0.05, 0.016);

  updateMovement(delta);

  // Player light follows camera
  playerLight.position.copy(camera.position);

  // Kelp rope deformation — ripples propagate from base up, vertex displacement
  KELP.forEach((kelp) => {
    const mesh = kelp.children[0];
    const pos = mesh.geometry.attributes.position;
    const orig = kelp.userData.origPos;
    const h = kelp.userData.height;
    const freq = kelp.userData.freq;
    const phase = kelp.userData.phase;
    const amp = kelp.userData.amp;
    const waveSpeed = kelp.userData.waveSpeed;

    for (let i = 0; i < pos.count; i++) {
      const y = orig[i * 3 + 1];
      const t = (y + h / 2) / h;
      const swayX = amp * Math.sin(time * freq + t * waveSpeed + phase) * t;
      const swayZ = amp * Math.cos(time * freq * 0.8 + t * waveSpeed * 1.1 + phase + 1.2) * t;
      pos.setX(i, orig[i * 3 + 0] + swayX);
      pos.setZ(i, orig[i * 3 + 2] + swayZ);
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  });

  // Fish swim
  FISH.forEach((fish, i) => {
    fish.userData.angle += delta * fish.userData.speed * 0.5;
    fish.position.x += Math.sin(fish.userData.angle) * delta * 2;
    fish.position.z += Math.cos(fish.userData.angle) * delta * 2;
    fish.rotation.y = -fish.userData.angle;
    fish.position.x = ((fish.position.x + 100) % 200) - 100;
    fish.position.z = ((fish.position.z + 100) % 200) - 100;
  });

  // Particle drift
  for (let i = 0; i < particlePos.count; i++) {
    particlePos.setY(i, (particlePos.getY(i) + delta * 0.2) % 15);
  }
  particlePos.needsUpdate = true;

  // Compass — rotate ticks, position library icon when in view
  camera.getWorldDirection(_forward);
  _forward.y = 0;
  _forward.normalize();
  const heading = (Math.atan2(_forward.x, _forward.z) * 180 / Math.PI + 360) % 360;
  compassTicks.style.transform = `translateX(${360 - heading * PX_PER_DEG}px)`;

  _toLibrary.subVectors(LIBRARY_POSITION, camera.position);
  _toLibrary.y = 0;
  _toLibrary.normalize();
  const libAngle = (Math.atan2(_toLibrary.x, _toLibrary.z) * 180 / Math.PI + 360) % 360;
  let relAngle = ((libAngle - heading + 540) % 360) - 180;
  const inView = Math.abs(relAngle) < 70;
  compassLibrary.classList.toggle('visible', inView);
  if (inView) {
    compassLibrary.style.left = (COMPASS_CENTER + relAngle * PX_PER_DEG) + 'px';
  }

  renderer.render(scene, camera);
}

init();
animate();
