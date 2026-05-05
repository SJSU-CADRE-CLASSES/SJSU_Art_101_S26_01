// Optional vertex shader: must declare `varying vec2 vUv` if the fragment uses it.
// `iTime` is provided by the studio preview (same uniforms as fragment).
varying vec2 vUv;
uniform float iTime;

void main() {
  vec2 u = uv;
  u += 0.04 * vec2(sin(u.y * 12.0 + iTime * 1.7), cos(u.x * 11.0 + iTime * 1.3));
  vUv = u;
  gl_Position = vec4(position, 1.0);
}
