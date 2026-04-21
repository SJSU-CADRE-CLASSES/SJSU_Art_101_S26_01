import * as THREE from 'three';
import { vertexShader4Radial, fragmentShader4Radial } from './shaders/project4/radialShader.js';

export function setupLanding(renderer) {
    const target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { 
        type: THREE.FloatType, 
        format: THREE.RGBAFormat 
    });

    const sceneBase = new THREE.Scene();
    sceneBase.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 10;

    const textGroup = new THREE.Group();
    sceneBase.add(textGroup);

    // Robust 2D Text via CanvasTexture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    
    function drawText() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 90px "Brown Austin", sans-serif';
        ctx.fillText('Ryan Redden', 512, 210);
        
        ctx.font = 'normal 40px "Brown Austin", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText('World Builder', 512, 310);
        
        texture.needsUpdate = true;
    }
    
    // Draw immediately using fallback font just in case
    drawText();
    
    // Redraw once the custom font finishes loading
    document.fonts.load('90px "Brown Austin"').then(drawText);
    
    const planeGeo = new THREE.PlaneGeometry(10, 5);
    const planeMat = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: true,
        blending: THREE.AdditiveBlending 
    });
    
    const textMesh = new THREE.Mesh(planeGeo, planeMat);
    textGroup.add(textMesh);

    // We reuse project 4's radial blur post-processing for that nice, subtle blurring effect
    const radialUniforms = {
        tDiffuse: { value: target.texture },
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uDecay: { value: 0.75 },
        uDensity: { value: 0.025 },
        uWeight: { value: 0.5 },
        uChromatic: { value: 0.0005 }
    };

    const sceneRadial = new THREE.Scene();
    const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const geo = new THREE.PlaneGeometry(2, 2);
    const matRadial = new THREE.ShaderMaterial({
        vertexShader: vertexShader4Radial,
        fragmentShader: fragmentShader4Radial,
        uniforms: radialUniforms,
        depthWrite: false, depthTest: false
    });
    sceneRadial.add(new THREE.Mesh(geo, matRadial));

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        radialUniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
        target.setSize(window.innerWidth, window.innerHeight);
    });

    return {
        render: (t) => {
            radialUniforms.iTime.value = t;

            // Subtle floating effect
            textGroup.position.y = Math.sin(t * 1.5) * 0.05;
            textGroup.rotation.y = Math.sin(t * 0.5) * 0.05;

            // 1. Render 3D Text to Target
            renderer.setRenderTarget(target);
            renderer.clear();
            renderer.render(sceneBase, camera);
            
            // 2. Render Target onto screen with Radial Post-processing
            renderer.setRenderTarget(null);
            renderer.clear();
            renderer.render(sceneRadial, orthoCam);
        }
    };
}
