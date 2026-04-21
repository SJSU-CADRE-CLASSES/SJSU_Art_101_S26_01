import * as THREE from 'three';
import { vertexShader, fragmentShader } from './shaders/project1/oscilloscope.js';
import { vertexShader2, fragmentShader2 } from './shaders/project2/baseShader.js';
import { vertexShaderDOF, fragmentShaderDOF } from './shaders/project2/dofShader.js';
import { setupShader3 } from './shaders/project3/setup.js';
import { setupShader4 } from './shaders/project4/setup.js';
import { setupShader5 } from './shaders/project5/setup.js';
import { setupShader6 } from './shaders/project6/setup.js';
import { mountProject1Controls } from './shaders/project1/controls.js';
import { mountProject2Controls } from './shaders/project2/controls.js';
import { mountProject3Controls } from './shaders/project3/controls.js';
import { mountProject4Controls } from './shaders/project4/controls.js';
import { mountProject5Controls } from './shaders/project5/controls.js';
import { mountProject6Controls } from './shaders/project6/controls.js';
import { setupLanding } from './setupLanding.js';

let baseTerrainHeight = 1.0;
let baseOscThickness = 0.1;
let baseSpecularIntensity = 5.0;
let baseSpecularShininess = 16.0;

const app = document.getElementById('app');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 2;

const renderer = new THREE.WebGLRenderer({ antialias: false }); 
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
app.appendChild(renderer.domElement);

// ==========================================
// PROJECT 1: OSCILLOSCOPE SETUP
// ==========================================
const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uControllerRot: { value: new THREE.Vector2(0, 0) },
    uThickness: { value: 0.1 },
    uStructureWidth: { value: 0.08 },
    uNoiseDensity: { value: 15.0 },
    uNoiseSpeed: { value: 2.0 },
    uOutlineTightness: { value: 4.0 },
    uInnerVolumeGlow: { value: 2.5 },
    uVignette: { value: 0.2 },
    uZoom: { value: 0.0 }
};

const planeGeo = new THREE.PlaneGeometry(2, 2);
const planeMat = new THREE.ShaderMaterial({
    vertexShader, fragmentShader, uniforms,
    depthWrite: false, depthTest: false
});
const shaderPlane = new THREE.Mesh(planeGeo, planeMat);

const bgScene = new THREE.Scene();
const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
bgScene.add(shaderPlane);

const dialGeometry = new THREE.IcosahedronGeometry(0.5, 1);
const dialMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
const controllerMesh = new THREE.LineSegments(new THREE.WireframeGeometry(dialGeometry), dialMaterial);
controllerMesh.visible = false; 
scene.add(controllerMesh);

// ==========================================
// PROJECT 2: DOF CAVERN SETUP
// ==========================================
const target2 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { 
    type: THREE.FloatType, 
    format: THREE.RGBAFormat 
});

const p2Uniforms = {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uBumpIntensity: { value: 0.5 },
    uLightSpeed: { value: 1.0 },
    uNoiseDensity: { value: 25.0 },
    uNoiseSpeed: { value: 10.0 },
    uCameraDolly: { value: 2.0 },
    uCameraRollSpeed: { value: 0.0 }
};

const p2BaseScene = new THREE.Scene();
const baseMat = new THREE.ShaderMaterial({
    vertexShader: vertexShader2, fragmentShader: fragmentShader2, uniforms: p2Uniforms,
    depthWrite: false, depthTest: false
});
p2BaseScene.add(new THREE.Mesh(planeGeo, baseMat));

const p2DOFUniforms = {
    tDiffuse: { value: target2.texture },
    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uFocalDepth: { value: 0.5 },
    uCircleOfConfusion: { value: 3.0 }
};

const p2PostScene = new THREE.Scene();
const dofMat = new THREE.ShaderMaterial({
    vertexShader: vertexShaderDOF, fragmentShader: fragmentShaderDOF, uniforms: p2DOFUniforms,
    depthWrite: false, depthTest: false
});
p2PostScene.add(new THREE.Mesh(planeGeo, dofMat));

// Modular Scenes
// Shaders 3, 4, and 5 exist in their respective external JavaScript files.

// ==========================================
// INTERACTION & UI LOGIC
// ==========================================
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let controllerRot = { x: 0, y: 0 };
let targetZoom = 0;
let currentZoom = 0;
/** When false, shader control panels are hidden; toggle with Shift+Space. */
let controlsVisible = false;

window.addEventListener('keydown', (e) => {
    if (!e.shiftKey || e.code !== 'Space') return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    controlsVisible = !controlsVisible;
});

window.addEventListener('scroll', () => {
    targetZoom = window.scrollY / window.innerHeight;
});

window.addEventListener('pointerdown', (e) => {
    if(e.target.tagName !== 'INPUT') {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    }
});
window.addEventListener('pointermove', (e) => {
    if (isDragging) {
        const deltaMove = { x: e.clientX - previousMousePosition.x, y: e.clientY - previousMousePosition.y };
        controllerRot.x += deltaMove.y * 0.01;
        controllerRot.y += deltaMove.x * 0.01;
        controllerMesh.rotation.set(controllerRot.x, controllerRot.y, 0);
        uniforms.uControllerRot.value.set(controllerRot.y, controllerRot.x);
        previousMousePosition = { x: e.clientX, y: e.clientY };
    }
});
window.addEventListener('pointerup', () => { isDragging = false; });

