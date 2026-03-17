/**
 * 3D Underwater Environment — Deep ocean with seafloor, rocks, plants, fish
 * First-person navigation with PointerLockControls
 */

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const API_MESSAGES = '/api/messages';
const MAX_MESSAGE_LENGTH = 100;
const LIBRARY_INTERACT_DIST = 18;
const HOLE_READ_DIST = 6;

const BOUND_MIN = -45;
const BOUND_MAX = 45;
const CEILING_Y = 150;
const WATER_COLOR_DEEP = new THREE.Color(0x001a33);
const WATER_COLOR_SURFACE = new THREE.Color(0x5a9fd4);
const FLAT_EXTEND = 25;
const CLIFF_EXTEND = 45;
const CLIFF_HEIGHT = 28;

const canvas = document.getElementById('canvas');
const prompt = document.getElementById('prompt');
const lightBtn = document.getElementById('light-btn');
const compassTicks = document.getElementById('compass-ticks');
const compassLibrary = document.getElementById('compass-library');
const interactPrompt = document.getElementById('interact-prompt');
const drillUI = document.getElementById('drill-ui');
const drillInput = document.getElementById('drill-input');
const readOverlay = document.getElementById('read-overlay');
const readMessage = document.getElementById('read-message');
const crosshair = document.getElementById('crosshair');
const boostMeterFill = document.getElementById('boost-meter-fill');

const PX_PER_DEG = 2;
const COMPASS_CENTER = 140;

let scene, camera, renderer, controls, playerLight, composer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let moveUp = false, moveDown = false;
let boost = false;
let boostAmount = 1;
let spotlightOn = true;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _toLibrary = new THREE.Vector3();
const MOVE_SPEED = 16;
const BOOST_SPEED_MULT = 1.75;
const BOOST_DEPLETE_RATE = 0.08;
const BOOST_REGEN_RATE = 0.05;
const FISH = [];
const FISH_SCHOOLS = [];
const KELP = [];
const VEGETATION = [];
const FLOATING_STONES = [];
let particlePos;
let dustPos;
let dustUniforms;
const LIBRARY_POSITION = new THREE.Vector3(30, 0, -30);
const LIBRARY_CLEARANCE = 12;
let libraryBoulder, raycaster, rayOrigin, rayDirection;
let messages = [];
let drillPromptVisible = false, readPromptVisible = false, drilling = false, reading = false;
let hoveredHole = null;
let pendingHoleData = null;
let previewHole = null;

// Message-entry animation: tube from shoulder to boulder + water spray
let drillSpray = null;
const TUBE_EXTEND_DURATION = 0.5;
const CONNECTED_DURATION = 1.4;   // time tube stays at rock with water from tip
const TUBE_RETRACT_DURATION = 0.5; // snake back out same path
const DRILL_SPRAY_DURATION = TUBE_EXTEND_DURATION + CONNECTED_DURATION + TUBE_RETRACT_DURATION;
const TUBE_RADIUS = 0.07;
const SPRAY_JET_COUNT = 14;
const SPRAY_SPEED = 2.2;
const SPRAY_PULSE_INTERVAL = 0.18; // re-emit jets so water flows whole time
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

// Read-message animation: small tube from top-left to hole, speaker tip, sonar ping + ripples
let readTube = null;
const READ_TUBE_RADIUS = 0.028;
const READ_TUBE_EXTEND_DURATION = 0.55;
const READ_TUBE_CONNECTED_DURATION = 1.1;  // ping + ripples then retract
const READ_TUBE_RETRACT_DURATION = 0.5;
const READ_TUBE_DURATION = READ_TUBE_EXTEND_DURATION + READ_TUBE_CONNECTED_DURATION + READ_TUBE_RETRACT_DURATION;
const SPEAKER_TIP_SIZE = 0.11;
const RIPPLE_COUNT = 6;
const RIPPLE_EXPAND_SPEED = 1.4;
const RIPPLE_DURATION = 0.9;
const _holeWorldPos = new THREE.Vector3();

let pendingReadMessage = null;
let typewriterTargetText = null;
let typewriterIndex = 0;
let typewriterLastTime = 0;
const TYPEWRITER_CHAR_DELAY = 0.068;
let currentMessageText = null;
let messageDisplayStartTime = 0;
let messageDisplayDuration = 0;
const DISPLAY_DURATION_MIN = 5;
const DISPLAY_DURATION_MAX = 10;
const DISPLAY_DURATION_PER_CHAR = 0.04;
let deleteTargetText = null;
let deleteIndex = 0;
let deleteLastTime = 0;
const DELETE_CHAR_DELAY = 0.045;

