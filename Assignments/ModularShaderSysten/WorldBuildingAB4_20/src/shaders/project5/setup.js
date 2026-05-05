import * as THREE from 'three';
import { vertexShader, fragmentShader } from './mainShader.js';

export function setupShader5(renderer) {
    const uniforms = {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uSpeed: { value: 10.0 }, 
        uVaporwaveMix: { value: 0.0 }, 
        uSunY: { value: 0.15 },
        uSunStripeSpeed: { value: 6.0 },
        uGridGlow: { value: 0.05 },
        uConstellationDensity: { value: 40.0 },
        uConstellationScale: { value: 5.0 },
        uConstellationSpeed: { value: 0.1 },
        uConstellationThickness: { value: 1.0 },
        uNoiseControl: { value: 0.65 },
        uTerrainHeight: { value: 1.0 }
    };

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        depthWrite: false, depthTest: false
    });
    
    scene.add(new THREE.Mesh(geo, mat));

    window.addEventListener('resize', () => {
        uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    });

    return {
        uniforms,
        render: () => {
            renderer.clear();
            renderer.render(scene, camera);
        }
    };
}
