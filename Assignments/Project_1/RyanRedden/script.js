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
let cameraOrbitAmplitude = 20;
let cameraOrbitCyclesPerSecond = 0.03;
let cameraOrbitRampPhase = 0;
let lastOrbitTimeSec = performance.now() / 1000;
let lfoEnabled = false;
let lfoWaveform = 'sine';
let lfoFrequency = 0.2;
let lfoPhase = 0;
const lfoTargets = new Map();
const lfoSliderOverlays = new Map();
const envTargets = new Map();
let envAttackMs = 100;
let envDecayMs = 250;
let envSustain = 0.6;
let envReleaseMs = 300;
let envTriggerKey = '1';
let envPhase = 'idle';
let envValue = 0;
let envPhaseElapsedSec = 0;
let envPhaseStartValue = 0;
let envKeyHeld = false;

// The Object (Icosahedron)
const geometry = new THREE.IcosahedronGeometry(0.1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00aaff, wireframe: true });
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
let arcResampleAmount = 1;
let pointJitter = 0;
let gainX = 1;
let gainY = 1;
let gainZ = 1;
let uiScale = 0.5;

const trailMaterial = new THREE.LineBasicMaterial({
    color: 0x00aaff,
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

function updateCameraOrbitFromRamp(ramp, amplitude = 20) {
    const normalizedRamp = ((ramp % 1) + 1) % 1;
    const angle = normalizedRamp * Math.PI * 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    camera.position.x = c * amplitude;
    camera.position.z = s * amplitude;
}

// DOM Elements
const sliderB = document.getElementById('slider-b');
const sliderDt = document.getElementById('slider-dt');
const valB = document.getElementById('val-b');
const valDt = document.getElementById('val-dt');
const sliderUiSize = document.getElementById('slider-ui-size');
const valUiSize = document.getElementById('val-ui-size');
const sliderCamZ = document.getElementById('slider-cam-z');
const valCamZ = document.getElementById('val-cam-z');
const sliderRampFrequency = document.getElementById('slider-ramp-frequency');
const valRampFrequency = document.getElementById('val-ramp-frequency');
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
const sliderArcResampleAmount = document.getElementById('slider-arc-resample-amount');
const valArcResampleAmount = document.getElementById('val-arc-resample-amount');
const sliderPointJitter = document.getElementById('slider-point-jitter');
const valPointJitter = document.getElementById('val-point-jitter');
const sliderGainX = document.getElementById('slider-gain-x');
const valGainX = document.getElementById('val-gain-x');
const sliderGainY = document.getElementById('slider-gain-y');
const valGainY = document.getElementById('val-gain-y');
const sliderGainZ = document.getElementById('slider-gain-z');
const valGainZ = document.getElementById('val-gain-z');
const btnReset = document.getElementById('btn-reset');
const telemetryDisplay = document.getElementById('telemetry');
const container = document.querySelector('.container');
const leftPanelStack = document.querySelector('.left-panel-stack');
const toggleLfoEnabled = document.getElementById('toggle-lfo-enabled');
const valLfoEnabled = document.getElementById('val-lfo-enabled');
const selectLfoWaveform = document.getElementById('select-lfo-waveform');
const valLfoWaveform = document.getElementById('val-lfo-waveform');
const sliderLfoFrequency = document.getElementById('slider-lfo-frequency');
const valLfoFrequency = document.getElementById('val-lfo-frequency');
const selectLfoParam = document.getElementById('select-lfo-param');
const btnLfoAdd = document.getElementById('btn-lfo-add');
const lfoActiveList = document.getElementById('lfo-active-list');
const sliderEnvAttack = document.getElementById('slider-env-attack');
const valEnvAttack = document.getElementById('val-env-attack');
const sliderEnvDecay = document.getElementById('slider-env-decay');
const valEnvDecay = document.getElementById('val-env-decay');
const sliderEnvSustain = document.getElementById('slider-env-sustain');
const valEnvSustain = document.getElementById('val-env-sustain');
const sliderEnvRelease = document.getElementById('slider-env-release');
const valEnvRelease = document.getElementById('val-env-release');
const inputEnvTrigger = document.getElementById('input-env-trigger');
const valEnvTrigger = document.getElementById('val-env-trigger');
const selectEnvParam = document.getElementById('select-env-param');
const btnEnvAdd = document.getElementById('btn-env-add');
const envActiveList = document.getElementById('env-active-list');

container.style.transform = `scale(${uiScale})`;
leftPanelStack.style.transform = `scale(${uiScale})`;

const lfoParamConfigs = {
    b: { label: 'Chaos (b)', slider: sliderB, min: 0.00001, max: 0.42, step: 0.00001, base: 0.19, set: (v) => { attractor.b = v; valB.textContent = v.toFixed(5); } },
    dt: { label: 'Speed (dt)', slider: sliderDt, min: 0.00001, max: 3.5, step: 0.00001, base: 0.1, set: (v) => { attractor.dt = v; valDt.textContent = v.toFixed(5); } },
    orbitRadius: { label: 'Camera Orbit Radius', slider: sliderCamZ, min: 1, max: 20, step: 0.1, base: 20, set: (v) => { cameraOrbitAmplitude = v; valCamZ.textContent = v.toFixed(1); } },
    rampFrequency: { label: 'Ramp Frequency', slider: sliderRampFrequency, min: -1, max: 1, step: 0.01, base: 0.03, set: (v) => { cameraOrbitCyclesPerSecond = v; valRampFrequency.textContent = v.toFixed(2); } },
    trailLength: { label: 'Trail Length', slider: sliderTrailLength, min: 0, max: maxPoints, step: 1, base: maxPoints, set: (v) => { currentTrailLength = Math.max(0, Math.min(maxPoints, Math.round(v))); valTrailLength.textContent = String(currentTrailLength); } },
    stepsPerFrame: { label: 'Steps / Frame', slider: sliderStepsPerFrame, min: 1, max: 1000, step: 1, base: 20, set: (v) => { stepsPerFrame = Math.max(1, Math.round(v)); valStepsPerFrame.textContent = String(stepsPerFrame); } },
    internalSubsteps: { label: 'Internal Substeps', slider: sliderInternalSubsteps, min: 1, max: 500, step: 1, base: 1, set: (v) => { attractor.internalSubsteps = Math.max(1, Math.round(v)); valInternalSubsteps.textContent = String(attractor.internalSubsteps); } },
    integratorFidelity: { label: 'Integrator Fidelity', slider: sliderIntegratorFidelity, min: 0, max: 1, step: 0.01, base: 0, set: (v) => { attractor.integratorFidelity = v; valIntegratorFidelity.textContent = v.toFixed(2); } },
    arcResampleAmount: { label: 'Arc Resample Amount', slider: sliderArcResampleAmount, min: 0, max: 1, step: 0.01, base: 1, set: (v) => { arcResampleAmount = v; valArcResampleAmount.textContent = `${Math.round(v * 100)}%`; } },
    pointJitter: { label: 'Point Jitter', slider: sliderPointJitter, min: 0, max: 0.25, step: 0.001, base: 0, set: (v) => { pointJitter = v; valPointJitter.textContent = v.toFixed(3); } },
    gainX: { label: 'X Gain', slider: sliderGainX, min: 0.1, max: 4, step: 0.01, base: 1, set: (v) => { gainX = v; valGainX.textContent = v.toFixed(2); } },
    gainY: { label: 'Y Gain', slider: sliderGainY, min: 0.1, max: 4, step: 0.01, base: 1, set: (v) => { gainY = v; valGainY.textContent = v.toFixed(2); } },
    gainZ: { label: 'Z Gain', slider: sliderGainZ, min: 0.1, max: 4, step: 0.01, base: 1, set: (v) => { gainZ = v; valGainZ.textContent = v.toFixed(2); } },
    uiSize: { label: 'UI Size', slider: sliderUiSize, min: 0.3, max: 1.2, step: 0.01, base: 0.5, set: (v) => { uiScale = v; valUiSize.textContent = `${Math.round(v * 100)}%`; container.style.transform = `scale(${uiScale})`; leftPanelStack.style.transform = `scale(${uiScale})`; } }
};

function clampToSlider(config, value) {
    const clamped = Math.max(config.min, Math.min(config.max, value));
    if (config.step <= 0) {
        return clamped;
    }
    const steps = Math.round((clamped - config.min) / config.step);
    return config.min + (steps * config.step);
}

function buildParamOptions(selectElement) {
    selectElement.innerHTML = '';
    Object.entries(lfoParamConfigs).forEach(([key, cfg]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = cfg.label;
        selectElement.appendChild(option);
    });
}

function buildLfoSliderOverlays() {
    Object.entries(lfoParamConfigs).forEach(([key, cfg]) => {
        if (!cfg.slider || !cfg.slider.closest('.container')) {
            return;
        }

        const parent = cfg.slider.parentNode;
        const wrapper = document.createElement('div');
        wrapper.className = 'slider-stack';
        parent.insertBefore(wrapper, cfg.slider);
        wrapper.appendChild(cfg.slider);

        const overlay = cfg.slider.cloneNode();
        overlay.removeAttribute('id');
        overlay.disabled = true;
        overlay.tabIndex = -1;
        overlay.classList.add('lfo-overlay-slider');
        overlay.value = cfg.slider.value;
        wrapper.insertBefore(overlay, cfg.slider);
        cfg.slider.classList.add('base-slider');
        lfoSliderOverlays.set(key, overlay);
    });
}

function updateLfoOverlayValue(key, value) {
    const overlay = lfoSliderOverlays.get(key);
    if (!overlay) {
        return;
    }
    overlay.value = String(value);
}

function renderActiveLfoTargets() {
    lfoActiveList.innerHTML = '';
    if (lfoTargets.size === 0) {
        const empty = document.createElement('span');
        empty.className = 'lfo-empty';
        empty.textContent = 'None';
        lfoActiveList.appendChild(empty);
        return;
    }

    lfoTargets.forEach((amount, key) => {
        const cfg = lfoParamConfigs[key];
        if (!cfg) {
            return;
        }

        const chip = document.createElement('div');
        chip.className = 'lfo-chip';
        const label = document.createElement('span');
        label.textContent = cfg.label;
        const amountSlider = document.createElement('input');
        amountSlider.type = 'range';
        amountSlider.min = '-1';
        amountSlider.max = '1';
        amountSlider.step = '0.01';
        amountSlider.value = String(amount);
        amountSlider.className = 'lfo-chip-amount';
        const amountValue = document.createElement('span');
        amountValue.className = 'lfo-chip-amount-value';
        amountValue.textContent = amount.toFixed(2);
        amountSlider.addEventListener('input', (e) => {
            const nextAmount = Math.max(-1, Math.min(1, parseFloat(e.target.value) || 0));
            lfoTargets.set(key, nextAmount);
            amountValue.textContent = nextAmount.toFixed(2);
        });
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = 'x';
        removeBtn.addEventListener('click', () => {
            lfoTargets.delete(key);
            renderActiveLfoTargets();
        });
        chip.appendChild(label);
        chip.appendChild(amountSlider);
        chip.appendChild(amountValue);
        chip.appendChild(removeBtn);
        lfoActiveList.appendChild(chip);
    });
}

function renderActiveEnvTargets() {
    envActiveList.innerHTML = '';
    if (envTargets.size === 0) {
        const empty = document.createElement('span');
        empty.className = 'lfo-empty';
        empty.textContent = 'None';
        envActiveList.appendChild(empty);
        return;
    }

    envTargets.forEach((amount, key) => {
        const cfg = lfoParamConfigs[key];
        if (!cfg) {
            return;
        }

        const chip = document.createElement('div');
        chip.className = 'lfo-chip';
        const label = document.createElement('span');
        label.textContent = cfg.label;
        const amountSlider = document.createElement('input');
        amountSlider.type = 'range';
        amountSlider.min = '-1';
        amountSlider.max = '1';
        amountSlider.step = '0.01';
        amountSlider.value = String(amount);
        amountSlider.className = 'env-chip-amount';
        const amountValue = document.createElement('span');
        amountValue.className = 'lfo-chip-amount-value';
        amountValue.textContent = amount.toFixed(2);
        amountSlider.addEventListener('input', (e) => {
            const nextAmount = Math.max(-1, Math.min(1, parseFloat(e.target.value) || 0));
            envTargets.set(key, nextAmount);
            amountValue.textContent = nextAmount.toFixed(2);
        });
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = 'x';
        removeBtn.addEventListener('click', () => {
            envTargets.delete(key);
            renderActiveEnvTargets();
        });
        chip.appendChild(label);
        chip.appendChild(amountSlider);
        chip.appendChild(amountValue);
        chip.appendChild(removeBtn);
        envActiveList.appendChild(chip);
    });
}

function getLfoValue(phase, waveform) {
    const p = ((phase % 1) + 1) % 1;
    switch (waveform) {
        case 'triangle':
            return 1 - (4 * Math.abs(p - 0.5));
        case 'ramp':
            return (2 * p) - 1;
        case 'square':
            return p < 0.5 ? 1 : -1;
        case 'sine':
        default:
            return Math.sin(p * Math.PI * 2);
    }
}

function startEnvelopePhase(nextPhase) {
    envPhase = nextPhase;
    envPhaseElapsedSec = 0;
    envPhaseStartValue = envValue;
}

function updateEnvelope(deltaSec) {
    envPhaseElapsedSec += deltaSec;

    if (envPhase === 'idle') {
        envValue = 0;
        return envValue;
    }

    if (envPhase === 'attack') {
        const attackSec = Math.max(0, envAttackMs) / 1000;
        if (attackSec <= 0) {
            envValue = 1;
            startEnvelopePhase('decay');
            return envValue;
        }
        const t = Math.min(1, envPhaseElapsedSec / attackSec);
        envValue = envPhaseStartValue + ((1 - envPhaseStartValue) * t);
        if (t >= 1) {
            startEnvelopePhase('decay');
        }
        return envValue;
    }

    if (envPhase === 'decay') {
        const decaySec = Math.max(0, envDecayMs) / 1000;
        if (decaySec <= 0) {
            envValue = envSustain;
            startEnvelopePhase('sustain');
            return envValue;
        }
        const t = Math.min(1, envPhaseElapsedSec / decaySec);
        envValue = 1 + ((envSustain - 1) * t);
        if (t >= 1) {
            startEnvelopePhase('sustain');
        }
        return envValue;
    }

    if (envPhase === 'sustain') {
        envValue = envSustain;
        return envValue;
    }

    if (envPhase === 'release') {
        const releaseSec = Math.max(0, envReleaseMs) / 1000;
        if (releaseSec <= 0) {
            envValue = 0;
            startEnvelopePhase('idle');
            return envValue;
        }
        const t = Math.min(1, envPhaseElapsedSec / releaseSec);
        envValue = envPhaseStartValue * (1 - t);
        if (t >= 1) {
            startEnvelopePhase('idle');
        }
        return envValue;
    }

    return envValue;
}

function applyModulationTargets(deltaSec) {
    const hasLfoTargets = lfoTargets.size > 0;
    if (lfoEnabled && hasLfoTargets) {
        lfoPhase = ((lfoPhase + (deltaSec * lfoFrequency)) % 1 + 1) % 1;
    }
    const lfoSample = hasLfoTargets ? getLfoValue(lfoPhase, lfoWaveform) : 0;
    const envelopeOutput = updateEnvelope(deltaSec);

    Object.entries(lfoParamConfigs).forEach(([key, cfg]) => {
        const span = cfg.max - cfg.min;
        const lfoAmount = lfoEnabled && lfoTargets.has(key) ? (lfoTargets.get(key) ?? 1) : 0;
        const envAmount = envTargets.has(key) ? (envTargets.get(key) ?? 1) : 0;
        const lfoContribution = lfoSample * span * 0.5 * lfoAmount;
        const envContribution = envelopeOutput * span * envAmount;
        const modulated = clampToSlider(cfg, cfg.base + lfoContribution + envContribution);
        updateLfoOverlayValue(key, modulated);
        cfg.set(modulated);
    });
}

buildParamOptions(selectLfoParam);
buildParamOptions(selectEnvParam);
buildLfoSliderOverlays();
renderActiveLfoTargets();
renderActiveEnvTargets();

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
sliderArcResampleAmount.value = String(arcResampleAmount);
valArcResampleAmount.textContent = `${Math.round(arcResampleAmount * 100)}%`;
sliderArcResampleAmount.disabled = !useArcLengthResample;
sliderPointJitter.value = String(pointJitter);
valPointJitter.textContent = pointJitter.toFixed(3);
sliderGainX.value = String(gainX);
valGainX.textContent = gainX.toFixed(2);
sliderGainY.value = String(gainY);
valGainY.textContent = gainY.toFixed(2);
sliderGainZ.value = String(gainZ);
valGainZ.textContent = gainZ.toFixed(2);
sliderUiSize.value = String(uiScale);
valUiSize.textContent = `${Math.round(uiScale * 100)}%`;
sliderCamZ.value = cameraOrbitAmplitude.toFixed(1);
valCamZ.textContent = cameraOrbitAmplitude.toFixed(1);
sliderRampFrequency.value = cameraOrbitCyclesPerSecond.toFixed(2);
valRampFrequency.textContent = cameraOrbitCyclesPerSecond.toFixed(2);
sliderEnvAttack.value = String(envAttackMs);
valEnvAttack.textContent = `${envAttackMs.toFixed(0)} ms`;
sliderEnvDecay.value = String(envDecayMs);
valEnvDecay.textContent = `${envDecayMs.toFixed(0)} ms`;
sliderEnvSustain.value = String(envSustain);
valEnvSustain.textContent = `${Math.round(envSustain * 100)}%`;
sliderEnvRelease.value = String(envReleaseMs);
valEnvRelease.textContent = `${envReleaseMs.toFixed(0)} ms`;
inputEnvTrigger.value = envTriggerKey;
valEnvTrigger.textContent = envTriggerKey;

// Event Listeners
sliderUiSize.addEventListener('input', (e) => {
    uiScale = Math.max(0.3, Math.min(1.2, parseFloat(e.target.value) || 0.5));
    valUiSize.textContent = `${Math.round(uiScale * 100)}%`;
    container.style.transform = `scale(${uiScale})`;
    leftPanelStack.style.transform = `scale(${uiScale})`;
    lfoParamConfigs.uiSize.base = uiScale;
});

sliderB.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    attractor.b = value;
    valB.textContent = value.toFixed(5);
    lfoParamConfigs.b.base = value;
});

