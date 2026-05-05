uniform float iTime;
uniform vec2 iResolution;

varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= iResolution.x / iResolution.y;

  float r = length(uv);
  float a = atan(uv.y, uv.x);

  float rings = 0.5 + 0.5 * sin(16.0 * r - iTime * 2.2);
  float swirl = 0.5 + 0.5 * sin(a * 4.0 + iTime * 0.9);
  float glow = exp(-3.2 * r);

  vec3 col = vec3(rings * swirl) * vec3(0.85, 0.15, 0.55) + glow * vec3(0.25, 0.95, 0.75);
  gl_FragColor = vec4(col, 1.0);
}
