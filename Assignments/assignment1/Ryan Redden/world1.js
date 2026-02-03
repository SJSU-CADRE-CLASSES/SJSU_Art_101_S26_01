import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const material = new THREE.ShaderMaterial({
	uniforms: {
		uTime: { value: 0 },
		uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
	},
	vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
	fragmentShader: `
		precision mediump float;
		uniform float uTime;
		uniform vec2 uRes;
		void main() {
			vec2 uv = gl_FragCoord.xy / uRes;
			float t = uTime * 0.3;
			vec3 c1 = vec3(1.0, 0.2, 0.8);
			vec3 c2 = vec3(0.2, 0.8, 1.0);
			vec3 c3 = vec3(0.8, 0.4, 1.0);
			float n = sin(uv.x * 3.0 + t) * 0.5 + sin(uv.y * 2.0 + t * 0.7) * 0.5 + 0.5;
			vec3 col = mix(c1, c2, uv.x + n * 0.3) + mix(c2, c3, uv.y) * 0.5;
			gl_FragColor = vec4(col, 1.0);
		}
	`
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(quad);

function animate() {
	requestAnimationFrame(animate);
	material.uniforms.uTime.value = performance.now() * 0.001;
	material.uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
	renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
	renderer.setSize(window.innerWidth, window.innerHeight);
	material.uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
});
