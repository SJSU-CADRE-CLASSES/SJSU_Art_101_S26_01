class ThomasAttractor {
    constructor(b = 0.19, dt = 0.1) {
        this.b = b;
        this.dt = dt;
        this.internalSubsteps = 1;
        this.integratorFidelity = 0; // 0 = Euler, 1 = RK4
        this.reset();
    }

    reset() {
        this.x = (Math.random() * 2) - 1; // Random float between -1 and 1
        this.y = (Math.random() * 2) - 1;
        this.z = (Math.random() * 2) - 1;
    }

    derivatives(state) {
        return {
            x: -this.b * state.x + Math.sin(state.y),
            y: -this.b * state.y + Math.sin(state.z),
            z: -this.b * state.z + Math.sin(state.x)
        };
    }

    eulerStep(state, stepDt) {
        const d = this.derivatives(state);
        return {
            x: state.x + d.x * stepDt,
            y: state.y + d.y * stepDt,
            z: state.z + d.z * stepDt
        };
    }

    rk4Step(state, stepDt) {
        const k1 = this.derivatives(state);
        const s2 = {
            x: state.x + (k1.x * stepDt) / 2,
            y: state.y + (k1.y * stepDt) / 2,
            z: state.z + (k1.z * stepDt) / 2
        };
        const k2 = this.derivatives(s2);
        const s3 = {
            x: state.x + (k2.x * stepDt) / 2,
            y: state.y + (k2.y * stepDt) / 2,
            z: state.z + (k2.z * stepDt) / 2
        };
        const k3 = this.derivatives(s3);
        const s4 = {
            x: state.x + k3.x * stepDt,
            y: state.y + k3.y * stepDt,
            z: state.z + k3.z * stepDt
        };
        const k4 = this.derivatives(s4);

        return {
            x: state.x + (stepDt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
            y: state.y + (stepDt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
            z: state.z + (stepDt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z)
        };
    }

    update() {
        const substeps = Math.max(1, Math.floor(this.internalSubsteps));
        const stepDt = this.dt / substeps;
        const blend = Math.max(0, Math.min(1, this.integratorFidelity));

        for (let i = 0; i < substeps; i++) {
            const current = { x: this.x, y: this.y, z: this.z };
            const euler = this.eulerStep(current, stepDt);

            if (blend <= 0) {
                this.x = euler.x;
                this.y = euler.y;
                this.z = euler.z;
                continue;
            }

            const rk4 = this.rk4Step(current, stepDt);
            this.x = euler.x + (rk4.x - euler.x) * blend;
            this.y = euler.y + (rk4.y - euler.y) * blend;
            this.z = euler.z + (rk4.z - euler.z) * blend;
        }
    }

    getState() {
        return { x: this.x, y: this.y, z: this.z };
    }
}

// Initialize Engine
const attractor = new ThomasAttractor();

// Three.js Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Camera Position
camera.position.z = 5;

// The Object (Icosahedron)
const geometry = new THREE.IcosahedronGeometry(0.1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// The Trail (BufferGeometry Line)
const maxPoints = 2000;
const positions = new Float32Array(maxPoints * 3); // 3 vertices per point

// Initialize with starting coordinates
const startState = attractor.getState();
for (let i = 0; i < maxPoints; i++) {
    positions[i * 3] = startState.x;
    positions[i * 3 + 1] = startState.y;
    positions[i * 3 + 2] = startState.z;
}

const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
let currentTrailLength = maxPoints;
trailGeometry.setDrawRange(0, currentTrailLength);
let stepsPerFrame = 20;
let useArcLengthResample = false;

const trailMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.8
});

const trail = new THREE.Line(trailGeometry, trailMaterial);
scene.add(trail);

// The Reference (Grid Helper)
const gridHelper = new THREE.GridHelper(10, 10);
scene.add(gridHelper);

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// DOM Elements
const sliderB = document.getElementById('slider-b');
const sliderDt = document.getElementById('slider-dt');
const valB = document.getElementById('val-b');
const valDt = document.getElementById('val-dt');
const sliderCamZ = document.getElementById('slider-cam-z');
const valCamZ = document.getElementById('val-cam-z');
const sliderTrailLength = document.getElementById('slider-trail-length');
const valTrailLength = document.getElementById('val-trail-length');
const sliderStepsPerFrame = document.getElementById('slider-steps-per-frame');
const valStepsPerFrame = document.getElementById('val-steps-per-frame');
const sliderInternalSubsteps = document.getElementById('slider-internal-substeps');
const valInternalSubsteps = document.getElementById('val-internal-substeps');
const sliderIntegratorFidelity = document.getElementById('slider-integrator-fidelity');
const valIntegratorFidelity = document.getElementById('val-integrator-fidelity');
const toggleArcResample = document.getElementById('toggle-arc-resample');
const valArcResample = document.getElementById('val-arc-resample');
const btnReset = document.getElementById('btn-reset');
const telemetryDisplay = document.getElementById('telemetry');

sliderTrailLength.max = String(maxPoints);
sliderTrailLength.value = String(maxPoints);
valTrailLength.textContent = String(maxPoints);
sliderStepsPerFrame.value = String(stepsPerFrame);
valStepsPerFrame.textContent = String(stepsPerFrame);
sliderInternalSubsteps.value = String(attractor.internalSubsteps);
valInternalSubsteps.textContent = String(attractor.internalSubsteps);
sliderIntegratorFidelity.value = String(attractor.integratorFidelity);
valIntegratorFidelity.textContent = attractor.integratorFidelity.toFixed(2);
toggleArcResample.checked = useArcLengthResample;
valArcResample.textContent = useArcLengthResample ? 'ON' : 'OFF';

// Event Listeners
sliderB.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    attractor.b = value;
    valB.textContent = value.toFixed(5);
});