sliderDt.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    attractor.dt = value;
    valDt.textContent = value.toFixed(5);
    lfoParamConfigs.dt.base = value;
});

sliderCamZ.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    cameraOrbitAmplitude = Math.max(0, value || 0);
    valCamZ.textContent = value.toFixed(1);
    lfoParamConfigs.orbitRadius.base = cameraOrbitAmplitude;
});

sliderRampFrequency.addEventListener('input', (e) => {
    cameraOrbitCyclesPerSecond = parseFloat(e.target.value) || 0;
    valRampFrequency.textContent = cameraOrbitCyclesPerSecond.toFixed(2);
    lfoParamConfigs.rampFrequency.base = cameraOrbitCyclesPerSecond;
});

sliderTrailLength.addEventListener('input', (e) => {
    currentTrailLength = Math.max(0, Math.min(maxPoints, parseInt(e.target.value, 10) || 0));
    valTrailLength.textContent = String(currentTrailLength);
    lfoParamConfigs.trailLength.base = currentTrailLength;
});

sliderStepsPerFrame.addEventListener('input', (e) => {
    stepsPerFrame = Math.max(1, parseInt(e.target.value, 10) || 1);
    valStepsPerFrame.textContent = String(stepsPerFrame);
    lfoParamConfigs.stepsPerFrame.base = stepsPerFrame;
});

