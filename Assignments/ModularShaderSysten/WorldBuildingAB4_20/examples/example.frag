uniform float iTime;
uniform vec2 iResolution;
uniform float uGlow;
uniform float uInvert;

varying vec2 vUv;

// Rings + glow; uGlow scales the halo (0–10), uInvert flips colors.
void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= iResolution.x / iResolution.y;

  float r = length(uv);
  float a = atan(uv.y, uv.x);

  float rings = 0.5 + 0.5 * sin(14.0 * r - iTime * 2.0);
  float swirl = 0.5 + 0.5 * sin(a * 3.0 + iTime);
  float glow = exp(-3.0 * r) * (uGlow / 2.5);

  vec3 col = vec3(rings * swirl) * vec3(0.1, 1.0, 0.6) + glow * vec3(0.2, 0.8, 1.0);
  if (uInvert > 0.5) {
    col = vec3(1.0) - col;
  }
  gl_FragColor = vec4(col, 1.0);
}
