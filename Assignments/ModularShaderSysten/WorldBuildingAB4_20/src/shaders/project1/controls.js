import { createRangeControl } from '../controlUtils.js';

/**
 * @param {HTMLElement} container
 * @param {{ uniforms: object, onThicknessChange: (v: number) => void }} ctx
 */
export function mountProject1Controls(container, { uniforms, onThicknessChange }) {
    const add = (label, opts, onInput) => {
        const { group, input } = createRangeControl(label, opts);
        container.appendChild(group);
        input.addEventListener('input', onInput);
    };

    add('Geometric Smoothness', { id: 'p-thickness', min: 0.0, max: 1.5, step: 0.01, value: 0.1 }, (e) =>
        onThicknessChange(parseFloat(e.target.value))
    );
    add('Structure Width', { id: 'p-width', min: 0.01, max: 0.3, step: 0.01, value: 0.08 }, (e) => {
        uniforms.uStructureWidth.value = parseFloat(e.target.value);
    });
    add('Noise Density', { id: 'p-noiseDensity', min: 0.0, max: 50.0, step: 0.1, value: 15.0 }, (e) => {
        uniforms.uNoiseDensity.value = parseFloat(e.target.value);
    });
    add('Noise Speed', { id: 'p-noiseSpeed', min: 0.0, max: 20.0, step: 0.1, value: 2.0 }, (e) => {
        uniforms.uNoiseSpeed.value = parseFloat(e.target.value);
    });
    add('Outline Tightness', { id: 'p-outline', min: 0.5, max: 15.0, step: 0.1, value: 4.0 }, (e) => {
        uniforms.uOutlineTightness.value = parseFloat(e.target.value);
    });
    add('Inner Volume Glow', { id: 'p-glow', min: 0.1, max: 15.0, step: 0.1, value: 2.5 }, (e) => {
        uniforms.uInnerVolumeGlow.value = parseFloat(e.target.value);
    });
    add('CRT Curvature (Vignette)', { id: 'p-vignette', min: 0.0, max: 1.5, step: 0.05, value: 0.2 }, (e) => {
        uniforms.uVignette.value = parseFloat(e.target.value);
    });
}
