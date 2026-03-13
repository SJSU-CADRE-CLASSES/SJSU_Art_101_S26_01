import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Murakami-inspired artwork (drawn in-code: superflat flowers, bold outlines, bright colors)
const ART = [
  { title: 'Smiling Flower', desc: 'Takashi Murakami — Multicolor smiling flower, superflat.', pattern: 'flower', palette: ['#FF69B4', '#FFD700', '#00CED1', '#000'] },
  { title: 'Flower Ball', desc: 'Murakami-inspired flower ball. Repetition and flat color.', pattern: 'flowerball', palette: ['#FF1493', '#FFFF00', '#000'] },
  { title: 'Rainbow Flowers', desc: 'Grid of smiling flowers in the style of Murakami.', pattern: 'flowers', palette: ['#FF6B9D', '#C71585', '#FFD700', '#000'] },
  { title: 'Dob', desc: 'Murakami — Mr. DOB character-inspired eyes and smile.', pattern: 'dob', palette: ['#FF69B4', '#4169E1', '#000'] },
  { title: 'Superflat Field', desc: 'Flat color field with simple flower motif.', pattern: 'field', palette: ['#87CEEB', '#98FB98', '#FFB6C1', '#000'] },
  { title: 'Kaikai Kiki', desc: 'Playful eyes and flowers, Murakami studio style.', pattern: 'eyes', palette: ['#FFD700', '#FF6347', '#000'] },
];

/** Draws a single smiling flower (Murakami-style) at (cx, cy) with radius r. */
function drawSmileyFlower(ctx, cx, cy, r, petalColors, outline, lineW) {
  const petals = 8;
  ctx.lineWidth = lineW;
  ctx.strokeStyle = outline;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2 - Math.PI / 2;
    ctx.fillStyle = petalColors[i % petalColors.length];
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, r * 0.5, r * 0.25, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(cx - r * 0.12, cy - r * 0.05, r * 0.08, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.12, cy - r * 0.05, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.1, r * 0.06, 0, Math.PI);
  ctx.stroke();
}

