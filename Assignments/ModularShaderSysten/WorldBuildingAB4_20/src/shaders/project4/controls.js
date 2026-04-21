import * as THREE from 'three';
import { createRangeControl } from '../controlUtils.js';

/**
 * @param {HTMLElement} container
 * @param {{ s4: { baseUniforms: object, radialUniforms: object } }} ctx
 */
export function mountProject4Controls(container, { s4 }) {
    const { baseUniforms, radialUniforms } = s4;

    const add = (label, opts, uniformObj, uniformKey) => {
        const { group, input } = createRangeControl(label, opts);
        container.appendChild(group);
        input.addEventListener('input', (e) => {
            uniformObj[uniformKey].value = parseFloat(e.target.value);
        });
    };

    add('Flight Speed', { id: 'p4-speed', min: 0.0, max: 2.0, step: 0.01, value: 1.0 }, baseUniforms, 'uSpeed');

    const hue = createRangeControl('Color Hue (Degrees)', {
        id: 'p4-hue',
        min: 0,
        max: 360,
        step: 1,
        value: 288
    });
    container.appendChild(hue.group);
    hue.input.addEventListener('input', (e) => {
        const h = parseFloat(e.target.value) / 360.0;
        const color = new THREE.Color().setHSL(h, 1.0, 0.5);
        baseUniforms.uGlowColor.value.set(Math.max(0.2, color.r), Math.max(0.2, color.g), Math.max(0.2, color.b));
    });

    add('Architecture Scale', { id: 'p4-grid', min: 0.1, max: 3.0, step: 0.01, value: 1.0 }, baseUniforms, 'uGridDensity');
    add('Exposure', { id: 'p4-exposure', min: 0.1, max: 5.0, step: 0.1, value: 0.1 }, baseUniforms, 'uExposure');
    add('Radial Decay', { id: 'p4-decay', min: 0.5, max: 1.0, step: 0.01, value: 0.65 }, radialUniforms, 'uDecay');
    add('Radial Density', { id: 'p4-density', min: 0.0, max: 1.0, step: 0.01, value: 0.3 }, radialUniforms, 'uDensity');
    add('Radial Weight', { id: 'p4-weight', min: 0.0, max: 1.0, step: 0.01, value: 0.6 }, radialUniforms, 'uWeight');
}
