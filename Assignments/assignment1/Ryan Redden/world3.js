import * as THREE from 'three';
import { AsciiEffect } from 'three/addons/effects/AsciiEffect.js';

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.z = 300;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0, 0, 0);

const light = new THREE.PointLight(0xffffff, 4, 0, 0);
light.position.set(200, 200, 200);
scene.add(light);

const mesh = new THREE.Mesh(
	new THREE.BoxGeometry(80, 80, 80),
	new THREE.MeshPhongMaterial({ flatShading: true })
);
scene.add(mesh);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

const effect = new AsciiEffect(renderer, ' .:-+*=%@#', { invert: false });
effect.setSize(window.innerWidth, window.innerHeight);
effect.domElement.style.color = '#fff';
effect.domElement.style.backgroundColor = '#000';
document.body.appendChild(effect.domElement);

function animate() {
	requestAnimationFrame(animate);
	mesh.rotation.x += 0.005;
	mesh.rotation.y += 0.01;
	effect.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	effect.setSize(window.innerWidth, window.innerHeight);
});