/** Murakami-style art on canvas; returns Three.js CanvasTexture. */
function makeMurakamiTexture(width, height, art) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const w = width;
  const h = height;
  const pal = art.palette || ['#FF69B4', '#FFD700', '#000'];

  if (art.pattern === 'flower') {
    ctx.fillStyle = pal[2] || '#1a1a2e';
    ctx.fillRect(0, 0, w, h);
    drawSmileyFlower(ctx, w / 2, h / 2, Math.min(w, h) * 0.35, pal.slice(0, -1), '#000', 3);
  } else if (art.pattern === 'flowerball') {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const count = 12;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + 0.3;
      const cx = w / 2 + Math.cos(a) * w * 0.32;
      const cy = h / 2 + Math.sin(a) * h * 0.32;
      drawSmileyFlower(ctx, cx, cy, Math.min(w, h) * 0.12, pal.slice(0, -1), '#000', 2);
    }
    drawSmileyFlower(ctx, w / 2, h / 2, Math.min(w, h) * 0.2, pal.slice(0, -1), '#000', 2);
  } else if (art.pattern === 'flowers') {
    ctx.fillStyle = pal[0];
    ctx.fillRect(0, 0, w, h);
    const cols = 4, rows = 3;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = (col + 0.5) * (w / cols);
        const cy = (row + 0.5) * (h / rows);
        drawSmileyFlower(ctx, cx, cy, Math.min(w / cols, h / rows) * 0.35, pal.slice(1), '#000', 1.5);
      }
    }
  } else if (art.pattern === 'dob') {
    ctx.fillStyle = pal[0];
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.25;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.6, cy - r * 0.2, r * 0.5, r * 0.6, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.6, cy - r * 0.2, r * 0.5, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.6, cy - r * 0.2, r * 0.25, r * 0.35, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.6, cy - r * 0.2, r * 0.25, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.5, r * 0.4, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  } else if (art.pattern === 'field') {
    ctx.fillStyle = pal[0];
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = pal[1];
    ctx.fillRect(0, 0, w, h / 2);
    drawSmileyFlower(ctx, w / 2, h * 0.6, Math.min(w, h) * 0.2, pal.slice(2), '#000', 2);
  } else if (art.pattern === 'eyes') {
    ctx.fillStyle = pal[0];
    ctx.fillRect(0, 0, w, h);
    const eyeR = Math.min(w, h) * 0.15;
    for (let i = 0; i < 6; i++) {
      const cx = w / 2 + (i % 3 - 1) * (w / 3);
      const cy = h / 2 + (Math.floor(i / 3) - 0.5) * (h / 2);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, eyeR, eyeR * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(cx, cy, eyeR * 0.5, eyeR * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    drawSmileyFlower(ctx, w / 2, h * 0.75, eyeR * 1.2, [pal[1]], '#000', 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Canvas-generated wall texture (subtle plaster/concrete). Tiles with repeat. */
function makeWallTexture(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const base = '#f5f5f0';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // Subtle variation (plaster feel)
  const id = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = Math.floor(12 * (Math.random() - 0.5));
    id.data[i] = Math.min(255, Math.max(0, 0xf5 + v));
    id.data[i + 1] = Math.min(255, Math.max(0, 0xf5 + v));
    id.data[i + 2] = Math.min(255, Math.max(0, 0xf0 + v));
    id.data[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  // Very faint vertical lines (joints)
  ctx.strokeStyle = 'rgba(0,0,0,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= size; x += size / 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  return tex;
}

// Collision bounds (room: roomW=12, roomD=10, wallThick=0.2; player radius 0.35)
const PLAYER_RADIUS = 0.35;
const BOUNDS_X_MIN = -(12 / 2 + 0.2 / 2) + PLAYER_RADIUS;
const BOUNDS_X_MAX = (12 / 2 + 0.2 / 2) - PLAYER_RADIUS;
const BOUNDS_Z_MIN = -(10 / 2 + 0.2 / 2) + PLAYER_RADIUS;
const BOUNDS_Z_MAX = (10 / 2 + 0.2 / 2) - PLAYER_RADIUS;
const SCULPTURE_CENTER_X = 0;
const SCULPTURE_CENTER_Z = 0;
const SCULPTURE_RADIUS = 0.85 + PLAYER_RADIUS;
const SCULPTURE_Y_MIN = 0;
const SCULPTURE_Y_MAX = 1.0;

let scene, camera, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
const clock = new THREE.Clock();
let interactables = [];
let laserHitTargets = []; // meshes the laser raycast hits (walls, floor, sculpture, frames)
let wallRefs = { back: null, left: null, right: null }; // for hole collision checks
let infoPanel, infoTitle, infoDesc, clickPrompt;
const HOLE_RADIUS = 0.45; // radius of hole punched in wall (one shot = walk-through)
const HOLE_EXTENT = 1.5; // how far past the wall the player can go when in a hole
const WALL_CENTER_Y = 2; // roomH/2 — wall local Y = world Y - this
const laserBeams = [];
const LASER_MAX_DIST = 25;
const LASER_DURATION = 0.12;
const LASER_RADIUS = 0.025;

/** Sky gradient texture so holes in walls show environment. */
function makeSkyBackground() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#1a2a4a');
  grad.addColorStop(0.4, '#4a7cb8');
  grad.addColorStop(0.7, '#87ceeb');
  grad.addColorStop(1, '#c8dce8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function init() {
  scene = new THREE.Scene();
  scene.background = makeSkyBackground();
  scene.fog = new THREE.Fog(0x2a2a32, 12, 28);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.6, 4);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  controls = new PointerLockControls(camera, document.body);
  controls.pointerSpeed = 2; // look sensitivity (default 1)

  // Lights
  const ambient = new THREE.AmbientLight(0xa0a0b8, 1.0);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 1.4);
  dir.position.set(4, 10, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 1024;
  dir.shadow.mapSize.height = 1024;
  dir.shadow.camera.near = 0.5;
  dir.shadow.camera.far = 30;
  dir.shadow.camera.left = -8;
  dir.shadow.camera.right = 8;
  dir.shadow.camera.top = 8;
  dir.shadow.camera.bottom = -8;
  scene.add(dir);

  buildGallery();
  setupInteraction();

  // Click anywhere (including on the canvas) to lock pointer and enable camera
  document.body.addEventListener('click', () => {
    if (!controls.isLocked) {
      controls.lock();
    }
  });
  controls.addEventListener('lock', () => {
    document.getElementById('click-prompt').style.display = 'none';
  });
  controls.addEventListener('unlock', () => {
    document.getElementById('click-prompt').style.display = 'block';
  });

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onResize);
  window.addEventListener('click', onMouseClick);

  animate();
}

function buildGallery() {
  const roomW = 12, roomD = 10, roomH = 4;
  const wallThick = 0.2;
  const floorGeo = new THREE.PlaneGeometry(roomW + wallThick * 2, roomD + wallThick * 2);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x5a5550,
    roughness: 0.9,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  laserHitTargets.push(floor);

  const wallTex = makeWallTexture(256);
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.05,
  });

  const backW = roomW + wallThick * 2, backH = roomH;
  const sideW = roomD + wallThick * 2, sideH = roomH;
  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(backW, backH),
    wallMat
  );
  backWall.position.set(0, roomH / 2, -(roomD / 2 + wallThick / 2));
  backWall.receiveShadow = true;
  backWall.userData.wallType = 'back';
  backWall.userData.holes = [];
  backWall.userData.width = backW;
  backWall.userData.height = backH;
  scene.add(backWall);
  laserHitTargets.push(backWall);
  wallRefs.back = backWall;

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(sideW, sideH), wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-(roomW / 2 + wallThick / 2), roomH / 2, 0);
  leftWall.receiveShadow = true;
  leftWall.userData.wallType = 'left';
  leftWall.userData.holes = [];
  leftWall.userData.width = sideW;
  leftWall.userData.height = sideH;
  scene.add(leftWall);
  laserHitTargets.push(leftWall);
  wallRefs.left = leftWall;

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(sideW, sideH), wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(roomW / 2 + wallThick / 2, roomH / 2, 0);
  rightWall.receiveShadow = true;
  rightWall.userData.wallType = 'right';
  rightWall.userData.holes = [];
  rightWall.userData.height = sideH;
  rightWall.userData.width = sideW;
  scene.add(rightWall);
  laserHitTargets.push(rightWall);
  wallRefs.right = rightWall;

  // Center sculpture on the floor (primitive 3D model, no external files)
  const centerSculpture = new THREE.Group();
  const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x3a3835, roughness: 0.6, metalness: 0.15 });
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.7, 0.15, 24),
    pedestalMat
  );
  pedestal.position.y = 0.075;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  centerSculpture.add(pedestal);

  const sculptMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d5, roughness: 0.5, metalness: 0.1 });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 32), sculptMat);
  sphere.position.set(0, 0.15 + 0.35, 0);
  sphere.castShadow = true;
  centerSculpture.add(sphere);

  const box1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.25), sculptMat);
  box1.position.set(0.25, 0.15 + 0.25, 0.2);
  box1.rotation.y = 0.4;
  box1.castShadow = true;
  centerSculpture.add(box1);

  const box2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.2), sculptMat);
  box2.position.set(-0.2, 0.15 + 0.175, -0.15);
  box2.rotation.y = -0.3;
  box2.rotation.z = 0.1;
  box2.castShadow = true;
  centerSculpture.add(box2);

  centerSculpture.position.set(0, 0, 0);
  scene.add(centerSculpture);
  centerSculpture.traverse((o) => { if (o.isMesh) laserHitTargets.push(o); });

  const frameDepth = 0.08;
  const frameWidth = 2.2;
  const frameHeight = 1.6;
  const frameColor = 0x6b645c;
  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.7, metalness: 0.1 });

  ART.forEach((art, i) => {
    const frameGroup = new THREE.Group();

    const frameBorder = 0.12;
    const canvasW = frameWidth - frameBorder * 2;
    const canvasH = frameHeight - frameBorder * 2;

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, frameHeight, frameDepth),
      frameMat
    );
    frame.castShadow = true;
    frame.receiveShadow = true;
    frameGroup.add(frame);

    const tex = makeMurakamiTexture(256, 256, art);
    const canvasMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.8,
      metalness: 0.05,
    });
    const canvas = new THREE.Mesh(
      new THREE.PlaneGeometry(canvasW, canvasH),
      canvasMat
    );
    canvas.position.z = frameDepth / 2 + 0.002;
    canvas.castShadow = true;
    canvas.userData = { title: art.title, desc: art.desc };
    frameGroup.add(canvas);

    interactables.push(canvas);

    const cols = 3;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const startX = -roomW / 2 + roomW / (cols + 1);
    const spacingX = roomW / (cols + 1);
    const startZ = -roomD / 2 + roomD / 4;
    const spacingZ = roomD / 3;

    frameGroup.position.set(
      startX + col * spacingX - roomW / 6,
      roomH - frameHeight / 2 - 0.4,
      startZ + row * spacingZ
    );
    scene.add(frameGroup);
    frameGroup.traverse((o) => { if (o.isMesh) laserHitTargets.push(o); });
  });
}