sliderDt.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    attractor.dt = value;
    valDt.textContent = value.toFixed(5);
});

sliderCamZ.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    camera.position.z = value;
    valCamZ.textContent = value.toFixed(1);
});

sliderTrailLength.addEventListener('input', (e) => {
    currentTrailLength = Math.max(0, Math.min(maxPoints, parseInt(e.target.value, 10) || 0));
    valTrailLength.textContent = String(currentTrailLength);
});

sliderStepsPerFrame.addEventListener('input', (e) => {
    stepsPerFrame = Math.max(1, parseInt(e.target.value, 10) || 1);
    valStepsPerFrame.textContent = String(stepsPerFrame);
});

sliderInternalSubsteps.addEventListener('input', (e) => {
    attractor.internalSubsteps = Math.max(1, parseInt(e.target.value, 10) || 1);
    valInternalSubsteps.textContent = String(attractor.internalSubsteps);
});

sliderIntegratorFidelity.addEventListener('input', (e) => {
    attractor.integratorFidelity = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0));
    valIntegratorFidelity.textContent = attractor.integratorFidelity.toFixed(2);
});

toggleArcResample.addEventListener('change', (e) => {
    useArcLengthResample = e.target.checked;
    valArcResample.textContent = useArcLengthResample ? 'ON' : 'OFF';
});

btnReset.addEventListener('click', () => {
    attractor.reset();
});

function applyArcLengthResample(buffer, pointCount) {
    if (pointCount <= 1) {
        return;
    }

    const effectiveCount = Math.min(maxPoints, pointCount);
    const startIdx = maxPoints - effectiveCount;
    const startOffset = startIdx * 3;
    const segmentCount = effectiveCount - 1;
    const distances = new Float32Array(effectiveCount);
    let totalLength = 0;

    for (let i = 1; i < effectiveCount; i++) {
        const prev = startOffset + (i - 1) * 3;
        const curr = startOffset + i * 3;
        const dx = buffer[curr] - buffer[prev];
        const dy = buffer[curr + 1] - buffer[prev + 1];
        const dz = buffer[curr + 2] - buffer[prev + 2];
        totalLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
        distances[i] = totalLength;
    }

    if (totalLength === 0) {
        return;
    }

    const resampled = new Float32Array(effectiveCount * 3);
    let cursor = 0;

    for (let i = 0; i < effectiveCount; i++) {
        const target = (totalLength * i) / segmentCount;
        while (cursor < segmentCount && distances[cursor + 1] < target) {
            cursor++;
        }

        const d0 = distances[cursor];
        const d1 = distances[Math.min(cursor + 1, segmentCount)];
        const t = d1 > d0 ? (target - d0) / (d1 - d0) : 0;
        const srcA = startOffset + cursor * 3;
        const srcB = startOffset + Math.min(cursor + 1, segmentCount) * 3;
        const out = i * 3;

        resampled[out] = buffer[srcA] + (buffer[srcB] - buffer[srcA]) * t;
        resampled[out + 1] = buffer[srcA + 1] + (buffer[srcB + 1] - buffer[srcA + 1]) * t;
        resampled[out + 2] = buffer[srcA + 2] + (buffer[srcB + 2] - buffer[srcA + 2]) * t;
    }

    for (let i = 0; i < effectiveCount; i++) {
        const dst = startOffset + i * 3;
        const src = i * 3;
        buffer[dst] = resampled[src];
        buffer[dst + 1] = resampled[src + 1];
        buffer[dst + 2] = resampled[src + 2];
    }
}

// Main Loop
function loop() {
    for (let i = 0; i < stepsPerFrame; i++) {
        attractor.update();
        const state = attractor.getState();

        // Memory Shift: Shift the entire trail data down by one "point"
        positions.copyWithin(0, 3);

        // New Point: Write the latest x, y, z into the last 3 slots
        const lastIndex = (maxPoints - 1) * 3;
        positions[lastIndex] = state.x;
        positions[lastIndex + 1] = state.y;
        positions[lastIndex + 2] = state.z;
    }

    if (useArcLengthResample && currentTrailLength > 1) {
        applyArcLengthResample(positions, currentTrailLength);
    }

    // Get the very latest state for the sphere and telemetry
    const state = attractor.getState();

    // Update 3D Object (Sphere)
    mesh.position.set(state.x, state.y, state.z);

    // Update Telemetry Display
    telemetryDisplay.textContent = `X: ${state.x.toFixed(5)} | Y: ${state.y.toFixed(5)} | Z: ${state.z.toFixed(5)}`;

    // Flag geometry update
    trail.geometry.attributes.position.needsUpdate = true;
    trail.geometry.setDrawRange(maxPoints - currentTrailLength, currentTrailLength);

    // Render Scene
    renderer.render(scene, camera);

    requestAnimationFrame(loop);
}

// Start Loop
loop();
