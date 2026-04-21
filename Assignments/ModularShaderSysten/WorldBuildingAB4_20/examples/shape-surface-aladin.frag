// Tetrahelix rendered as a true 3D surface (raymarched capsules) with an Aladin-like palette + specular.
// Upload this file as the Fragment shader, along with `shape-surface-aladin.controls.json`.

precision highp float;
precision highp int;

uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;

uniform float uSegments;     // how many tetra steps to generate
uniform float uRadius;       // capsule radius
uniform float uSpin;         // spin speed
uniform float uScale;        // overall scale
uniform float uCamDist;      // camera distance
uniform float uGlowBase;     // glow strength around surface
uniform float uGlowColorK;   // glow color modulation
uniform float uSurfTint;     // surface lighting gain
uniform float uAlpha;        // fake transparency (0..1)
uniform float uRoughness;    // spec roughness (lower = shinier)
uniform float uSpecBoost;    // spec intensity
uniform float uFresnel;      // fresnel boost
uniform float uMaxSteps;     // ray steps (perf)

// ----- palette + helpers (from legacy/shadertoy/star.frag) -----
const float tau  = atan(1.) * 8.;
const float pi   = tau / 2.;

#define PALETTE_CLICK 1
vec3 paletteSelect(float t, int pal) {
  if (pal == PALETTE_CLICK) {
    vec3 a = vec3(0.55, 0.55, 0.60);
    vec3 b = vec3(0.35, 0.30, 0.25);
    vec3 c = vec3(1.0);
    vec3 d = vec3(0.00, 0.15, 0.25);
    return (a + 1.3 * b * cos(tau * (c * t + d)));
  }
  vec3 a = vec3(.248, 0.645, 0.135);
  vec3 b = vec3(0., 0.40, 0.135);
  vec3 c = vec3(.5);
  vec3 d = vec3(0.00, 0.10, 0.20) + .2;
  return a + b * cos(tau * (c * t + d));
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

#define tonemap(x) ((x * 1.05) / ((x) + vec3(1.)))

// ----- tetrahelix geometry (adapted from your original shape.frag) -----
// 1/sqrt(10)
const float S10 = 0.316227766017;

vec3 newtet(int k, vec3 t0, vec3 t1) {
  return vec3(S10 * float(k), -4.0 / 3.0 * t1.yz - t0.yz);
}

mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, s, -s, c);
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a;
  vec3 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

// Returns (distance, id) where id is a stable-ish segment index for coloring.
vec2 mapScene(vec3 p, int n) {
  // Apply the same kind of spin as the 2D version (around YZ).
  float ang = iTime * uSpin * 2.0;
  mat2 R = rot2(ang);
  p.yz = R * p.yz;

  // Center the helix around the origin in X.
  float cp = 0.6 * S10 * float(n);
  p.x += cp;

  vec3 tet[4];
  tet[0] = vec3(S10, -0.2 * sqrt(3.0), 0.5 * sqrt(0.6));
  tet[1] = vec3(2.0 * S10, -0.1 / sqrt(3.0), -2.0 / sqrt(15.0));
  tet[2] = newtet(3, tet[0], tet[1]);
  tet[3] = newtet(4, tet[1], tet[2]);

  float dMin = 1e6;
  float id = 0.0;

  // Walk tetrahedra and take min distance to any edge capsule.
  // Note: `n` is uniform-controlled but clamped to keep shader work bounded.
  for (int r = 0; r < 64; r++) {
    if (r >= n) break;

    for (int j = 1; j <= 3; j++) {
      for (int k = 0; k <= j; k++) {
        vec3 a = tet[j];
        vec3 b = tet[k];

        float d = sdCapsule(p, a, b, uRadius);
        if (d < dMin) {
          dMin = d;
          id = float(r * 10 + j * 3 + k);
        }
      }
    }

    // housekeeping
    tet[0] = tet[1];
    tet[1] = tet[2];
    tet[2] = tet[3];
    tet[3] = newtet(r + 5, tet[1], tet[2]);
  }

  return vec2(dMin, id);
}

vec3 getLightDir() {
  return normalize(vec3(0.45, 0.85, 0.30));
}

float fresnelSchlick(float cosTheta, float F0) {
  float m = clamp(1.0 - cosTheta, 0.0, 1.0);
  float m2 = m * m;
  return 3.0 * F0 + (1.0 - F0) * (m2 * m2 * m);
}

vec3 shadeFast(vec3 surfCol, vec3 Nn, vec3 rd) {
  vec3 L = getLightDir();
  vec3 V = normalize(-rd);
  vec3 Hh = normalize(L + V);

  float NoL = max(dot(Nn, L), 0.0);
  float NoH = max(dot(Nn, Hh), 0.0);
  float NoV = max(dot(Nn, V), 0.0);

  float diff = NoL * 0.95 + 0.05;
  float rough = clamp(uRoughness, 0.02, 0.9);
  float shin = mix(520.0, 30.0, rough);
  float spec = pow(NoH, shin) * (0.25 + 0.75 * NoL) * uSpecBoost;

  float F0 = 100.0;
  float F = fresnelSchlick(NoV, F0) * uFresnel;
  vec3 specCol = vec3(1.0);

  vec3 colL = surfCol * (0.12 + 1.10 * diff) + specCol * (spec * (0.35 + 1.65 * F));
  return colL * 1.45;
}