sliderInternalSubsteps.addEventListener('input', (e) => {
    attractor.internalSubsteps = Math.max(1, parseInt(e.target.value, 10) || 1);
    valInternalSubsteps.textContent = String(attractor.internalSubsteps);
    lfoParamConfigs.internalSubsteps.base = attractor.internalSubsteps;
});

sliderIntegratorFidelity.addEventListener('input', (e) => {
    attractor.integratorFidelity = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0));
    valIntegratorFidelity.textContent = attractor.integratorFidelity.toFixed(2);
    lfoParamConfigs.integratorFidelity.base = attractor.integratorFidelity;
});

toggleArcResample.addEventListener('change', (e) => {
    useArcLengthResample = e.target.checked;
    valArcResample.textContent = useArcLengthResample ? 'ON' : 'OFF';
    sliderArcResampleAmount.disabled = !useArcLengthResample;
});

sliderArcResampleAmount.addEventListener('input', (e) => {
    arcResampleAmount = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0));
    valArcResampleAmount.textContent = `${Math.round(arcResampleAmount * 100)}%`;
    lfoParamConfigs.arcResampleAmount.base = arcResampleAmount;
});

sliderPointJitter.addEventListener('input', (e) => {
    pointJitter = Math.max(0, parseFloat(e.target.value) || 0);
    valPointJitter.textContent = pointJitter.toFixed(3);
    lfoParamConfigs.pointJitter.base = pointJitter;
});

