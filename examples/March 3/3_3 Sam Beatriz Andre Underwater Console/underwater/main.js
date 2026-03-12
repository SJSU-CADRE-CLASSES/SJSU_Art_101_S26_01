/**
 * 3D Underwater Environment — Deep ocean with seafloor, rocks, plants, fish
 * First-person navigation with PointerLockControls
 */

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const canvas = document.getElementById('canvas');
const prompt = document.getElementById('prompt');

let scene, camera, renderer, controls, spotlight;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let moveUp = false, moveDown = false;
let spotlightOn = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const MOVE_SPEED = 8;
const FISH = [];
const KELP = [];
let particlePos;

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x001a33);
  scene.fog = new THREE.FogExp2(0x001a33, 0.04);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 2, 10);
  scene.add(camera);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.4;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Player spotlight (toggle with F)
  spotlight = new THREE.SpotLight(0x7ab8d4, 2, 40, Math.PI / 6, 0.3, 1);
  spotlight.position.set(0, 0, 0);
  spotlight.castShadow = true;
  spotlight.shadow.mapSize.width = 512;
  spotlight.shadow.mapSize.height = 512;
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, 0, -10);
  spotlight.target = spotTarget;
  camera.add(spotTarget);
  camera.add(spotlight);
  spotlight.visible = false;

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

  // Rocks
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x3a4a4a,
    roughness: 0.9,
    metalness: 0,
  });

  for (let i = 0; i < 80; i++) {
    const geo = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.8, 0);
    const pos = geo.attributes.position;
    for (let j = 0; j < pos.count; j++) {
      pos.setX(j, pos.getX(j) * (0.7 + Math.random() * 0.6));
      pos.setY(j, pos.getY(j) * (0.7 + Math.random() * 0.6));
      pos.setZ(j, pos.getZ(j) * (0.7 + Math.random() * 0.6));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const rock = new THREE.Mesh(geo, rockMat.clone());
    rock.castShadow = true;
    rock.receiveShadow = true;
    rock.position.set(
      (Math.random() - 0.5) * 180,
      0,
      (Math.random() - 0.5) * 180
    );
    rock.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3);
    rock.scale.multiplyScalar(0.5 + Math.random());
    scene.add(rock);
  }

  // Kelp plants
  const kelpMat = new THREE.MeshStandardMaterial({
    color: 0x1a4a2a,
    roughness: 0.9,
    metalness: 0,
  });

  for (let i = 0; i < 120; i++) {
    const height = 1.5 + Math.random() * 3;
    const geo = new THREE.CylinderGeometry(0.02, 0.08, height, 6);
    const kelp = new THREE.Mesh(geo, kelpMat.clone());
    kelp.castShadow = true;
    kelp.position.set(
      (Math.random() - 0.5) * 180,
      height / 2,
      (Math.random() - 0.5) * 180
    );
    kelp.rotation.x = (Math.random() - 0.5) * 0.3;
    kelp.rotation.z = (Math.random() - 0.5) * 0.3;
    kelp.userData = { baseY: kelp.position.y, height, sway: Math.random() * 0.5 + 0.5 };
    scene.add(kelp);
    KELP.push(kelp);
  }

  // Fish
  const fishMat = new THREE.MeshStandardMaterial({
    color: 0x4a6a5a,
    roughness: 0.6,
    metalness: 0.1,
  });

  function createFish() {
    const body = new THREE.SphereGeometry(0.15, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const fish = new THREE.Mesh(body, fishMat.clone());
    fish.scale.set(1.5, 0.5, 0.5);
    const group = new THREE.Group();
    group.add(fish);
    group.userData = {
      speed: 1 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      radius: 5 + Math.random() * 15,
    };
    return group;
  }

  for (let i = 0; i < 25; i++) {
    const fish = createFish();
    fish.traverse((c) => { if (c.isMesh) c.castShadow = true; });
    fish.position.set(
      (Math.random() - 0.5) * 180,
      1 + Math.random() * 2,
      (Math.random() - 0.5) * 180
    );
    fish.userData.phase = Math.random() * Math.PI * 2;
    fish.userData.angle = Math.random() * Math.PI * 2;
    scene.add(fish);
    FISH.push(fish);
  }

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

  // Keyboard
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function onKeyDown(e) {
  switch (e.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
    case 'Space': moveUp = true; break;
    case 'ShiftLeft': moveDown = true; break;
    case 'KeyF':
      e.preventDefault();
      spotlightOn = !spotlightOn;
      spotlight.visible = spotlightOn;
      break;
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

  // Kelp sway
  KELP.forEach((kelp) => {
    kelp.rotation.x = Math.sin(time * 0.002 * kelp.userData.sway) * 0.2;
    kelp.rotation.z = Math.sin(time * 0.0015 * kelp.userData.sway) * 0.15;
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

  renderer.render(scene, camera);
}

init();
animate();