vec3 calcNormal(vec3 p, int n) {
  // 4-tap tetrahedral normal (fewer map calls than 6-tap central).
  float e = 0.0015;
  vec3 k1 = vec3( 1.0, -1.0, -1.0);
  vec3 k2 = vec3(-1.0, -1.0,  1.0);
  vec3 k3 = vec3(-1.0,  1.0, -1.0);
  vec3 k4 = vec3( 1.0,  1.0,  1.0);
  float d1 = mapScene(p + e * k1, n).x;
  float d2 = mapScene(p + e * k2, n).x;
  float d3 = mapScene(p + e * k3, n).x;
  float d4 = mapScene(p + e * k4, n).x;
  vec3 nn = k1 * d1 + k2 * d2 + k3 * d3 + k4 * d4;
  return normalize(nn);
}

void mainImage(out vec4 C, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

  int n = int(clamp(uSegments, 1.0, 64.0));
  int maxSteps = int(clamp(uMaxSteps, 24.0, 128.0));

  // Camera
  vec3 ro = vec3(0.0, 0.0, -max(0.5, uCamDist));
  vec3 rd = normalize(vec3(uv * uScale, 1.2));

  int paletteIdx = (iMouse.z > 0.0) ? PALETTE_CLICK : 0;
  vec3 blueGlow = vec3(0.0135, 0.388, 0.79) / 2.0;
  vec3 pal0 = paletteSelect(0.5 / 6.0, paletteIdx);
  vec3 pal1 = paletteSelect(1.5 / 6.0, paletteIdx);
  vec3 pal2 = paletteSelect(2.5 / 6.0, paletteIdx);
  vec3 pal3 = paletteSelect(3.5 / 6.0, paletteIdx);
  vec3 pal4 = paletteSelect(5.0 / 6.0, paletteIdx);
  vec3 glow0 = mix(blueGlow, blueGlow * (0.35 + 0.85 * pal0), uGlowColorK);
  vec3 glow1 = mix(blueGlow, blueGlow * (0.35 + 0.85 * pal1), uGlowColorK);
  vec3 glow2 = mix(blueGlow, blueGlow * (0.35 + 0.85 * pal2), uGlowColorK);
  vec3 glow3 = mix(blueGlow, blueGlow * (0.35 + 0.85 * pal3), uGlowColorK);
  vec3 glow4 = mix(blueGlow, blueGlow * (0.35 + 0.85 * pal4), uGlowColorK);

  vec3 colOut = vec3(0.0);
  float t = 0.0;
  float dither = (hash12(fragCoord.xy) - 0.5) / 256.0;

  // Raymarch
  for (int i = 0; i < 128; i++) {
    if (i >= maxSteps) break;
    vec3 p = ro + rd * t;
    vec2 dm = mapScene(p, n);
    float d = dm.x;
    float id = dm.y;

    // Choose a color bucket from the palette by id.
    float idx = mod(id, 5.0);
    vec3 surfCol = (idx < 0.5) ? pal0 : (idx < 1.5) ? pal1 : (idx < 2.5) ? pal2 : (idx < 3.5) ? pal3 : pal4;
    vec3 glowCol = (idx < 0.5) ? glow0 : (idx < 1.5) ? glow1 : (idx < 2.5) ? glow2 : (idx < 3.5) ? glow3 : glow4;

    float ad = abs(d);
    float dd = max(ad, 0.003);
    colOut += (uGlowBase / (dd * dd)) * (0.35 + 0.65 * surfCol) * glowCol;

    if (d < 0.0012) {
      vec3 Nn = calcNormal(p, n);
      if (dot(rd, Nn) > 0.0) Nn = -Nn;
      vec3 lit = shadeFast(surfCol, Nn, rd) * uSurfTint;

      // Fake “glass” transparency over black: keep edges via fresnel, reduce interior.
      float NoV = max(dot(Nn, normalize(-rd)), 0.0);
      float F = clamp(fresnelSchlick(NoV, 100.0) * uFresnel, 0.0, 1.0);
      float a = clamp(mix(uAlpha, 1.0, F), 0.0, 1.0);
      colOut = mix(colOut, colOut + lit, a);
      break;
    }

    // March
    t += d * 0.9 + 0.002 + dither;
    if (t > 8.0) break;
  }

  colOut = tonemap(colOut);
  C = vec4(colOut, 1.0);
}

void main() {
  vec4 C = vec4(0.0);
  mainImage(C, gl_FragCoord.xy);
  gl_FragColor = C;
}