sliderGainX.addEventListener('input', (e) => {
    gainX = Math.max(0.1, parseFloat(e.target.value) || 0.1);
    valGainX.textContent = gainX.toFixed(2);
    lfoParamConfigs.gainX.base = gainX;
});

sliderGainY.addEventListener('input', (e) => {
    gainY = Math.max(0.1, parseFloat(e.target.value) || 0.1);
    valGainY.textContent = gainY.toFixed(2);
    lfoParamConfigs.gainY.base = gainY;
});

sliderGainZ.addEventListener('input', (e) => {
    gainZ = Math.max(0.1, parseFloat(e.target.value) || 0.1);
    valGainZ.textContent = gainZ.toFixed(2);
    lfoParamConfigs.gainZ.base = gainZ;
});

toggleLfoEnabled.addEventListener('change', (e) => {
    lfoEnabled = e.target.checked;
    valLfoEnabled.textContent = lfoEnabled ? 'ON' : 'OFF';
});

selectLfoWaveform.addEventListener('change', (e) => {
    lfoWaveform = e.target.value;
    valLfoWaveform.textContent = lfoWaveform.toUpperCase();
});

sliderLfoFrequency.addEventListener('input', (e) => {
    lfoFrequency = Math.max(0, parseFloat(e.target.value) || 0);
    valLfoFrequency.textContent = lfoFrequency.toFixed(2);
});