function setupInteraction() {
  infoPanel = document.getElementById('info-panel');
  infoTitle = document.getElementById('info-title');
  infoDesc = document.getElementById('info-desc');
  clickPrompt = document.getElementById('click-prompt');
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onMouseClick() {
  if (!controls.isLocked) return;
  pointer.set(0, 0);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(interactables, true);
  if (hits.length > 0) {
    const obj = hits[0].object;
    if (obj.userData.title) {
      infoTitle.textContent = obj.userData.title;
      infoDesc.textContent = obj.userData.desc;
      infoPanel.classList.add('visible');
    }
  } else {
    infoPanel.classList.remove('visible');
  }
}

/** Creates plane geometry with circular holes (for walls). Uses 32-segment circles so holes stay round. */
function createWallGeometryWithHoles(width, height, holes) {
  const w2 = width / 2, h2 = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-w2, -h2);
  shape.lineTo(w2, -h2);
  shape.lineTo(w2, h2);
  shape.lineTo(-w2, h2);
  shape.closePath();
  const segments = 32; // smooth circles so multiple holes don't look amoeboid
  for (const h of holes) {
    const holePath = new THREE.Path();
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const px = h.localX + h.radius * Math.cos(a);
      const py = h.localY + h.radius * Math.sin(a);
      if (i === 0) holePath.moveTo(px, py);
      else holePath.lineTo(px, py);
    }
    holePath.closePath();
    shape.holes.push(holePath);
  }
  return new THREE.ShapeGeometry(shape);
}

