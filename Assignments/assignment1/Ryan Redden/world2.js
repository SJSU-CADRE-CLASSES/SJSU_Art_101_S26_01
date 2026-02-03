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
		float hash(vec2 p) {
			return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
		}
		void main() {
			vec2 uv = gl_FragCoord.xy / uRes;
			float t = uTime * 0.1;
			vec3 dark = vec3(0.02, 0.02, 0.08);
			vec3 nebula = vec3(0.15, 0.05, 0.25) + vec3(0.1, 0.02, 0.15) * sin(uv.x * 4.0 + t) * sin(uv.y * 3.0 + t * 0.8);
			float stars = 0.0;
			for (int i = 0; i < 60; i++) {
				vec2 p = vec2(hash(vec2(float(i), 0.0)), hash(vec2(0.0, float(i))));
				p = fract(p + t * 0.02);
				float d = length(uv - p);
				stars += 0.015 / (d + 0.002) * hash(p + 1.0);
			}
			vec3 col = dark + nebula + vec3(stars);
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
