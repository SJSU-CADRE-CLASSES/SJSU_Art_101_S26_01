import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

const root = document.getElementById("lifestyle-3d-root");
if (!root) {
  throw new Error("Missing #lifestyle-3d-root container for lifestyle world.");
}

let width = root.clientWidth || 800;
let height = root.clientHeight || 450;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050011, 0.05);

const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 200);
camera.position.set(0, 1.6, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(width, height);
renderer.setClearColor(0x050011, 1);
root.appendChild(renderer.domElement);

// Neon gradient sky dome
const skyGeo = new THREE.SphereGeometry(120, 48, 32);
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
      vec3 col = mix(bottomColor, topColor, pow(h, 1.2));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

// Mansion shell
const roomWidth = 14;
const roomDepth = 18;
const roomHeight = 5.5;

const roomGeo = new THREE.BoxGeometry(roomWidth, roomHeight, roomDepth);
roomGeo.translate(0, roomHeight / 2, 0);
const roomMat = new THREE.MeshStandardMaterial({
  color: 0x0a031e,
  emissive: 0x1a003a,
  metalness: 0.7,
  roughness: 0.22,
  side: THREE.BackSide,
});
const room = new THREE.Mesh(roomGeo, roomMat);
scene.add(room);

// Balcony opening (simple visual: we just put a neon frame at the front)
const balconyFrameGeo = new THREE.PlaneGeometry(8, 3.2);
const balconyFrameMat = new THREE.MeshBasicMaterial({
  color: 0xff00cc,
  transparent: true,
  opacity: 0.5,
  side: THREE.DoubleSide,
});
const balconyFrame = new THREE.Mesh(balconyFrameGeo, balconyFrameMat);
balconyFrame.position.set(0, 2.4, -roomDepth / 2 + 0.01);
scene.add(balconyFrame);

// Floor grid
const gridSize = 120;
const gridDivs = 60;
const grid = new THREE.GridHelper(
  gridSize,
  gridDivs,
  0xff00ff,
  0x00ffff,
);
grid.position.y = 0;
grid.material.opacity = 0.85;
grid.material.transparent = true;
scene.add(grid);

// Floating retro "sun" outside the balcony
const sunGeo = new THREE.SphereGeometry(5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({
  color: 0xffcc66,
  wireframe: true,
});
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.position.set(0, 10, -30);
scene.add(sun);

// Neon columns inside mansion
const columnGeo = new THREE.CylinderGeometry(0.18, 0.18, roomHeight, 32);
const makeColumn = (x, z, color) => {
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 3.2,
    metalness: 0.1,
    roughness: 0.15,
  });
  const mesh = new THREE.Mesh(columnGeo, mat);
  mesh.position.set(x, roomHeight / 2, z);
  scene.add(mesh);
  return mesh;
};

const columnOffsetX = roomWidth / 2 - 1.2;
const columnOffsetZ = roomDepth / 2 - 2.2;
makeColumn(columnOffsetX, columnOffsetZ, 0xff4df0);
makeColumn(-columnOffsetX, columnOffsetZ, 0x4dfbff);
makeColumn(columnOffsetX, -columnOffsetZ + 1.6, 0xffc94d);
makeColumn(-columnOffsetX, -columnOffsetZ + 1.6, 0x8d72ff);

// Low neon seating blocks
const seatGeo = new THREE.BoxGeometry(2.8, 0.6, 1.1);
const makeSeat = (x, z, color) => {
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.4,
    metalness: 0.4,
    roughness: 0.4,
  });
  const mesh = new THREE.Mesh(seatGeo, mat);
  mesh.position.set(x, 0.3, z);
  scene.add(mesh);
  return mesh;
};
makeSeat(0, 0.8, 0x1affff);
makeSeat(0, 2.3, 0xff4dff);

// Floating plants
const plantGeo = new THREE.IcosahedronGeometry(0.42, 1);
const makePlant = (x, z, color) => {
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.6,
    wireframe: true,
  });
  const mesh = new THREE.Mesh(plantGeo, mat);
  mesh.position.set(x, 1.4, z);
  scene.add(mesh);
  return mesh;
};
const plants = [
  makePlant(3, -2.4, 0x7dffde),
  makePlant(-3.2, -1.6, 0xff7dd9),
  makePlant(2.6, 3.2, 0xfff2a1),
];