/** Punches a hole in a wall mesh at the hit point and updates collision. */
function addHoleToWall(wall, hit) {
  const local = hit.point.clone();
  wall.worldToLocal(local);
  wall.userData.holes.push({
    localX: local.x,
    localY: local.y,
    radius: HOLE_RADIUS,
  });
  if (wall.geometry) wall.geometry.dispose();
  wall.geometry = createWallGeometryWithHoles(
    wall.userData.width,
    wall.userData.height,
    wall.userData.holes
  );
}

/** True if (u,v) in wall local space is inside any hole. */
function isInsideWallHole(wall, u, v) {
  if (!wall || !wall.userData || !wall.userData.holes) return false;
  const holes = wall.userData.holes;
  const tolerance = 1.05; // slight margin so player doesn't get stuck on edge
  for (const h of holes) {
    const d2 = (u - h.localX) ** 2 + (v - h.localY) ** 2;
    if (d2 <= (h.radius * tolerance) ** 2) return true;
  }
  return false;
}

function fireLaser() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  // Start beam slightly in front of and below the camera so it's visible (like from chest/gun)
  const startOffset = 0.5;
  const downOffset = 0.35;
  const down = new THREE.Vector3(0, -1, 0).applyQuaternion(camera.quaternion);
  const origin = camera.position.clone()
    .add(direction.clone().multiplyScalar(startOffset))
    .add(down.clone().multiplyScalar(downOffset));
  // Raycast to find where the laser hits (wall, floor, sculpture, frame)
  const laserRaycaster = new THREE.Raycaster();
  laserRaycaster.set(origin, direction);
  const hits = laserRaycaster.intersectObjects(laserHitTargets, true);
  const length = hits.length > 0 && hits[0].distance < LASER_MAX_DIST
    ? hits[0].distance
    : LASER_MAX_DIST;
  const laserGeo = new THREE.CylinderGeometry(LASER_RADIUS, LASER_RADIUS, length, 8);
  const laserMat = new THREE.MeshBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.95,
  });
  const beam = new THREE.Mesh(laserGeo, laserMat);
  beam.position.copy(origin).add(direction.clone().multiplyScalar(length / 2));
  beam.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );
  scene.add(beam);
  laserBeams.push({ mesh: beam, removeAt: clock.getElapsedTime() + LASER_DURATION });

  // Walls: punch a hole (see through + walk through). Other surfaces: leave a black decal.
  if (hits.length > 0) {
    const hit = hits[0];
    const wallType = hit.object.userData && hit.object.userData.wallType;
    if (wallType === 'back' || wallType === 'left' || wallType === 'right') {
      addHoleToWall(hit.object, hit);
    } else {
      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      const markRadius = 0.12;
      const markGeo = new THREE.CircleGeometry(markRadius, 24);
      const markMat = new THREE.MeshBasicMaterial({
        color: 0x0a0a0a,
        side: THREE.DoubleSide,
      });
      const mark = new THREE.Mesh(markGeo, markMat);
      mark.position.copy(hit.point).add(normal.clone().multiplyScalar(0.01));
      mark.lookAt(hit.point.clone().sub(normal));
      scene.add(mark);
    }
  }
}

