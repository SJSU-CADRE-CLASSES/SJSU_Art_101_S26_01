import * as THREE from 'three';
import { vertexShader, fragmentShader } from './mainShader.js';
import { vertexShader4Radial, fragmentShader4Radial } from './radialShader.js';

export function setupShader4(renderer) {
    const target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { 
        type: THREE.FloatType, 
        format: THREE.RGBAFormat 
    });

    const baseUniforms = {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uSpeed: { value: 1.0 }, 
        uGlowColor: { value: new THREE.Vector3(0.8, 0.2, 1.0) }, 
        uGridDensity: { value: 1.0 },
        uExposure: { value: 0.1 }
    };

    const radialUniforms = {
        tDiffuse: { value: target.texture },
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uDecay: { value: 0.65 },
        uDensity: { value: 0.3 },
        uWeight: { value: 0.6 },
        uChromatic: { value: 0.0 }
    };

    const sceneBase = new THREE.Scene();
    const sceneRadial = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const geo = new THREE.PlaneGeometry(2, 2);
    
    const matBase = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: baseUniforms,
        depthWrite: false, depthTest: false
    });
    sceneBase.add(new THREE.Mesh(geo, matBase));

    const matRadial = new THREE.ShaderMaterial({
        vertexShader: vertexShader4Radial,
        fragmentShader: fragmentShader4Radial,
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
        uniforms: baseUniforms, 
        render: () => {
            radialUniforms.iTime.value = baseUniforms.iTime.value;

            renderer.setRenderTarget(target);
            renderer.clear();
            renderer.render(sceneBase, camera);
            
            renderer.setRenderTarget(null);
            renderer.clear();
            renderer.render(sceneRadial, camera);
        }
    };
}
