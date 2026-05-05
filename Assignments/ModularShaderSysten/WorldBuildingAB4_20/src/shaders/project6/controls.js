import { createCheckboxControl, createRangeControl } from '../controlUtils.js';

/**
 * @param {HTMLElement} container
 * @param {{ s6: { uniforms: object }, onSpecularIntensityChange: (v: number) => void, onSpecularShininessChange: (v: number) => void }} ctx
 */
export function mountProject6Controls(container, { s6, onSpecularIntensityChange, onSpecularShininessChange }) {
    const { uniforms } = s6;

    const mono = createCheckboxControl('Monochrome', 'p6-monochrome', false);
    container.appendChild(mono.group);
    mono.input.addEventListener('change', (e) => {
        uniforms.uMonochrome.value = e.target.checked ? 1 : 0;
    });

    const addUniform = (label, opts, uniformKey) => {
        const { group, input } = createRangeControl(label, opts);
        container.appendChild(group);
        input.addEventListener('input', (e) => {
            uniforms[uniformKey].value = parseFloat(e.target.value);
        });
    };

    addUniform('Active DVD Count', { id: 'p6-logos', min: 1, max: 5, step: 1, value: 1 }, 'uNumLogos');
    addUniform('Ripple Spread', { id: 'p6-spread', min: 0.1, max: 5.0, step: 0.1, value: 1.5 }, 'uRippleSpread');
    addUniform('Ripple Frequency', { id: 'p6-freq', min: 0.1, max: 10.0, step: 0.1, value: 2.0 }, 'uRippleFreq');
    addUniform('Logo Base Speed', { id: 'p6-speed', min: 0.1, max: 5.0, step: 0.1, value: 1.0 }, 'uBaseSpeed');
    addUniform('Logo Scale', { id: 'p6-scale', min: 0.01, max: 0.3, step: 0.01, value: 0.1 }, 'uLogoScale');
    addUniform('Bump Factor', { id: 'p6-bump', min: 0.01, max: 0.5, step: 0.01, value: 0.1 }, 'uBumpFactor');
    addUniform('Offset Distance', { id: 'p6-offset', min: 0.1, max: 2.0, step: 0.1, value: 0.8 }, 'uOffsetDistance');

    const specInt = createRangeControl('Specular Intensity', {
        id: 'p6-specInt',
        min: 0.0,
        max: 15.0,
        step: 0.1,
        value: 5.0
    });
    container.appendChild(specInt.group);
    specInt.input.addEventListener('input', (e) => onSpecularIntensityChange(parseFloat(e.target.value)));

    const specShin = createRangeControl('Specular Shininess', {
        id: 'p6-specShin',
        min: 1.0,
        max: 128.0,
        step: 1.0,
        value: 16.0
    });
    container.appendChild(specShin.group);
    specShin.input.addEventListener('input', (e) => onSpecularShininessChange(parseFloat(e.target.value)));
}