function onKeyDown(e) {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!e.repeat) fireLaser();
    return;
  }
  switch (e.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyD': moveRight = false; break;
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function resolveCollisions() {
  const p = camera.position;
  // Walls: clamp unless player is inside a laser hole (use wall-local u,v)
  const vy = p.y - WALL_CENTER_Y;
  if (p.x < BOUNDS_X_MIN) {
    if (isInsideWallHole(wallRefs.left, -p.z, vy))
      p.x = Math.max(BOUNDS_X_MIN - HOLE_EXTENT, p.x);
    else
      p.x = BOUNDS_X_MIN;
  }
  if (p.x > BOUNDS_X_MAX) {
    if (isInsideWallHole(wallRefs.right, p.z, vy))
      p.x = Math.min(BOUNDS_X_MAX + HOLE_EXTENT, p.x);
    else
      p.x = BOUNDS_X_MAX;
  }
  if (p.z < BOUNDS_Z_MIN) {
    if (isInsideWallHole(wallRefs.back, p.x, vy))
      p.z = Math.max(BOUNDS_Z_MIN - HOLE_EXTENT, p.z);
    else
      p.z = BOUNDS_Z_MIN;
  }
  if (p.z > BOUNDS_Z_MAX) p.z = BOUNDS_Z_MAX;
  if (p.y >= SCULPTURE_Y_MIN && p.y <= SCULPTURE_Y_MAX) {
    const dx = p.x - SCULPTURE_CENTER_X;
    const dz = p.z - SCULPTURE_CENTER_Z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0 && dist < SCULPTURE_RADIUS) {
      const scale = SCULPTURE_RADIUS / dist;
      p.x = SCULPTURE_CENTER_X + dx * scale;
      p.z = SCULPTURE_CENTER_Z + dz * scale;
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  const speed = 12; // walk speed (WASD)
  velocity.x -= velocity.x * 8.0 * dt;
  velocity.z -= velocity.z * 8.0 * dt;
  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  if (direction.length() > 0) {
    direction.normalize();
    if (moveForward || moveBackward) {
      velocity.z -= direction.z * speed * dt;
    }
    if (moveLeft || moveRight) {
      velocity.x -= direction.x * speed * dt;
    }
  }
  if (controls.isLocked) {
    controls.moveRight(-velocity.x * dt);
    controls.moveForward(-velocity.z * dt);
    resolveCollisions();
  }
  const now = clock.getElapsedTime();
  for (let i = laserBeams.length - 1; i >= 0; i--) {
    if (now >= laserBeams[i].removeAt) {
      scene.remove(laserBeams[i].mesh);
      laserBeams[i].mesh.geometry.dispose();
      laserBeams[i].mesh.material.dispose();
      laserBeams.splice(i, 1);
    }
  }
  renderer.render(scene, camera);
}

init();
