import { createRangeControl } from '../controlUtils.js';

/**
 * @param {HTMLElement} container
 * @param {{ s5: { uniforms: object }, onTerrainChange: (v: number) => void }} ctx
 */
export function mountProject5Controls(container, { s5, onTerrainChange }) {
    const { uniforms } = s5;

    const add = (label, opts, uniformKey) => {
        const { group, input } = createRangeControl(label, opts);
        container.appendChild(group);
        input.addEventListener('input', (e) => {
            uniforms[uniformKey].value = parseFloat(e.target.value);
        });
    };

    add('Flight Speed', { id: 'p5-speed', min: 0.0, max: 30.0, step: 0.1, value: 10.0 }, 'uSpeed');

    const terrain = createRangeControl('Terrain Height Scale', {
        id: 'p5-terrain',
        min: 0.0,
        max: 2.0,
        step: 0.01,
        value: 1.0
    });
    container.appendChild(terrain.group);
    terrain.input.addEventListener('input', (e) => onTerrainChange(parseFloat(e.target.value)));

    add('Vaporwave Aesthetic Mix', { id: 'p5-vaporwave', min: 0.0, max: 1.0, step: 0.01, value: 0.0 }, 'uVaporwaveMix');
    add('Sun Location Y', { id: 'p5-sunY', min: -1.0, max: 1.0, step: 0.01, value: 0.15 }, 'uSunY');
    add('Sun Stripe Speed', { id: 'p5-sun-stripe', min: 0.0, max: 20.0, step: 0.1, value: 6.0 }, 'uSunStripeSpeed');
    add('Grid Glow Threshold', { id: 'p5-gridGlow', min: 0.01, max: 0.2, step: 0.01, value: 0.05 }, 'uGridGlow');
    add('Constellation Density', { id: 'p5-c-density', min: 10.0, max: 60.0, step: 1.0, value: 40.0 }, 'uConstellationDensity');
    add('Constellation Scale', { id: 'p5-c-scale', min: 0.1, max: 5.0, step: 0.1, value: 5.0 }, 'uConstellationScale');
    add('Star Movement Speed', { id: 'p5-c-speed', min: 0.0, max: 10.0, step: 0.1, value: 0.1 }, 'uConstellationSpeed');
    add('Connection Thickness', { id: 'p5-c-thick', min: 0.0, max: 5.0, step: 0.1, value: 1.0 }, 'uConstellationThickness');
    add('Noise Control (Scale)', { id: 'p5-noise', min: 0.0, max: 1.0, step: 0.01, value: 0.65 }, 'uNoiseControl');
}