btnLfoAdd.addEventListener('click', () => {
    const key = selectLfoParam.value;
    if (!lfoParamConfigs[key]) {
        return;
    }
    if (!lfoTargets.has(key)) {
        lfoTargets.set(key, 1);
    }
    renderActiveLfoTargets();
});

sliderEnvAttack.addEventListener('input', (e) => {
    envAttackMs = Math.max(0, parseFloat(e.target.value) || 0);
    valEnvAttack.textContent = `${envAttackMs.toFixed(0)} ms`;
});

sliderEnvDecay.addEventListener('input', (e) => {
    envDecayMs = Math.max(0, parseFloat(e.target.value) || 0);
    valEnvDecay.textContent = `${envDecayMs.toFixed(0)} ms`;
});

sliderEnvSustain.addEventListener('input', (e) => {
    envSustain = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0));
    valEnvSustain.textContent = `${Math.round(envSustain * 100)}%`;
});

sliderEnvRelease.addEventListener('input', (e) => {
    envReleaseMs = Math.max(0, parseFloat(e.target.value) || 0);
    valEnvRelease.textContent = `${envReleaseMs.toFixed(0)} ms`;
});

inputEnvTrigger.addEventListener('input', (e) => {
    const next = (e.target.value || '1').trim().toLowerCase().slice(0, 1);
    envTriggerKey = next || '1';
    inputEnvTrigger.value = envTriggerKey;
    valEnvTrigger.textContent = envTriggerKey;
});

