import { createRangeControl } from '../controlUtils.js';

/**
 * @param {HTMLElement} container
 * @param {{ s3: { baseUniforms: object, radialUniforms: object } }} ctx
 */
export function mountProject3Controls(container, { s3 }) {
    const { baseUniforms, radialUniforms } = s3;

    const add = (label, opts, uniformObj, uniformKey) => {
        const { group, input } = createRangeControl(label, opts);
        container.appendChild(group);
        input.addEventListener('input', (e) => {
            uniformObj[uniformKey].value = parseFloat(e.target.value);
        });
    };

    add('Iterations', { id: 'p3-iterations', min: 0.0, max: 5.0, step: 1.0, value: 3.0 }, baseUniforms, 'uIterations');
    add('Cross Shape', { id: 'p3-fractalScale', min: 1.0, max: 5.0, step: 0.1, value: 3.0 }, baseUniforms, 'uFractalScale');
    add('Core Glow', { id: 'p3-glowIntensity', min: 0.0, max: 10.0, step: 0.1, value: 2.5 }, baseUniforms, 'uGlowIntensity');
    add('Radial Decay', { id: 'p3-decay', min: 0.5, max: 1.0, step: 0.01, value: 0.9 }, radialUniforms, 'uDecay');
    add('Radial Density', { id: 'p3-density', min: 0.0, max: 1.0, step: 0.01, value: 0.25 }, radialUniforms, 'uDensity');
    add('Radial Weight', { id: 'p3-weight', min: 0.0, max: 1.0, step: 0.01, value: 0.12 }, radialUniforms, 'uWeight');
}