async function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x001a33);
  scene.fog = new THREE.FogExp2(0x001a33, 0.04);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 2, 10);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = spotlightOn ? 0.95 : 0.6;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.shadowMap.size = 1024;

  const CRTShader = {
    uniforms: {
      tDiffuse: { value: null },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uTime: { value: 0 },
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
      uniform vec2 uResolution;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv - 0.5;
        float aspect = uResolution.x / uResolution.y;
        uv.x *= aspect;
        float r2 = dot(uv, uv);
        float barrel = 0.12;
        uv *= 1.0 + barrel * r2;
        uv.x /= aspect;
        uv += 0.5;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }
        float pixelSize = 2.8;
        vec2 pixelGrid = uResolution.xy / pixelSize;
        uv = floor(uv * pixelGrid + 0.5) / pixelGrid;
        vec4 col = texture2D(tDiffuse, uv);
        float scanline = sin(uv.y * uResolution.y * 1.5) * 0.06 + 0.94;
        col.rgb *= scanline;
        vec2 vigUv = vUv - 0.5;
        vigUv.x *= aspect;
        float vigR2 = dot(vigUv, vigUv);
        float vig = 1.0 - 0.35 * smoothstep(0.25, 1.0, vigR2 * 4.0);
        col.rgb *= vig;
        col.rgb = pow(col.rgb, vec3(0.97));
        col.rgb *= 1.12;
        gl_FragColor = col;
      }
    `,
  };

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const crtPass = new ShaderPass(CRTShader);
  composer.addPass(crtPass);

  // Player light (toggle with F) — PointLight for reliable illumination
  playerLight = new THREE.PointLight(0xaae5ff, spotlightOn ? 45 : 0, 30, 0.5);
  playerLight.castShadow = false;
  scene.add(playerLight);

  // Deep ocean lighting — dim, blue-green
  const ambient = new THREE.AmbientLight(0x1a3a4a, 0.24);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0x2d5a6a, 0.45);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  const hemi = new THREE.HemisphereLight(0x0a2a3a, 0x001520, 0.32);
  scene.add(hemi);

  // Seafloor — extends flat through bounds and into flat extension (collision via bounds clamp)
  const floorExtent = BOUND_MAX + FLAT_EXTEND;
  const floorSize = floorExtent * 2;
  const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize, 28, 28);
  const floorVerts = floorGeo.attributes.position;
  for (let i = 0; i < floorVerts.count; i++) {
    floorVerts.setZ(i, floorVerts.getZ(i) + (Math.random() - 0.5) * 2);
  }
  // Crater divot around library (floor local: x→world X, y→world -Z, so library at (30, 30))
  const libX = LIBRARY_POSITION.x;
  const libZ = LIBRARY_POSITION.z;
  const craterRadius = 14;
  const craterDepth = 2.2;
  for (let i = 0; i < floorVerts.count; i++) {
    const vx = floorVerts.getX(i);
    const vy = floorVerts.getY(i);
    const dist = Math.hypot(vx - libX, vy + libZ);
    if (dist < craterRadius) {
      const t = 1 - dist / craterRadius;
      const dip = craterDepth * (1 - t * t);
      floorVerts.setZ(i, floorVerts.getZ(i) - dip);
    }
  }
  floorGeo.computeVertexNormals();

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xc4a574,
    roughness: 0.95,
    metalness: 0,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Cliffs beyond flat extension (visual only, no collision)
  const floorMatExt = new THREE.MeshStandardMaterial({
    color: 0xc4a574,
    roughness: 0.95,
    metalness: 0,
  });
  function createCliffStrip(axis, sign) {
    const w = floorSize + 20;
    const len = CLIFF_EXTEND;
    const geo = axis === 'z'
      ? new THREE.PlaneGeometry(w, len, 16, 12)
      : new THREE.PlaneGeometry(len, w, 12, 16);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const along = axis === 'z' ? pos.getY(i) : pos.getX(i);
      const dist = sign > 0 ? along + len / 2 : len / 2 - along;
      const cliffT = dist / CLIFF_EXTEND;
      const height = CLIFF_HEIGHT * cliffT * cliffT + (Math.random() - 0.5) * 2;
      pos.setZ(i, -height);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, floorMatExt.clone());
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    const edge = floorExtent + len / 2;
    if (axis === 'z') mesh.position.set(0, 0, sign * edge);
    else {
      mesh.position.set(sign * edge, 0, 0);
      mesh.rotation.y = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
    scene.add(mesh);
  }
  createCliffStrip('z', 1);
  createCliffStrip('z', -1);
  createCliffStrip('x', 1);
  createCliffStrip('x', -1);

  const visualExtent = BOUND_MAX + FLAT_EXTEND;
  const visualRange = visualExtent * 2;

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

  function posAwayFromLibrary() {
    let x, z;
    do {
      x = BOUND_MIN + Math.random() * (BOUND_MAX - BOUND_MIN);
      z = BOUND_MIN + Math.random() * (BOUND_MAX - BOUND_MIN);
    } while (Math.hypot(x - LIBRARY_POSITION.x, z - LIBRARY_POSITION.z) < LIBRARY_CLEARANCE);
    return { x, z };
  }

  for (let i = 0; i < 55; i++) {
    const geo = rockShapes[i % rockShapes.length]();
    const rock = new THREE.Mesh(geo, rockMat.clone());
    rock.receiveShadow = true;
    const s = 0.4 + Math.random() * 0.9;
    rock.scale.set(s, s * (0.85 + Math.random() * 0.3), s);
    const { x, z } = posAwayFromLibrary();
    rock.position.set(x, 0, z);
    rock.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.2);
    scene.add(rock);
  }

  // Medium stones that gently float in an orbit around the player toward the bottom of view
  const floatingStoneMat = new THREE.MeshStandardMaterial({
    color: 0x2b3537,
    roughness: 0.96,
    metalness: 0.08,
  });
  for (let i = 0; i < 5; i++) {
    // Rounded stone pebbles (back to icosahedrons)
    const geo = new THREE.IcosahedronGeometry(0.6, 1);
    const stone = new THREE.Mesh(geo, floatingStoneMat.clone());
    stone.castShadow = true;
    stone.receiveShadow = true;
    stone.userData = {
      angleOffset: (i / 5) * Math.PI * 2,
      radius: 3 + Math.random() * 1.5,
      heightOffset: -2.0 - Math.random() * 0.6,
      bobAmp: 0.22 + Math.random() * 0.12,
      bobSpeed: 0.35 + Math.random() * 0.2,
      spinSpeed: 0.18 + Math.random() * 0.25,
      joystick: null,
      joystickTiltX: 0,
      joystickTiltZ: 0,
      radar: null,
      radarSweep: null,
      radarPing: null,
      radarStartTime: 0,
      hudCanvas: null,
      hudTexture: null,
    };

    // Slightly flatten the stones and widen them so the top surface reads more like a pad
    stone.scale.set(1.25, 0.6, 1.25);

    // Add a joystick to the first stone to represent movement
    if (i === 0) {
      const baseGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.12, 18);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0xbec7d1,
        roughness: 0.35,
        metalness: 0.85,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(0, 0.42, 0);
      base.castShadow = true;
      base.receiveShadow = true;

      const stickGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 14);
      const stickMat = new THREE.MeshStandardMaterial({
        color: 0xd5dde6,
        roughness: 0.3,
        metalness: 0.9,
      });
      const stick = new THREE.Mesh(stickGeo, stickMat);
      stick.position.set(0, 0.75, 0);
      stick.castShadow = true;
      stick.receiveShadow = true;

      const knobGeo = new THREE.SphereGeometry(0.12, 18, 18);
      const knobMat = new THREE.MeshStandardMaterial({
        color: 0xf5f7fb,
        roughness: 0.15,
        metalness: 0.95,
        emissive: new THREE.Color(0xbcc7ff),
        emissiveIntensity: 0.25,
      });
      const knob = new THREE.Mesh(knobGeo, knobMat);
      knob.position.set(0, 1.02, 0);
      knob.castShadow = true;
      knob.receiveShadow = true;

      const joystick = new THREE.Group();
      joystick.add(base);
      joystick.add(stick);
      joystick.add(knob);

      stone.add(joystick);
      stone.userData.joystick = joystick;
    }

    // Add rows of small buttons on a different stone
    if (i === 2) {
      const buttonsGroup = new THREE.Group();

      const silverMat = new THREE.MeshStandardMaterial({
        color: 0xd8dde5,
        roughness: 0.25,
        metalness: 0.85,
      });
      const redMat = new THREE.MeshStandardMaterial({
        color: 0xc43737,
        roughness: 0.35,
        metalness: 0.6,
        emissive: new THREE.Color(0x5a1010),
        emissiveIntensity: 0.4,
      });

      const rows = 3;
      const cols = 4;
      const spacingX = 0.22;
      const spacingZ = 0.22;
      const startX = -((cols - 1) * spacingX) / 2;
      const startZ = -((rows - 1) * spacingZ) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const btnGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16);
          // Randomly select a few buttons to be red, rest silver
          const isRed = Math.random() < 0.22;
          const btn = new THREE.Mesh(btnGeo, isRed ? redMat.clone() : silverMat.clone());
          const x = startX + c * spacingX;
          const z = startZ + r * spacingZ;
          // Sit the buttons directly on the pebble surface
          btn.position.set(x, 0.6, z);
          btn.castShadow = true;
          btn.receiveShadow = true;

          buttonsGroup.add(btn);
        }
      }

      stone.add(buttonsGroup);
    }

    // Add switches, dials, and buttons on another pebble
    if (i === 3) {
      const panelGroup = new THREE.Group();

      const silverMat = new THREE.MeshStandardMaterial({
        color: 0xd8dde5,
        roughness: 0.25,
        metalness: 0.85,
      });
      const redMat = new THREE.MeshStandardMaterial({
        color: 0xc43737,
        roughness: 0.35,
        metalness: 0.6,
        emissive: new THREE.Color(0x5a1010),
        emissiveIntensity: 0.4,
      });
      const darkMat = new THREE.MeshStandardMaterial({
        color: 0x2a3038,
        roughness: 0.5,
        metalness: 0.7,
      });

      // More toggle switches (lever style) — top row and one each side
      const switchPositions = [
        { x: -0.38, z: 0.35, tilt: -0.35 },
        { x: 0, z: 0.35, tilt: 0.35 },
        { x: 0.38, z: 0.35, tilt: -0.35 },
        { x: -0.38, z: 0.08, tilt: 0.28 },
        { x: 0.38, z: 0.08, tilt: -0.28 },
      ];
      switchPositions.forEach((pos) => {
        const baseGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.03, 16);
        const base = new THREE.Mesh(baseGeo, darkMat.clone());
        base.position.set(pos.x, 0.605, pos.z);
        base.castShadow = true;
        panelGroup.add(base);

        const leverGeo = new THREE.BoxGeometry(0.06, 0.02, 0.16);
        const lever = new THREE.Mesh(leverGeo, silverMat.clone());
        lever.position.set(pos.x, 0.64, pos.z);
        lever.rotation.z = pos.tilt;
        lever.castShadow = true;
        panelGroup.add(lever);
      });

      // Grid: mix of buttons and dials (fixed pattern so dials are in specific slots)
      const rows = 4;
      const cols = 5;
      const spacingX = 0.18;
      const spacingZ = 0.18;
      const startX = -((cols - 1) * spacingX) / 2;
      const startZ = -0.25;

      // Dials at these [row, col] positions (replace buttons)
      const dialSlots = [[0, 1], [0, 3], [1, 0], [1, 4], [2, 2], [2, 4], [3, 1], [3, 3]];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * spacingX;
          const z = startZ + r * spacingZ;
          const isDial = dialSlots.some(([dr, dc]) => dr === r && dc === c);

          if (isDial) {
            // Dial: small base + knob
            const baseGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.02, 16);
            const dialBase = new THREE.Mesh(baseGeo, darkMat.clone());
            dialBase.position.set(x, 0.595, z);
            dialBase.castShadow = true;
            panelGroup.add(dialBase);

            const knobGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.035, 20);
            const knob = new THREE.Mesh(knobGeo, silverMat.clone());
            knob.position.set(x, 0.64, z);
            knob.castShadow = true;
            panelGroup.add(knob);
          } else {
            const btnGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.04, 16);
            const isRed = Math.random() < 0.2;
            const btn = new THREE.Mesh(btnGeo, isRed ? redMat.clone() : silverMat.clone());
            btn.position.set(x, 0.6, z);
            btn.castShadow = true;
            btn.receiveShadow = true;
            panelGroup.add(btn);
          }
        }
      }

      stone.add(panelGroup);
    }

    // Add a flush radar disc to the second stone
    if (i === 1) {
      const radarGroup = new THREE.Group();
      const radius = 0.45;

      // Base disc
      const baseGeo = new THREE.CircleGeometry(radius, 48);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x06171f,
        roughness: 0.9,
        metalness: 0.1,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      // Nudge the base slightly down so the radar feels embedded, not hovering
      base.position.y = -0.012;
      base.receiveShadow = false;
      base.castShadow = false;
      radarGroup.add(base);

      // Concentric rings
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x4ad3b5,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      });
      for (let r = 0.18; r < radius; r += 0.12) {
        const ringGeo = new THREE.RingGeometry(r - 0.002, r + 0.002, 48);
        const ring = new THREE.Mesh(ringGeo, ringMat);
        radarGroup.add(ring);
      }

      // Sweep wedge
      const sweepGeo = new THREE.RingGeometry(0, radius, 64, 1, 0, Math.PI / 4);
      const sweepMat = new THREE.MeshBasicMaterial({
        color: 0x6dffe2,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const sweep = new THREE.Mesh(sweepGeo, sweepMat);
      radarGroup.add(sweep);

      // Ping marker representing the library direction
      const pingGeo = new THREE.CircleGeometry(0.04, 16);
      const pingMat = new THREE.MeshBasicMaterial({
        color: 0x9dffde,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      const ping = new THREE.Mesh(pingGeo, pingMat);
      ping.position.set(0, 0.002, radius * 0.75);
      radarGroup.add(ping);

      // Simple compass "N" marker at north (world +Z)
      const northGeo = new THREE.CircleGeometry(0.028, 16);
      const northMat = new THREE.MeshBasicMaterial({
        color: 0x4ad3b5,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
      const northMarker = new THREE.Mesh(northGeo, northMat);
      northMarker.position.set(0, 0.002, radius - 0.06);
      radarGroup.add(northMarker);

      radarGroup.rotation.x = -Math.PI / 2;
      // Sink the whole radar a bit into the flattened top of the stone
      radarGroup.position.set(0, 0.6, 0);

      stone.add(radarGroup);
      stone.userData.radar = radarGroup;
      stone.userData.radarSweep = sweep;
      stone.userData.radarPing = ping;
      stone.userData.radarStartTime = performance.now() / 1000;
    }

    // HUD on the last pebble — environment stats (canvas texture updated each frame)
    if (i === 4) {
      const hudW = 256;
      const hudH = 160;
      const canvas = document.createElement('canvas');
      canvas.width = hudW;
      canvas.height = hudH;

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const hudMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
      });
      const hudGeo = new THREE.PlaneGeometry(0.85, 0.52);
      const hudMesh = new THREE.Mesh(hudGeo, hudMat);
      hudMesh.rotation.x = -Math.PI / 2;
      hudMesh.position.set(0, 0.615, 0);

      stone.add(hudMesh);
      stone.userData.hudCanvas = canvas;
      stone.userData.hudTexture = texture;
    }

    scene.add(stone);
    FLOATING_STONES.push(stone);
  }

  function createOvalGeometry(width, height, segments = 14) {
    const shape = new THREE.Shape();
    const a = width / 2;
    const b = height / 2;
    const curve = new THREE.EllipseCurve(0, 0, a, b, 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(segments);
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, points[i].y);
    return new THREE.ShapeGeometry(shape);
  }

  // Kelp plants — stalk with leaves surrounding it, both sway in current
  const kelpStalkMat = new THREE.MeshStandardMaterial({
    color: 0x1a4a2a,
    roughness: 0.9,
    metalness: 0,
  });
  const kelpLeafMat = new THREE.MeshStandardMaterial({
    color: 0x1e5a32,
    roughness: 0.85,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < 55; i++) {
    const r = Math.random();
    const height = r < 0.5 ? 1.5 + Math.random() * 3
      : r < 0.85 ? 5 + Math.random() * 12
      : 18 + Math.random() * 25;
    const thickness = 0.008 + height * 0.0025;
    const topRad = thickness * 0.4;
    const botRad = thickness * 2.2;
    const stalkGeo = new THREE.CylinderGeometry(topRad, botRad, height, 5, Math.max(8, Math.min(20, Math.floor(height * 1.2))));
    const pos = stalkGeo.attributes.position;
    const origPos = new Float32Array(pos.array.length);
    origPos.set(pos.array);

    const stalkMesh = new THREE.Mesh(stalkGeo, kelpStalkMat.clone());
    stalkMesh.position.y = height / 2;

    const kelpGroup = new THREE.Group();
    kelpGroup.add(stalkMesh);

    const leafCount = Math.min(28, Math.max(8, Math.floor(height * 1.8)));
    const leaves = [];
    for (let l = 0; l < leafCount; l++) {
      const leafHeight = Math.max(0.05, Math.min(height - 0.05, (l / (leafCount - 1 || 1)) * height + (Math.random() - 0.5) * (height / leafCount)));
      const leafW = 0.35 + Math.random() * 0.45;
      const leafH = 0.45 + Math.random() * 0.5;
      const leafGeo = createOvalGeometry(leafW, leafH, 14);
      const leafMesh = new THREE.Mesh(leafGeo, kelpLeafMat.clone());
      leafMesh.position.set(0, leafHeight, 0);
      leafMesh.rotation.x = -Math.PI / 2;
      leafMesh.rotation.z = (l / leafCount) * Math.PI * 2 + Math.random() * 0.5;
      leafMesh.rotation.y = (Math.random() - 0.5) * 0.4;
      kelpGroup.add(leafMesh);
      leaves.push({
        mesh: leafMesh,
        height: leafHeight,
        phase: Math.random() * Math.PI * 2,
        amp: 0.12 + Math.random() * 0.1,
        baseRotY: leafMesh.rotation.y,
        baseRotZ: leafMesh.rotation.z,
      });
    }

    const { x, z } = posAwayFromLibrary();
    kelpGroup.position.set(x, 0, z);
    kelpGroup.userData = {
      height,
      origPos,
      leaves,
      freq: 0.0025 + Math.random() * 0.001,
      phase: Math.random() * Math.PI * 2,
      amp: 0.12 + Math.random() * 0.1,
      waveSpeed: 2 + Math.random() * 2,
    };
    scene.add(kelpGroup);
    KELP.push(kelpGroup);
  }

  // Flat leaves — large oval leaves on the seafloor
  const flatLeafMat = new THREE.MeshStandardMaterial({
    color: 0x2a5a3a,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 25; i++) {
    const w = 0.8 + Math.random() * 1.2;
    const h = 0.5 + Math.random() * 0.8;
    const geo = createOvalGeometry(w, h, 18);
    const mesh = new THREE.Mesh(geo, flatLeafMat.clone());
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.random() * Math.PI * 2;
    const { x, z } = posAwayFromLibrary();
    mesh.position.set(x, 0.02, z);
    mesh.userData = {
      phase: Math.random() * Math.PI * 2,
      amp: 0.03 + Math.random() * 0.04,
      baseRotZ: mesh.rotation.z,
    };
    scene.add(mesh);
    VEGETATION.push(mesh);
  }

  // Shrubs — clusters of large oval leaves
  const shrubLeafMat = new THREE.MeshStandardMaterial({
    color: 0x1e4a2e,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 18; i++) {
    const shrubGroup = new THREE.Group();
    const leafCount = 5 + Math.floor(Math.random() * 6);
    for (let c = 0; c < leafCount; c++) {
      const lw = 0.25 + Math.random() * 0.35;
      const lh = 0.4 + Math.random() * 0.5;
      const g = createOvalGeometry(lw, lh, 14);
      const m = new THREE.Mesh(g, shrubLeafMat.clone());
      m.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      m.rotation.z = Math.random() * Math.PI * 2;
      m.position.set(
        (Math.random() - 0.5) * 0.5,
        0.02 + Math.random() * 0.15,
        (Math.random() - 0.5) * 0.5
      );
      shrubGroup.add(m);
    }
    const { x, z } = posAwayFromLibrary();
    shrubGroup.position.set(x, 0, z);
    shrubGroup.userData = {
      phase: Math.random() * Math.PI * 2,
      amp: 0.02 + Math.random() * 0.03,
    };
    scene.add(shrubGroup);
    VEGETATION.push(shrubGroup);
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
    // Tail fin — at rear (furthest from swim direction) and thinnest cross-section
    body.geometry.computeBoundingBox();
    const bbox = body.geometry.boundingBox;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(0, 0, 0),
      body.quaternion,
      new THREE.Vector3(body.scale.x, body.scale.y, body.scale.z)
    );
    const allCorners = [
      [bbox.min.x, bbox.min.y, bbox.min.z], [bbox.max.x, bbox.min.y, bbox.min.z],
      [bbox.min.x, bbox.max.y, bbox.min.z], [bbox.max.x, bbox.max.y, bbox.min.z],
      [bbox.min.x, bbox.min.y, bbox.max.z], [bbox.max.x, bbox.min.y, bbox.max.z],
      [bbox.min.x, bbox.max.y, bbox.max.z], [bbox.max.x, bbox.max.y, bbox.max.z],
    ];
    const transformed = allCorners.map(([x, y, z]) =>
      new THREE.Vector3(x, y, z).applyMatrix4(m)
    );
    const rearZ = Math.max(...transformed.map((p) => p.z));
    const rearPoints = transformed.filter((p) => p.z >= rearZ - 0.01);
    const extentX = rearPoints.length >= 2
      ? Math.max(...rearPoints.map((p) => p.x)) - Math.min(...rearPoints.map((p) => p.x))
      : (bbox.max.x - bbox.min.x) * body.scale.x;
    const extentY = rearPoints.length >= 2
      ? Math.max(...rearPoints.map((p) => p.y)) - Math.min(...rearPoints.map((p) => p.y))
      : (bbox.max.y - bbox.min.y) * body.scale.y;
    const tailGeo = new THREE.BufferGeometry();
    const tailLen = 0.12 * scale;
    const tailW = 0.04 * scale;
    const tailVerts = extentX <= extentY
      ? new Float32Array([0, tailW, rearZ, 0, -tailW, rearZ, 0, 0, rearZ + tailLen])
      : new Float32Array([tailW, 0, rearZ, -tailW, 0, rearZ, 0, 0, rearZ + tailLen]);
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailVerts, 3));
    tailGeo.setIndex([0, 1, 2]);
    tailGeo.computeVertexNormals();
    const tailMat = body.material?.clone ? body.material.clone() : fishMat();
    const tail = new THREE.Mesh(tailGeo, tailMat);
    group.add(tail);
    const cx = -visualExtent + Math.random() * visualRange;
    const cz = -visualExtent + Math.random() * visualRange;
    const baseSpeed = 0.06 + Math.random() * 0.2;
    const scaleMod = scale < 0.6 ? (0.9 + Math.random() * 0.5) : scale > 1.2 ? (0.5 + Math.random() * 0.3) : (0.6 + Math.random() * 0.6);
    group.userData = {
      speed: baseSpeed * scaleMod,
      t: Math.random() * Math.PI * 2,
      cx,
      cz,
      radius: 10 + Math.random() * 6,
    };
    return group;
  }

  for (let i = 0; i < 50; i++) {
    const fish = createFish();
    fish.traverse((c) => { if (c.isMesh) c.castShadow = false; });
    const cx = fish.userData.cx;
    const cz = fish.userData.cz;
    const r = fish.userData.radius;
    const t = fish.userData.t;
    fish.position.set(
      cx + r * Math.sin(t),
      0.5 + Math.random() * 3,
      cz + r * Math.sin(2 * t)
    );
    scene.add(fish);
    FISH.push(fish);
  }

  // Fish schools — single merged mesh per school (20+ oval spheres each)
  function createSchool() {
    const geos = [];
    for (let i = 0; i < 24; i++) {
      const base = 0.06 + Math.random() * 0.08;
      const g = new THREE.SphereGeometry(base, 6, 6);
      g.scale(
        1.8 + Math.random() * 0.8,
        0.4 + Math.random() * 0.3,
        0.5 + Math.random() * 0.4
      );
      g.translate(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.8
      );
      geos.push(g);
    }
    let merged;
    try {
      merged = mergeGeometries(geos);
    } catch {
      return;
    }
    if (!merged) return;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x4d6a5a,
      roughness: 0.6,
      metalness: 0.05,
    });
    merged.computeVertexNormals();
    const school = new THREE.Mesh(merged, mat);
    school.castShadow = false;
    school.position.set(
      -visualExtent + Math.random() * visualRange,
      1 + Math.random() * 2.5,
      -visualExtent + Math.random() * visualRange
    );
    const cx = -visualExtent + Math.random() * visualRange;
    const cz = -visualExtent + Math.random() * visualRange;
    const t = Math.random() * Math.PI * 2;
    const r = 12 + Math.random() * 8;
    school.userData = { t, speed: 0.08 + Math.random() * 0.22, cx, cz, radius: r };
    school.position.set(cx + r * Math.sin(t), 1 + Math.random() * 2.5, cz + r * Math.sin(2 * t));
    scene.add(school);
    FISH_SCHOOLS.push(school);
  }
  for (let i = 0; i < 4; i++) createSchool();

  // Library boulder — one large oblong shape, high subdivision for smooth bumps
  const libraryGeo = new THREE.IcosahedronGeometry(6, 4);
  const libPos = libraryGeo.attributes.position;
  for (let i = 0; i < libPos.count; i++) {
    const x = libPos.getX(i);
    const y = libPos.getY(i);
    const z = libPos.getZ(i);
    const n = new THREE.Vector3(x, y, z).normalize();
    const bump = 0.22 * (Math.sin(x * 1.3) * Math.cos(y * 1.1) + Math.sin(z * 0.9) * Math.cos(x * 0.7) + Math.sin((x + z) * 0.5));
    libPos.setXYZ(i, x + n.x * bump, y + n.y * bump, z + n.z * bump);
  }
  libraryGeo.computeVertexNormals();
  const libraryMat = new THREE.MeshStandardMaterial({
    color: 0x2a3a3a,
    roughness: 0.9,
    metalness: 0,
  });
  libraryBoulder = new THREE.Mesh(libraryGeo, libraryMat);
  libraryBoulder.position.copy(LIBRARY_POSITION);
  libraryBoulder.scale.set(1.9, 1.3, 1.6);
  libraryBoulder.rotation.set(0.1, 0.5, 0.05);
  libraryBoulder.castShadow = true;
  libraryBoulder.receiveShadow = true;
  libraryBoulder.name = 'library';
  scene.add(libraryBoulder);

  raycaster = new THREE.Raycaster();
  rayOrigin = new THREE.Vector3();
  rayDirection = new THREE.Vector3();

  async function loadMessages() {
    try {
      const res = await fetch(API_MESSAGES);
      if (res.ok) messages = await res.json();
      else messages = [];
    } catch {
      messages = [];
    }
    messages.forEach((m) => {
      const pos = new THREE.Vector3(m.px, m.py, m.pz);
      const norm = new THREE.Vector3(m.nx, m.ny, m.nz);
      createHoleMesh(pos, norm, m.id);
    });
  }

  await loadMessages();

  // Float particles (plankton)
  const particleCount = 55;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = -visualExtent + Math.random() * visualRange;
    positions[i + 1] = Math.random() * 15;
    positions[i + 2] = -visualExtent + Math.random() * visualRange;
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

  // Dark dust particles — light up white when spotlight hits them
  const dustCount = 350;
  const dustGeo = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount * 3; i += 3) {
    dustPositions[i] = -visualExtent + Math.random() * visualRange;
    dustPositions[i + 1] = Math.random() * 15;
    dustPositions[i + 2] = -visualExtent + Math.random() * visualRange;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustUniforms = {
    uLightPos: { value: new THREE.Vector3(0, 0, 0) },
    uLightIntensity: { value: 0 },
    uLightRadius: { value: 35 },
  };
  const dustMat = new THREE.ShaderMaterial({
    uniforms: dustUniforms,
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = 80.0 * (1.0 / -mvPosition.z);
      }
    `,
    fragmentShader: `
      uniform vec3 uLightPos;
      uniform float uLightIntensity;
      uniform float uLightRadius;
      varying vec3 vWorldPos;
      void main() {
        float d = distance(vWorldPos, uLightPos);
        float falloff = 1.0 - smoothstep(0.0, uLightRadius, d);
        float lit = uLightIntensity > 0.0 ? falloff : 0.0;
        vec3 dark = vec3(0.12, 0.18, 0.22);
        vec3 bright = vec3(0.95, 0.98, 1.0);
        vec3 col = mix(dark, bright, lit);
        float alpha = 0.5 + lit * 0.5;
        float dist = length(gl_PointCoord - 0.5) * 2.0;
        alpha *= 1.0 - smoothstep(0.6, 1.0, dist);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  scene.add(dustParticles);
  dustPos = dustGeo.attributes.position;

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
  lightBtn.textContent = spotlightOn ? 'Light: ON' : 'Light: OFF';
  lightBtn.classList.toggle('on', spotlightOn);
  lightBtn.addEventListener('click', () => {
    spotlightOn = !spotlightOn;
    playerLight.intensity = spotlightOn ? 45 : 0;
    renderer.toneMappingExposure = spotlightOn ? 0.95 : 0.6;
    lightBtn.textContent = spotlightOn ? 'Light: ON' : 'Light: OFF';
    lightBtn.classList.toggle('on', spotlightOn);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.setPixelRatio(renderer.getPixelRatio());
    crtPass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
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

  drillInput.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
      e.preventDefault();
      saveDrilledMessage();
    }
  });
  drillInput.addEventListener('input', () => {
    document.getElementById('drill-hint').textContent =
      `${drillInput.value.length}/${MAX_MESSAGE_LENGTH} characters · Enter to save`;
  });

  readOverlay.addEventListener('click', () => {
    if (readOverlay.classList.contains('active')) closeReadOverlay();
  });
}

function getRaycastTargets() {
  const targets = [libraryBoulder];
  scene.traverse((obj) => {
    if (obj.name === 'message-hole') targets.push(obj);
  });
  return targets;
}

function startDrillSprayAnimation(worldPoint, worldNormal) {
  if (drillSpray) return;
  camera.getWorldDirection(_forward);
  _right.crossVectors(_up, _forward).normalize();
  // Enter from top-right of view: right + up, slightly in front
  const topRightOffset = _right.clone().multiplyScalar(1.4)
    .add(_up.clone().multiplyScalar(1.0))
    .add(_forward.clone().multiplyScalar(0.4));
  const startPos = camera.position.clone().add(topRightOffset);

  // Snake path: curve from top-right to rock with a bend in the middle
  const mid = startPos.clone().lerp(worldPoint, 0.5);
  const perp = new THREE.Vector3().subVectors(worldPoint, startPos).cross(_up).normalize();
  if (perp.lengthSq() < 0.01) perp.set(1, 0, 0);
  mid.add(perp.multiplyScalar(2.5)); // bulge for snake
  mid.add(_up.clone().multiplyScalar(1.2));
  const curve = new THREE.QuadraticBezierCurve3(startPos, mid, worldPoint);
  const pathPoints = curve.getPoints(24);
  if (pathPoints.length < 2) return;

  const group = new THREE.Group();
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0x4a5055,
    roughness: 0.85,
    metalness: 0.15,
  });
  const segments = [];
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const a = pathPoints[i];
    const b = pathPoints[i + 1];
    const segDir = new THREE.Vector3().subVectors(b, a);
    const len = segDir.length();
    if (len < 0.01) continue;
    segDir.normalize();
    const segGeo = new THREE.CylinderGeometry(TUBE_RADIUS, TUBE_RADIUS * 1.02, len, 8);
    const seg = new THREE.Mesh(segGeo, tubeMat);
    seg.position.copy(a).add(segDir.clone().multiplyScalar(len * 0.5));
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), segDir);
    seg.scale.y = 0;
    seg.visible = false; // only show when segment is actually growing (avoids black dots)
    seg.castShadow = true;
    group.add(seg);
    segments.push(seg);
  }
  const tubeDir = new THREE.Vector3().subVectors(worldPoint, pathPoints[pathPoints.length - 2]).normalize();

  const jets = [];
  const tangent = new THREE.Vector3().crossVectors(tubeDir, _up).normalize();
  if (tangent.lengthSq() < 0.01) tangent.set(1, 0, 0);
  const tangent2 = new THREE.Vector3().crossVectors(tubeDir, tangent).normalize();
  const waterMat = new THREE.MeshBasicMaterial({
    color: 0x7ab8d4,
    transparent: true,
    opacity: 0.9,
  });
  for (let i = 0; i < SPRAY_JET_COUNT; i++) {
    const angle = (i / SPRAY_JET_COUNT) * Math.PI * 2;
    const out = tangent.clone().multiplyScalar(Math.cos(angle))
      .add(tangent2.clone().multiplyScalar(Math.sin(angle)));
    const intoRock = worldNormal.clone().multiplyScalar(0.4);
    const jetDir = out.add(intoRock).normalize();
    const jetGeo = new THREE.BoxGeometry(0.04, 0.08, 0.03);
    const jet = new THREE.Mesh(jetGeo, waterMat.clone());
    jet.position.copy(worldPoint);
    jet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), jetDir);
    jet.visible = false;
    group.add(jet);
    jets.push({
      mesh: jet,
      dir: jetDir.clone(),
      dist: 0,
      speed: SPRAY_SPEED * (0.7 + Math.random() * 0.6),
    });
  }

  // Jagged blue splash ring at tube tip (in plane perpendicular to tube)
  const ringSegs = 24;
  const baseR = 0.14;
  const jagAmp = 0.04;
  const ringShape = new THREE.Shape();
  for (let i = 0; i <= ringSegs; i++) {
    const a = (i / ringSegs) * Math.PI * 2;
    const jag = jagAmp * (Math.sin(a * 4) + 0.7 * Math.sin(a * 7));
    const r = baseR + jag;
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    if (i === 0) ringShape.moveTo(x, y);
    else ringShape.lineTo(x, y);
  }
  ringShape.closePath();
  const ringGeo = new THREE.ShapeGeometry(ringShape);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x3399dd,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const splashRing = new THREE.Mesh(ringGeo, ringMat);
  splashRing.position.copy(worldPoint);
  splashRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tubeDir);
  splashRing.visible = false;
  group.add(splashRing);

  group.userData = { worldPoint, worldNormal };
  scene.add(group);
  drillSpray = {
    group,
    segments,
    segmentCount: segments.length,
    jets,
    splashRing,
    startTime: performance.now() / 1000,
    lastSprayPulse: 0,
  };
}

function updateDrillSpray(elapsed, delta = 0.016) {
  if (!drillSpray) return;
  const { segments, segmentCount, jets } = drillSpray;
  const worldPoint = drillSpray.group.userData.worldPoint;

  const extendEnd = TUBE_EXTEND_DURATION;
  const connectedEnd = extendEnd + CONNECTED_DURATION;
  const retractEnd = connectedEnd + TUBE_RETRACT_DURATION;

  if (elapsed < extendEnd) {
    // Snake in: reveal segments from start (top-right) to end (rock); hide until segment is actually growing
    const extendT = elapsed / extendEnd;
    const smoothT = extendT * extendT * (3 - 2 * extendT);
    segments.forEach((seg, i) => {
      const segT = Math.max(0, Math.min(1, (smoothT - i / segmentCount) * segmentCount));
      const smoothSeg = segT * segT * (3 - 2 * segT);
      seg.visible = smoothSeg > 0.02;
      seg.scale.y = smoothSeg;
    });
  } else if (elapsed < connectedEnd) {
    // Connected: tube full, water from tip the whole time
    segments.forEach((seg) => {
      seg.visible = true;
      seg.scale.y = 1;
    });
  } else if (elapsed < retractEnd) {
    // Snake back: retract from rock end to top-right (reverse order)
    const retractElapsed = elapsed - connectedEnd;
    const retractT = Math.min(1, retractElapsed / TUBE_RETRACT_DURATION);
    const smoothRetract = retractT * retractT * (3 - 2 * retractT);
    segments.forEach((seg, i) => {
      const j = segmentCount - 1 - i; // j=0 is last segment (rock end)
      const segRetractT = Math.max(0, Math.min(1, (smoothRetract - j / segmentCount) * segmentCount));
      const smoothSeg = segRetractT * segRetractT * (3 - 2 * segRetractT);
      seg.scale.y = 1 - smoothSeg;
      seg.visible = seg.scale.y > 0.02;
    });
  }

  // Water from tip only while tube is connected; cut as soon as tube leaves (retract starts)
  const sprayActive = elapsed >= extendEnd && elapsed < connectedEnd;
  const { splashRing } = drillSpray;
  if (sprayActive) {
    const timeInSpray = elapsed - extendEnd;
    if (timeInSpray - drillSpray.lastSprayPulse >= SPRAY_PULSE_INTERVAL) {
      drillSpray.lastSprayPulse = timeInSpray;
      jets.forEach((j) => {
        j.dist = 0;
        j.mesh.material.opacity = 0.9;
        j.mesh.scale.setScalar(1);
      });
    }
    jets.forEach((j) => {
      j.mesh.visible = true;
      j.dist += j.speed * delta;
      j.mesh.position.copy(worldPoint).add(j.dir.clone().multiplyScalar(j.dist));
      j.mesh.material.opacity = Math.max(0, (j.mesh.material.opacity ?? 0.9) - delta * 2.2);
      j.mesh.scale.setScalar(1 + j.dist * 1.5);
    });
    // Jagged blue splash ring at tip — visible and shifting while connected
    splashRing.visible = true;
    splashRing.rotation.z += delta * 5.5; // shifting
    splashRing.material.opacity = 0.5 + 0.2 * Math.sin(elapsed * 12);
  } else {
    jets.forEach((j) => { j.mesh.visible = false; });
    splashRing.visible = false;
  }

  if (elapsed >= DRILL_SPRAY_DURATION) {
    scene.remove(drillSpray.group);
    drillSpray = null;
  }
}

function playSonarPing() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    gain.gain.setValueAtTime(0, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.18;
    const echoGain = ctx.createGain();
    echoGain.gain.value = 0.45;
    gain.connect(delay);
    delay.connect(echoGain);
    echoGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (_) {}
}

function startReadTubeAnimation(holeWorldPosition) {
  if (readTube) return;
  camera.getWorldDirection(_forward);
  _right.crossVectors(_up, _forward).normalize();
  const left = _right.clone().negate();
  const topLeftOffset = left.clone().multiplyScalar(1.4)
    .add(_up.clone().multiplyScalar(1.0))
    .add(_forward.clone().multiplyScalar(0.4));
  const startPos = camera.position.clone().add(topLeftOffset);
  const worldPoint = holeWorldPosition.clone();

  const mid = startPos.clone().lerp(worldPoint, 0.5);
  const perp = new THREE.Vector3().subVectors(worldPoint, startPos).cross(_up).normalize();
  if (perp.lengthSq() < 0.01) perp.set(-1, 0, 0);
  mid.add(perp.multiplyScalar(-2.2));
  mid.add(_up.clone().multiplyScalar(1.0));
  const curve = new THREE.QuadraticBezierCurve3(startPos, mid, worldPoint);
  const pathPoints = curve.getPoints(20);
  if (pathPoints.length < 2) return;

  const group = new THREE.Group();
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0x3d4348,
    roughness: 0.85,
    metalness: 0.12,
  });
  const segments = [];
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const a = pathPoints[i];
    const b = pathPoints[i + 1];
    const segDir = new THREE.Vector3().subVectors(b, a);
    const len = segDir.length();
    if (len < 0.01) continue;
    segDir.normalize();
    const segGeo = new THREE.CylinderGeometry(READ_TUBE_RADIUS, READ_TUBE_RADIUS * 1.02, len, 6);
    const seg = new THREE.Mesh(segGeo, tubeMat);
    seg.position.copy(a).add(segDir.clone().multiplyScalar(len * 0.5));
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), segDir);
    seg.scale.y = 0;
    seg.visible = false;
    seg.castShadow = true;
    group.add(seg);
    segments.push(seg);
  }
  const tubeDir = new THREE.Vector3().subVectors(worldPoint, pathPoints[pathPoints.length - 2]).normalize();

  const speakerTip = new THREE.Mesh(
    new THREE.BoxGeometry(SPEAKER_TIP_SIZE, SPEAKER_TIP_SIZE * 0.7, SPEAKER_TIP_SIZE * 1.1),
    new THREE.MeshStandardMaterial({ color: 0x353a3f, roughness: 0.8, metalness: 0.1 })
  );
  speakerTip.position.copy(worldPoint);
  speakerTip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tubeDir);
  speakerTip.scale.set(0, 0, 0);
  speakerTip.visible = false;
  group.add(speakerTip);

  const ripples = [];
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0x44aaff,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (let r = 0; r < RIPPLE_COUNT; r++) {
    const pts = [];
    const segs = 32;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pts.push(new THREE.Vector3(0.08 * Math.cos(a), 0.08 * Math.sin(a), 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({
      color: 0x66bbff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }));
    line.position.copy(worldPoint);
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tubeDir);
    line.scale.setScalar(0);
    line.visible = false;
    group.add(line);
    ripples.push({ line, startTime: -1 });
  }

  group.userData = { worldPoint };
  scene.add(group);
  readTube = {
    group,
    segments,
    segmentCount: segments.length,
    speakerTip,
    ripples,
    pingPlayed: false,
    startTime: performance.now() / 1000,
  };
}

function updateReadTube(elapsed, delta = 0.016) {
  if (!readTube) return;
  const { segments, segmentCount, speakerTip, ripples } = readTube;
  const worldPoint = readTube.group.userData.worldPoint;

  const extendEnd = READ_TUBE_EXTEND_DURATION;
  const connectedEnd = extendEnd + READ_TUBE_CONNECTED_DURATION;
  const retractEnd = connectedEnd + READ_TUBE_RETRACT_DURATION;

  if (elapsed < extendEnd) {
    const extendT = elapsed / extendEnd;
    const smoothT = extendT * extendT * (3 - 2 * extendT);
    segments.forEach((seg, i) => {
      const segT = Math.max(0, Math.min(1, (smoothT - i / segmentCount) * segmentCount));
      const smoothSeg = segT * segT * (3 - 2 * segT);
      seg.visible = smoothSeg > 0.02;
      seg.scale.y = smoothSeg;
    });
    const tipT = Math.max(0, (smoothT - (segmentCount - 1) / segmentCount) * segmentCount);
    const smoothTip = tipT * tipT * (3 - 2 * tipT);
    if (smoothTip > 0.02) {
      speakerTip.visible = true;
      speakerTip.scale.setScalar(smoothTip);
    }
  } else if (elapsed < connectedEnd) {
    segments.forEach((seg) => { seg.visible = true; seg.scale.y = 1; });
    speakerTip.visible = true;
    speakerTip.scale.setScalar(1);
    if (!readTube.pingPlayed) {
      readTube.pingPlayed = true;
      playSonarPing();
      const t = performance.now() / 1000;
      ripples.forEach((r, i) => {
        r.startTime = t + i * 0.08;
      });
    }
    ripples.forEach((r) => {
      if (r.startTime < 0) return;
      const age = (performance.now() / 1000) - r.startTime;
      if (age <= 0) return;
      r.line.visible = true;
      const scale = age * RIPPLE_EXPAND_SPEED;
      r.line.scale.setScalar(scale);
      r.line.material.opacity = Math.max(0, 0.9 * (1 - age / RIPPLE_DURATION));
    });
  } else if (elapsed < retractEnd) {
    ripples.forEach((r) => {
      const age = r.startTime >= 0 ? (performance.now() / 1000) - r.startTime : 0;
      if (age > 0) {
        r.line.visible = true;
        r.line.scale.setScalar(age * RIPPLE_EXPAND_SPEED);
        r.line.material.opacity = Math.max(0, 0.9 * (1 - age / RIPPLE_DURATION));
      }
    });
    const retractElapsed = elapsed - connectedEnd;
    const retractT = Math.min(1, retractElapsed / READ_TUBE_RETRACT_DURATION);
    const smoothRetract = retractT * retractT * (3 - 2 * retractT);
    segments.forEach((seg, i) => {
      const j = segmentCount - 1 - i;
      const segRetractT = Math.max(0, Math.min(1, (smoothRetract - j / segmentCount) * segmentCount));
      const smoothSeg = segRetractT * segRetractT * (3 - 2 * segRetractT);
      seg.scale.y = 1 - smoothSeg;
      seg.visible = seg.scale.y > 0.02;
    });
    const tipRetractT = Math.max(0, (smoothRetract - (segmentCount - 1) / segmentCount) * segmentCount);
    const smoothTipRetract = tipRetractT * tipRetractT * (3 - 2 * tipRetractT);
    speakerTip.scale.setScalar(1 - smoothTipRetract);
    speakerTip.visible = speakerTip.scale.x > 0.02;
  }

  if (elapsed >= READ_TUBE_DURATION) {
    scene.remove(readTube.group);
    readTube = null;
    if (pendingReadMessage !== null) {
      reading = false;
      deleteTargetText = null;
      currentMessageText = null;
      readOverlay.classList.add('active');
      typewriterTargetText = pendingReadMessage;
      typewriterIndex = 0;
      typewriterLastTime = performance.now() / 1000;
      readMessage.textContent = '';
      pendingReadMessage = null;
    }
  }
}

async function saveDrilledMessage() {
  const text = drillInput.value.trim();
  if (!text || !pendingHoleData) return;
  startDrillSprayAnimation(pendingHoleData.point.clone(), pendingHoleData.normal.clone());
  const id = crypto.randomUUID?.() || Date.now().toString(36);
  const m = {
    id,
    px: pendingHoleData.point.x, py: pendingHoleData.point.y, pz: pendingHoleData.point.z,
    nx: pendingHoleData.normal.x, ny: pendingHoleData.normal.y, nz: pendingHoleData.normal.z,
    message: text,
  };
  try {
    const res = await fetch(API_MESSAGES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(m),
    });
    if (res.ok) {
      messages.push(m);
      if (previewHole) {
        scene.remove(previewHole);
        previewHole = null;
      }
      createHoleMesh(pendingHoleData.point.clone(), pendingHoleData.normal.clone(), id);
      exitDrillMode();
    }
  } catch {
    // Server unreachable — could fall back to localStorage if desired
  }
}

function createHoleMesh(pos, normal, id) {
  const group = new THREE.Group();
  group.position.copy(pos);
  group.position.add(normal.clone().multiplyScalar(0.02));
  group.lookAt(pos.clone().add(normal));

  const holeRadius = 0.05;
  const holeGeo = new THREE.CircleGeometry(holeRadius, 12);
  const holeMat = new THREE.MeshStandardMaterial({
    color: 0x050508,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const holeCircle = new THREE.Mesh(holeGeo, holeMat);
  group.add(holeCircle);

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x2a3538,
    roughness: 0.9,
    metalness: 0,
  });
  const rimRadius = holeRadius * 1.6;
  const rimCount = 5;
  for (let i = 0; i < rimCount; i++) {
    const angle = (i / rimCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const x = Math.cos(angle) * rimRadius;
    const z = Math.sin(angle) * rimRadius;
    const rock = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.012, 0.018),
      rockMat.clone()
    );
    rock.position.set(x, 0.006 + Math.random() * 0.006, z);
    rock.rotation.set(Math.random() * 0.4, angle, Math.random() * 0.3);
    rock.scale.set(0.8 + Math.random() * 0.6, 1, 0.8 + Math.random() * 0.6);
    group.add(rock);
  }

  group.userData.messageId = id;
  group.name = 'message-hole';
  scene.add(group);
  const msg = messages.find((m) => m.id === id);
  if (msg) group.userData.message = msg.message;
  return group;
}

function exitDrillMode() {
  drilling = false;
  pendingHoleData = null;
  drillInput.value = '';
  drillUI.classList.remove('active');
  drillInput.blur();
}

function closeReadOverlay() {
  reading = false;
  readOverlay.classList.remove('active');
  typewriterTargetText = null;
  currentMessageText = null;
  deleteTargetText = null;
}

function startDeleteAnimation() {
  const text = readMessage.textContent;
  if (!text) {
    readOverlay.classList.remove('active');
    currentMessageText = null;
    return;
  }
  typewriterTargetText = null;
  typewriterIndex = 0;
  deleteTargetText = text;
  deleteIndex = text.length;
  deleteLastTime = performance.now() / 1000;
}

function onKeyDown(e) {
  if (reading) return;
  if (readOverlay.classList.contains('active') && (e.code === 'KeyE' || e.code === 'Escape')) {
    e.preventDefault();
    if (readPromptVisible && hoveredHole && e.code === 'KeyE') {
      const msg = messages.find((m) => m.id === hoveredHole.userData.messageId);
      if (msg) {
        interactPrompt.classList.remove('visible');
        startDeleteAnimation();
        pendingReadMessage = msg.message;
        hoveredHole.getWorldPosition(_holeWorldPos);
        startReadTubeAnimation(_holeWorldPos.clone());
        reading = true;
      }
    } else {
      closeReadOverlay();
    }
    return;
  }
  if (drilling) {
    if (e.code === 'Escape') {
      e.preventDefault();
      if (previewHole) {
        scene.remove(previewHole);
        previewHole = null;
      }
      exitDrillMode();
    }
    return;
  }
  if (e.code === 'KeyF' || e.code === 'KeyL' || e.key === 'f' || e.key === 'F' || e.key === 'l' || e.key === 'L') {
    if (!e.repeat) {
      e.preventDefault();
      spotlightOn = !spotlightOn;
      playerLight.intensity = spotlightOn ? 45 : 0;
      renderer.toneMappingExposure = spotlightOn ? 0.95 : 0.6;
      lightBtn.textContent = spotlightOn ? 'Light: ON' : 'Light: OFF';
      lightBtn.classList.toggle('on', spotlightOn);
    }
    return;
  }
  if (e.code === 'KeyE' && readPromptVisible && hoveredHole) {
    e.preventDefault();
    const msg = messages.find((m) => m.id === hoveredHole.userData.messageId);
    if (msg) {
      interactPrompt.classList.remove('visible');
      if (readOverlay.classList.contains('active') && (currentMessageText !== null || typewriterTargetText !== null)) {
        startDeleteAnimation();
      }
      pendingReadMessage = msg.message;
      hoveredHole.getWorldPosition(_holeWorldPos);
      startReadTubeAnimation(_holeWorldPos.clone());
      reading = true;
    }
    return;
  }
  if (e.code === 'Enter' && drillPromptVisible && !drilling) {
    e.preventDefault();
    if (pendingHoleData) {
      interactPrompt.classList.remove('visible');
      previewHole = createHoleMesh(pendingHoleData.point.clone(), pendingHoleData.normal.clone(), 'preview');
      previewHole.userData.messageId = null;
      drilling = true;
      drillUI.classList.add('active');
      drillInput.value = '';
      document.getElementById('drill-hint').textContent = `0/${MAX_MESSAGE_LENGTH} characters · Enter to save`;
      drillInput.focus();
      controls.unlock();
    }
    return;
  }
  switch (e.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
    case 'Space': moveUp = true; break;
    case 'ControlLeft': case 'ControlRight': moveDown = true; break;
    case 'ShiftLeft': case 'ShiftRight': boost = true; break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyD': moveRight = false; break;
    case 'Space': moveUp = false; break;
    case 'ControlLeft': case 'ControlRight': moveDown = false; break;
    case 'ShiftLeft': case 'ShiftRight': boost = false; break;
  }
}

function updateMovement(delta) {
  if (!controls.isLocked) return;

  const anyHorizontal = moveForward || moveBackward || moveLeft || moveRight;
  const boosting = boost && boostAmount > 0 && anyHorizontal;
  const speed = boosting ? MOVE_SPEED * BOOST_SPEED_MULT : MOVE_SPEED;

  if (boosting) {
    boostAmount = Math.max(0, boostAmount - BOOST_DEPLETE_RATE * delta);
  } else {
    boostAmount = Math.min(1, boostAmount + BOOST_REGEN_RATE * delta);
  }
  if (boostMeterFill) {
    boostMeterFill.style.transform = `scaleX(${boostAmount})`;
  }

  velocity.x -= velocity.x * 5.0 * delta;
  velocity.y -= velocity.y * 5.0 * delta;
  velocity.z -= velocity.z * 5.0 * delta;

  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.y = Number(moveUp) - Number(moveDown);
  direction.normalize();

  if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
  if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;
  if (moveUp || moveDown) velocity.y += direction.y * MOVE_SPEED * delta;

  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);
  camera.position.y += velocity.y * delta;

  camera.position.y = Math.max(0.5, Math.min(CEILING_Y, camera.position.y));
  camera.position.x = Math.max(BOUND_MIN, Math.min(BOUND_MAX, camera.position.x));
  camera.position.z = Math.max(BOUND_MIN, Math.min(BOUND_MAX, camera.position.z));
}

function animate(time) {
  requestAnimationFrame(animate);
  time = time ?? performance.now();
  const delta = Math.min(0.05, 0.016);

  updateMovement(delta);

  // Water color lightens as player swims up
  const depthT = Math.max(0, Math.min(1, (camera.position.y - 0.5) / (CEILING_Y - 0.5)));
  scene.background.lerpColors(WATER_COLOR_DEEP, WATER_COLOR_SURFACE, depthT);
  scene.fog.color.lerpColors(WATER_COLOR_DEEP, WATER_COLOR_SURFACE, depthT);

  // Player light follows camera
  playerLight.position.copy(camera.position);

  // Floating stones — when moving forward, organize into a horizontal line in front;
  // otherwise gently orbit around the player near the bottom of view.
  const tSec = (time ?? performance.now()) / 1000;
  const forwardPressed = moveForward && !moveBackward;
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  fwd.y = 0;
  if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
  fwd.normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

  FLOATING_STONES.forEach((stone, index) => {
    const d = stone.userData;
    const baseY = Math.max(0.7, camera.position.y + d.heightOffset);
    const bob = Math.sin(tSec * d.bobSpeed + d.angleOffset) * d.bobAmp;

    // Compute target position for this frame
    let target = new THREE.Vector3();
    if (forwardPressed) {
      // Horizontal line in front of player
      const spacing = 1.2; // distance between stones
      const offsetIndex = index - (FLOATING_STONES.length - 1) / 2;
      const lateralOffset = offsetIndex * spacing;
      const distanceInFront = 3.2; // how far in front of camera

      const center = new THREE.Vector3().copy(camera.position)
        .add(fwd.clone().multiplyScalar(distanceInFront))
        .add(new THREE.Vector3(0, d.heightOffset, 0));

      target.copy(center).add(right.clone().multiplyScalar(lateralOffset));
    } else {
      // Gentle orbit when not actively moving forward
      const angle = d.angleOffset + tSec * 0.25;
      target.set(
        camera.position.x + Math.cos(angle) * d.radius,
        camera.position.y + d.heightOffset,
        camera.position.z + Math.sin(angle) * d.radius,
      );
    }

    target.y = baseY + bob;

    // Smoothly ease current position toward target
    const lerpFactor = forwardPressed ? 0.08 : 0.06; // slightly faster when organizing
    stone.position.lerp(target, lerpFactor);

    stone.rotation.y += d.spinSpeed * delta;

    // If this stone has the joystick, tilt it based on movement direction
    if (d.joystick) {
      // Desired tilt from WASD input (local X/Z of joystick on stone)
      const desiredTiltX = (moveForward ? -1 : 0) + (moveBackward ? 1 : 0);
      const desiredTiltZ = (moveRight ? 1 : 0) + (moveLeft ? -1 : 0);

      // Normalize so diagonals aren't stronger
      let len = Math.hypot(desiredTiltX, desiredTiltZ);
      if (len > 1e-3) {
        d.joystickTiltX = THREE.MathUtils.lerp(d.joystickTiltX, desiredTiltX / len, 0.18);
        d.joystickTiltZ = THREE.MathUtils.lerp(d.joystickTiltZ, desiredTiltZ / len, 0.18);
      } else {
        // Ease back toward center when no input
        d.joystickTiltX = THREE.MathUtils.lerp(d.joystickTiltX, 0, 0.12);
        d.joystickTiltZ = THREE.MathUtils.lerp(d.joystickTiltZ, 0, 0.12);
      }

      const maxTilt = 0.32; // radians
      d.joystick.rotation.x = d.joystickTiltX * maxTilt;
      d.joystick.rotation.z = d.joystickTiltZ * maxTilt;
    }

    // Radar sweep animation — full rotation every 3 seconds
    if (d.radar && d.radarSweep) {
      const elapsed = tSec - d.radarStartTime;
      const period = 3.0;
      const t = (elapsed % period) / period;
      d.radarSweep.rotation.z = -t * Math.PI * 2;
    }

    // Radar library ping — show library bearing relative to world north (+Z)
    if (d.radar && d.radarPing) {
      const toLib = new THREE.Vector3().subVectors(LIBRARY_POSITION, camera.position);
      toLib.y = 0;
      if (toLib.lengthSq() > 1e-4) {
        const ang = Math.atan2(toLib.x, toLib.z); // 0 = +Z, increasing toward +X
        const r = 0.75 * 0.45; // 75% of radar radius
        const x = Math.sin(ang) * r;
        const z = Math.cos(ang) * r;
        d.radarPing.position.set(x, 0.002, z);

        // Gentle pulse so the ping feels alive
        const pulse = 0.8 + 0.25 * Math.sin(tSec * 2.0);
        d.radarPing.scale.setScalar(pulse);
      }
    }

    // HUD — redraw environment stats on the last pebble
    if (d.hudCanvas && d.hudTexture) {
      const ctx = d.hudCanvas.getContext('2d');
      const w = d.hudCanvas.width;
      const h = d.hudCanvas.height;

      ctx.fillStyle = 'rgba(0, 12, 24, 0.92)';
      ctx.fillRect(0, 0, w, h);

      const heading = (Math.atan2(fwd.x, fwd.z) * 180 / Math.PI + 360) % 360;
      const depth = camera.position.y;
      const distLib = camera.position.distanceTo(LIBRARY_POSITION);
      const pressure = (depth * 0.08 + 1).toFixed(2);
      const temp = (4.2 - depth * 0.02 + Math.sin(tSec * 0.3) * 0.1).toFixed(1);

      ctx.font = '11px "Share Tech Mono", monospace';
      ctx.fillStyle = 'rgba(74, 211, 181, 0.95)';
      ctx.fillText('DEPTH', 12, 28);
      ctx.fillText('HEAD', 12, 52);
      ctx.fillText('LIB', 12, 76);
      ctx.fillText('PRES', 12, 100);
      ctx.fillText('TEMP', 12, 124);

      ctx.fillStyle = 'rgba(170, 230, 255, 0.98)';
      ctx.textAlign = 'right';
      ctx.fillText(`${depth.toFixed(1)} m`, w - 12, 28);
      ctx.fillText(`${heading.toFixed(0)}°`, w - 12, 52);
      ctx.fillText(`${distLib.toFixed(1)} m`, w - 12, 76);
      ctx.fillText(`${pressure} bar`, w - 12, 100);
      ctx.fillText(`${temp} °C`, w - 12, 124);
      ctx.textAlign = 'left';

      ctx.strokeStyle = 'rgba(74, 211, 181, 0.4)';
      ctx.strokeRect(2, 2, w - 4, h - 4);

      d.hudTexture.needsUpdate = true;
    }
  });

  // Kelp — stalk and leaves sway in current
  KELP.forEach((kelp) => {
    const stalkMesh = kelp.children[0];
    const pos = stalkMesh.geometry.attributes.position;
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
    stalkMesh.geometry.computeVertexNormals();

    kelp.userData.leaves.forEach((leaf) => {
      const lt = leaf.height / h;
      const sway = leaf.amp * Math.sin(time * freq * 1.2 + lt * waveSpeed + leaf.phase);
      leaf.mesh.rotation.y = leaf.baseRotY + sway;
      leaf.mesh.rotation.z = leaf.baseRotZ + sway * 0.5;
    });
  });

  // Flat leaves and shrubs — gentle sway
  VEGETATION.forEach((veg) => {
    if (veg.userData.baseRotZ !== undefined) {
      veg.rotation.z = veg.userData.baseRotZ + veg.userData.amp * Math.sin(time * 0.002 + veg.userData.phase);
    } else {
      veg.rotation.y = veg.userData.amp * Math.sin(time * 0.0018 + veg.userData.phase);
    }
  });

  const visualExtentAnim = BOUND_MAX + FLAT_EXTEND;
  const visualRangeAnim = visualExtentAnim * 2;
  // Fish swim — figure-8 path
  FISH.forEach((fish) => {
    const d = fish.userData;
    d.t += delta * d.speed;
    const x = d.cx + d.radius * Math.sin(d.t);
    const z = d.cz + d.radius * Math.sin(2 * d.t);
    fish.position.x = x;
    fish.position.z = z;
    const velX = d.radius * Math.cos(d.t);
    const velZ = d.radius * 2 * Math.cos(2 * d.t);
    fish.rotation.y = Math.atan2(velX, -velZ);
  });

  // Fish schools swim — figure-8 path, all oriented same direction
  FISH_SCHOOLS.forEach((school) => {
    const d = school.userData;
    d.t += delta * d.speed;
    const x = d.cx + d.radius * Math.sin(d.t);
    const z = d.cz + d.radius * Math.sin(2 * d.t);
    school.position.x = x;
    school.position.z = z;
    const velX = d.radius * Math.cos(d.t);
    const velZ = d.radius * 2 * Math.cos(2 * d.t);
    school.rotation.y = Math.atan2(velX, -velZ);
  });

  // Particle drift
  for (let i = 0; i < particlePos.count; i++) {
    particlePos.setY(i, (particlePos.getY(i) + delta * 0.2) % 15);
  }
  particlePos.needsUpdate = true;

  // Dust drift + spotlight uniforms
  if (dustPos && dustUniforms) {
    for (let i = 0; i < dustPos.count; i++) {
      dustPos.setY(i, (dustPos.getY(i) + delta * 0.15) % 15);
    }
    dustPos.needsUpdate = true;
    dustUniforms.uLightPos.value.copy(camera.position);
    dustUniforms.uLightIntensity.value = spotlightOn ? 45 : 0;
  }

  // Message-entry spray animation
  if (drillSpray) {
    const elapsed = (time ?? performance.now()) / 1000 - drillSpray.startTime;
    updateDrillSpray(elapsed, delta);
  }
  // Read-message tube animation (snake to hole, sonar ping + ripples)
  if (readTube) {
    const elapsed = (time ?? performance.now()) / 1000 - readTube.startTime;
    updateReadTube(elapsed, delta);
  }
  const nowSec = (time ?? performance.now()) / 1000;
  // Typewriter for read message
  if (typewriterTargetText !== null && typewriterIndex < typewriterTargetText.length) {
    if (nowSec - typewriterLastTime >= TYPEWRITER_CHAR_DELAY) {
      typewriterLastTime = nowSec;
      typewriterIndex += 1;
      readMessage.textContent = typewriterTargetText.slice(0, typewriterIndex);
    }
  } else if (typewriterTargetText !== null) {
    currentMessageText = typewriterTargetText;
    messageDisplayStartTime = nowSec;
    messageDisplayDuration = Math.min(DISPLAY_DURATION_MAX, DISPLAY_DURATION_MIN + typewriterTargetText.length * DISPLAY_DURATION_PER_CHAR);
    typewriterTargetText = null;
  }
  // Display timer: after 5–10 s (by length), start delete animation
  if (currentMessageText !== null && deleteTargetText === null && readOverlay.classList.contains('active')) {
    if (nowSec >= messageDisplayStartTime + messageDisplayDuration) {
      startDeleteAnimation();
      currentMessageText = null;
    }
  }
  // Delete animation (one letter at a time)
  if (deleteTargetText !== null) {
    if (nowSec - deleteLastTime >= DELETE_CHAR_DELAY) {
      deleteLastTime = nowSec;
      deleteIndex -= 1;
      if (deleteIndex <= 0) {
        readMessage.textContent = '';
        readOverlay.classList.remove('active');
        deleteTargetText = null;
        currentMessageText = null;
      } else {
        readMessage.textContent = deleteTargetText.slice(0, deleteIndex);
      }
    }
  }

  // Compass — rotate ticks, position library icon when in view
  camera.getWorldDirection(_forward);
  _forward.y = 0;
  _forward.normalize();
  const heading = (Math.atan2(_forward.x, _forward.z) * 180 / Math.PI + 360) % 360;
  compassTicks.style.transform = `translateX(${heading * PX_PER_DEG - 360}px)`;

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

  // Library interaction — raycast from center of screen (allowed while read message is up so user can select another message)
  if (!drilling) {
    const distToLibrary = camera.position.distanceTo(LIBRARY_POSITION);
    rayOrigin.copy(camera.position);
    camera.getWorldDirection(rayDirection);
    raycaster.set(rayOrigin, rayDirection);
    const targets = getRaycastTargets();
    const hits = raycaster.intersectObjects(targets, true);

    drillPromptVisible = false;
    readPromptVisible = false;
    hoveredHole = null;
    if (hits.length > 0) {
      const hit = hits[0];
      const holeGroup = hit.object.name === 'message-hole' ? hit.object : (hit.object.parent?.name === 'message-hole' ? hit.object.parent : null);
      if (holeGroup) {
        if (distToLibrary < LIBRARY_INTERACT_DIST) {
          hoveredHole = holeGroup;
          readPromptVisible = true;
          interactPrompt.textContent = 'Press E to read message';
          interactPrompt.classList.add('visible');
        }
      } else if (hit.object.name === 'library') {
        if (distToLibrary < LIBRARY_INTERACT_DIST) {
          pendingHoleData = {
            point: hit.point.clone(),
            normal: hit.face.normal.clone().transformDirection(hit.object.matrixWorld),
          };
          drillPromptVisible = true;
          interactPrompt.textContent = 'Press Enter to drill a hole and write a message';
          interactPrompt.classList.add('visible');
        }
      }
    }
    if (!drillPromptVisible && !readPromptVisible) {
      interactPrompt.classList.remove('visible');
    }
  }

  crosshair.classList.toggle('interactable', drillPromptVisible || readPromptVisible);

  composer.render();
}

init().then(() => animate());
