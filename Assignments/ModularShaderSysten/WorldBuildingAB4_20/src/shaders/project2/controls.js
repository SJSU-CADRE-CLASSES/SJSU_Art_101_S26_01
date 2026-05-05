import { createRangeControl } from '../controlUtils.js';

/**
 * @param {HTMLElement} container
 * @param {{ p2Uniforms: object, p2DOFUniforms: object }} ctx
 */
export function mountProject2Controls(container, { p2Uniforms, p2DOFUniforms }) {
    const add = (label, opts, uniformObj, uniformKey) => {
        const { group, input } = createRangeControl(label, opts);
        container.appendChild(group);
        input.addEventListener('input', (e) => {
            uniformObj[uniformKey].value = parseFloat(e.target.value);
        });
    };

    add('Focal Depth Array', { id: 'p2-focalDepth', min: 0.0, max: 25.0, step: 0.1, value: 0.5 }, p2DOFUniforms, 'uFocalDepth');
    add('Circle of Confusion', { id: 'p2-coc', min: 0.1, max: 3.0, step: 0.05, value: 3.0 }, p2DOFUniforms, 'uCircleOfConfusion');
    add('Wall Noise Bump', { id: 'p2-bump', min: 0.0, max: 2.0, step: 0.01, value: 0.5 }, p2Uniforms, 'uBumpIntensity');
    add('Noise Density', { id: 'p2-noiseDensity', min: 1.0, max: 25.0, step: 0.1, value: 25.0 }, p2Uniforms, 'uNoiseDensity');
    add('Noise Speed', { id: 'p2-noiseSpeed', min: 0.0, max: 10.0, step: 0.1, value: 10.0 }, p2Uniforms, 'uNoiseSpeed');
    add('Light Speed', { id: 'p2-lightSpeed', min: 0.1, max: 5.0, step: 0.1, value: 1.0 }, p2Uniforms, 'uLightSpeed');
    add('Camera Dolly Speed', { id: 'p2-cameraDolly', min: 0.0, max: 10.0, step: 0.1, value: 2.0 }, p2Uniforms, 'uCameraDolly');
    add('Camera Roll Speed', { id: 'p2-cameraRoll', min: -5.0, max: 5.0, step: 0.1, value: 0.0 }, p2Uniforms, 'uCameraRollSpeed');
}