mountProject1Controls(document.getElementById('p1-controls'), {
    uniforms,
    onThicknessChange: (v) => { baseOscThickness = v; }
});
mountProject2Controls(document.getElementById('p2-controls'), { p2Uniforms, p2DOFUniforms });

const s3 = setupShader3(renderer);
const s4 = setupShader4(renderer);
const s5 = setupShader5(renderer);
const s6 = setupShader6(renderer);
const sLanding = setupLanding(renderer);

let isLanding = true;
const landingOverlay = document.getElementById('landing-overlay');
if(landingOverlay) {
    landingOverlay.addEventListener('click', () => {
        isLanding = false;
        document.body.classList.add('entered');
    });
}

mountProject3Controls(document.getElementById('p3-controls'), { s3 });
mountProject4Controls(document.getElementById('p4-controls'), { s4 });
mountProject5Controls(document.getElementById('p5-controls'), {
    s5,
    onTerrainChange: (v) => { baseTerrainHeight = v; }
});
mountProject6Controls(document.getElementById('p6-controls'), {
    s6,
    onSpecularIntensityChange: (v) => { baseSpecularIntensity = v; },
    onSpecularShininessChange: (v) => { baseSpecularShininess = v; }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    target2.setSize(window.innerWidth, window.innerHeight);
    uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    p2Uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    p2DOFUniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
});

// ==========================================
// RENDER MULTIPLEXER LOOP
// ==========================================
const clock = new THREE.Clock();
const nextProjectOverlay = document.getElementById('project-next');
const p1Controls = document.getElementById('p1-controls');
const p2Controls = document.getElementById('p2-controls');
const p3Controls = document.getElementById('p3-controls');
const p4Controls = document.getElementById('p4-controls');
const p5Controls = document.getElementById('p5-controls');
const p6Controls = document.getElementById('p6-controls');

function renderOscilloscope() {
    renderer.clear();
    renderer.render(bgScene, bgCamera);
    renderer.clearDepth();
    if (controllerMesh.visible) renderer.render(scene, camera);
}

function renderCavern() {
    renderer.setRenderTarget(target2);
    renderer.clear();
    renderer.render(p2BaseScene, bgCamera);
    
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(p2PostScene, bgCamera);
}

const scenesArray = [
    { id: 'oscilloscope', render: renderOscilloscope, ui: p1Controls },
    { id: 'cavern', render: renderCavern, ui: p2Controls },
    { id: 'shader3', render: s3.render, ui: p3Controls },
    { id: 'shader4', render: s4.render, ui: p4Controls },
    { id: 'shader5', render: s5.render, ui: p5Controls },
    { id: 'shader6', render: s6.render, ui: p6Controls }
];

function animate() {
    requestAnimationFrame(animate);
    
    const t = clock.getElapsedTime();
    uniforms.iTime.value = t;
    p2Uniforms.iTime.value = t;
    s3.uniforms.iTime.value = t;
    s4.uniforms.iTime.value = t;
    s5.uniforms.iTime.value = t;
    s6.uniforms.iTime.value = t;

    if (isLanding) {
        sLanding.render(t);
        return;
    }

    if (!isDragging && currentZoom < 1.0) {
        controllerMesh.rotation.y += 0.002;
        controllerMesh.rotation.x += 0.001;
        uniforms.uControllerRot.value.set(controllerMesh.rotation.y, controllerMesh.rotation.x);
    }

    currentZoom += (targetZoom - currentZoom) * 0.05;
    uniforms.uZoom.value = currentZoom;
    
    // The Active Scene Index uses Math.round() mapping 0->0, 1->1, 2->2 along the total native scroll height
    let activeIndex = Math.round(currentZoom);
    activeIndex = Math.max(0, Math.min(scenesArray.length - 1, activeIndex));
    
    // The Red Flash Membrane Transition logic. Flashes at exact X.5 transitions
    if (nextProjectOverlay) {
        let distFromTransition = Math.abs(currentZoom - (Math.floor(currentZoom) + 0.5));
        if (currentZoom > 0.05 && currentZoom < scenesArray.length - 1.05) {
            let val = 1.0 - (distFromTransition * 5.0); // Spikes exactly at 0.5, 1.5 boundaries
            nextProjectOverlay.style.opacity = Math.max(0, Math.min(1, val));
        } else {
            nextProjectOverlay.style.opacity = 0;
        }
    }

    renderer.autoClear = false;
    
    scenesArray.forEach((sceneData, index) => {
        if (index === activeIndex) {
            if (sceneData.ui) {
                if (controlsVisible) {
                    sceneData.ui.style.opacity = '1';
                    sceneData.ui.style.pointerEvents = 'auto';
                } else {
                    sceneData.ui.style.opacity = '0';
                    sceneData.ui.style.pointerEvents = 'none';
                }
            }
            if (index === 0) {
                uniforms.uThickness.value = baseOscThickness;
            }
            if (index === 4) {
                s5.uniforms.uTerrainHeight.value = baseTerrainHeight;
            }
            if (index === 5) {
                s6.uniforms.uSpecularIntensity.value = baseSpecularIntensity;
                s6.uniforms.uSpecularShininess.value = baseSpecularShininess;
            }
            sceneData.render();
        } else {
            if (sceneData.ui) {
                sceneData.ui.style.opacity = 0;
                sceneData.ui.style.pointerEvents = 'none';
            }
        }
    });
}

animate();