// Lighting
const ambient = new THREE.AmbientLight(0xffaaff, 0.45);
scene.add(ambient);

const pinkSpot = new THREE.SpotLight(0xff00ff, 2.2, 40, Math.PI / 5, 0.35);
pinkSpot.position.set(-6, roomHeight + 1, 3);
pinkSpot.target.position.set(0, 1.6, 0);
scene.add(pinkSpot);
scene.add(pinkSpot.target);

const cyanSpot = new THREE.SpotLight(0x00ffff, 2.4, 40, Math.PI / 5, 0.35);
cyanSpot.position.set(6, roomHeight + 1, -2);
cyanSpot.target.position.set(0, 1.2, -4);
scene.add(cyanSpot);
scene.add(cyanSpot.target);

const balconyGlow = new THREE.PointLight(0xff00cc, 1.4, 24);
balconyGlow.position.set(0, 2.2, -roomDepth / 2 + 0.6);
scene.add(balconyGlow);

// First-person style navigation
const keys = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  Space: false,
  ShiftLeft: false,
};

let yaw = 0;
let pitch = 0;
let isPointerLocked = false;

const velocity = new THREE.Vector3();
const moveSpeed = 3.6;
const verticalSpeed = 2.2;

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

const pointerLockElement = renderer.domElement;

pointerLockElement.addEventListener("click", () => {
  if (!isPointerLocked && pointerLockElement.requestPointerLock) {
    pointerLockElement.requestPointerLock();
  }
});

const onPointerLockChange = () => {
  isPointerLocked = document.pointerLockElement === pointerLockElement;
};

document.addEventListener("pointerlockchange", onPointerLockChange);

document.addEventListener("mousemove", (event) => {
  if (!isPointerLocked) return;
  const sensitivity = 0.0027;
  yaw -= event.movementX * sensitivity;
  pitch -= event.movementY * sensitivity;
  const limit = Math.PI / 2 - 0.1;
  pitch = clamp(pitch, -limit, limit);
});

document.addEventListener("keydown", (event) => {
  if (event.code in keys) {
    keys[event.code] = true;
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code in keys) {
    keys[event.code] = false;
  }
});

// Simple mansion bounds to keep the player roughly inside the shell
const bounds = {
  xMin: -roomWidth / 2 + 0.8,
  xMax: roomWidth / 2 - 0.8,
  zMin: -roomDepth / 2 + 1.4,
  zMax: roomDepth / 2 - 1.4,
  yMin: 0.6,
  yMax: 3.5,
};

let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // Animate plants and sun
  plants.forEach((p, i) => {
    p.rotation.y += 0.3 * dt;
    p.position.y = 1.2 + Math.sin(now * 0.001 + i) * 0.25;
  });
  sun.rotation.y += 0.06 * dt;

  camera.rotation.set(pitch, yaw, 0, "YXZ");

  velocity.set(0, 0, 0);

  // Intentionally inverted controls (per project spec):
  // W goes "back", S goes "forward", A goes "right", D goes "left".
  if (keys.KeyW) velocity.z += 1;
  if (keys.KeyS) velocity.z -= 1;
  if (keys.KeyA) velocity.x += 1;
  if (keys.KeyD) velocity.x -= 1;

  if (velocity.lengthSq() > 0) {
    velocity.normalize().multiplyScalar(moveSpeed * dt);
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);

    const dx = velocity.x * cosY - velocity.z * sinY;
    const dz = velocity.x * sinY + velocity.z * cosY;

    camera.position.x += dx;
    camera.position.z += dz;
  }

  if (keys.Space) {
    camera.position.y += verticalSpeed * dt;
  }
  if (keys.ShiftLeft) {
    camera.position.y -= verticalSpeed * dt;
  }

  camera.position.x = clamp(camera.position.x, bounds.xMin, bounds.xMax);
  camera.position.z = clamp(camera.position.z, bounds.zMin, bounds.zMax);
  camera.position.y = clamp(camera.position.y, bounds.yMin, bounds.yMax);

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  const newWidth = root.clientWidth || window.innerWidth || width;
  const newHeight = root.clientHeight || window.innerHeight || height;
  width = newWidth;
  height = newHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