btnEnvAdd.addEventListener('click', () => {
    const key = selectEnvParam.value;
    if (!lfoParamConfigs[key]) {
        return;
    }
    if (!envTargets.has(key)) {
        envTargets.set(key, 1);
    }
    renderActiveEnvTargets();
});

window.addEventListener('keydown', (e) => {
    if ((e.key || '').toLowerCase() !== envTriggerKey) {
        return;
    }
    if (document.activeElement === inputEnvTrigger) {
        return;
    }
    if (!envKeyHeld) {
        envKeyHeld = true;
        startEnvelopePhase('attack');
    }
});

window.addEventListener('keyup', (e) => {
    if ((e.key || '').toLowerCase() !== envTriggerKey) {
        return;
    }
    envKeyHeld = false;
    if (envPhase !== 'idle') {
        startEnvelopePhase('release');
    }
});

btnReset.addEventListener('click', () => {
    attractor.reset();
});

function applyArcLengthResample(buffer, pointCount, amount = 1) {
    const blend = Math.max(0, Math.min(1, amount));
    if (pointCount <= 1 || blend <= 0) {
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
        buffer[dst] = buffer[dst] + (resampled[src] - buffer[dst]) * blend;
        buffer[dst + 1] = buffer[dst + 1] + (resampled[src + 1] - buffer[dst + 1]) * blend;
        buffer[dst + 2] = buffer[dst + 2] + (resampled[src + 2] - buffer[dst + 2]) * blend;
    }
}

