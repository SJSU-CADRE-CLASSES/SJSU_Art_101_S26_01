import * as THREE from 'three';
import { vertexShader3Base, fragmentShader3Base } from './baseShader.js';
import { vertexShader3Radial, fragmentShader3Radial } from './radialShader.js';

export function setupShader3(renderer) {
    // Pass 1 Target
    const target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { 
        type: THREE.FloatType, 
        format: THREE.RGBAFormat 
    });

    const baseUniforms = {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uFractalScale: { value: 3.0 },
        uGlowIntensity: { value: 2.5 },
        uIterations: { value: 3.0 }
    };

    const radialUniforms = {
        tDiffuse: { value: target.texture },
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uDecay: { value: 0.9 },
        uDensity: { value: 0.25 },
        uWeight: { value: 0.12 }
    };

    const sceneBase = new THREE.Scene();
    const sceneRadial = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const geo = new THREE.PlaneGeometry(2, 2);
    
    const matBase = new THREE.ShaderMaterial({
        vertexShader: vertexShader3Base,
        fragmentShader: fragmentShader3Base,
        uniforms: baseUniforms,
        depthWrite: false, depthTest: false
    });
    sceneBase.add(new THREE.Mesh(geo, matBase));

    const matRadial = new THREE.ShaderMaterial({
        vertexShader: vertexShader3Radial,
        fragmentShader: fragmentShader3Radial,
        uniforms: radialUniforms,
        depthWrite: false, depthTest: false
    });
    sceneRadial.add(new THREE.Mesh(geo, matRadial));

    window.addEventListener('resize', () => {
        baseUniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
        radialUniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
        target.setSize(window.innerWidth, window.innerHeight);
    });

    return {
        baseUniforms,
        radialUniforms,
        uniforms: baseUniforms, // Expose for main.js to pipe iTime easily
        render: () => {
            // Sync time securely to Pass 2
            radialUniforms.iTime.value = baseUniforms.iTime.value;

            // Pass 1: Menger Raymarch
            renderer.setRenderTarget(target);
            renderer.clear();
            renderer.render(sceneBase, camera);
            
            // Pass 2: Radial Blur
            renderer.setRenderTarget(null);
            renderer.clear();
            renderer.render(sceneRadial, camera);
        }
    };
}
