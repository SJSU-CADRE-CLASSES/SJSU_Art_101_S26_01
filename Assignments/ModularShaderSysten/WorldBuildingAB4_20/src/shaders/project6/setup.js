import * as THREE from 'three';
import { vertexShader6, fragmentShader6 } from './mainShader.js';

export function setupShader6(renderer) {
    const uniforms = {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uNumLogos: { value: 1 },
        uRippleSpread: { value: 1.5 },
        uRippleFreq: { value: 2.0 },
        uBaseSpeed: { value: 1.0 },
        uLogoScale: { value: 0.1 },
        uMonochrome: { value: 0 },
        uBumpFactor: { value: 0.1 },
        uOffsetDistance: { value: 0.8 },
        uSpecularIntensity: { value: 5.0 },
        uSpecularShininess: { value: 16.0 }
    };

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    
    // Using simple opaque shader since DVD creates its own visual
    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader6,
        fragmentShader: fragmentShader6,
        uniforms: uniforms,
        depthWrite: false, 
        depthTest: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    return {
        scene,
        camera,
        uniforms,
        render: () => {
            renderer.setRenderTarget(null);
            renderer.clearDepth();
            renderer.render(scene, camera);
        }
    };
}