// Main Loop
function loop() {
    const nowSec = performance.now() / 1000;
    const deltaSec = Math.max(0, nowSec - lastOrbitTimeSec);
    lastOrbitTimeSec = nowSec;
    applyModulationTargets(deltaSec);
    cameraOrbitRampPhase = ((cameraOrbitRampPhase + (deltaSec * cameraOrbitCyclesPerSecond)) % 1 + 1) % 1;
    updateCameraOrbitFromRamp(cameraOrbitRampPhase, cameraOrbitAmplitude);
    camera.lookAt(0, 0, 0);

    for (let i = 0; i < stepsPerFrame; i++) {
        attractor.update();
        const state = attractor.getState();

        // Memory Shift: Shift the entire trail data down by one "point"
        positions.copyWithin(0, 3);

        // New Point: Write the latest x, y, z into the last 3 slots
        const lastIndex = (maxPoints - 1) * 3;
        const jitterX = (Math.random() * 2 - 1) * pointJitter;
        const jitterY = (Math.random() * 2 - 1) * pointJitter;
        const jitterZ = (Math.random() * 2 - 1) * pointJitter;
        positions[lastIndex] = state.x * gainX + jitterX;
        positions[lastIndex + 1] = state.y * gainY + jitterY;
        positions[lastIndex + 2] = state.z * gainZ + jitterZ;
    }

    if (useArcLengthResample && currentTrailLength > 1 && arcResampleAmount > 0) {
        applyArcLengthResample(positions, currentTrailLength, arcResampleAmount);
    }

    // Get the very latest state for the sphere and telemetry
    const state = attractor.getState();

    // Update 3D Object (Sphere)
    mesh.position.set(state.x * gainX, state.y * gainY, state.z * gainZ);

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
