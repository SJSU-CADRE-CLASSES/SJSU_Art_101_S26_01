// FBM Warp with Phong Lighting — adapted from Shadertoy
// Original missing lines 1-22 reconstructed from context.

uniform float iTime;
uniform vec2  iResolution;

// ── Live controls ─────────────────────────────────────────────────────────────
uniform float uSpeed;        // animation speed       (default 1.0)
uniform float uScale;        // pattern zoom/scale    (default 4.0)
uniform float uLightHue;     // light color hue 0-360 (default 300 = magenta)
uniform float uColorMix;     // color grade blend     (default 0.2)
uniform float uWarmth;       // warm tint strength    (default 1.0)
uniform float uBrightness;   // output brightness     (default 2.0)
// ─────────────────────────────────────────────────────────────────────────────

varying vec2 vUv;

#define T (iTime * uSpeed)

// Golden ratio constants (drive the quasiperiodic noise)
const float GOLD = 1.61803398875;
const float PHI  = 1.61803398875;

// FBM rotation matrix — standard 36.87° rotation for octave decorrelation
const mat2 m = mat2(0.80, 0.60, -0.60, 0.80);

// ── Helpers ───────────────────────────────────────────────────────────────────
vec3 hue2rgb(float h) {
    h = mod(h, 360.0) / 60.0;
    float x = 1.0 - abs(mod(h, 2.0) - 1.0);
    if (h < 1.0) return vec3(1.0, x,   0.0);
    if (h < 2.0) return vec3(x,   1.0, 0.0);
    if (h < 3.0) return vec3(0.0, 1.0, x  );
    if (h < 4.0) return vec3(0.0, x,   1.0);
    if (h < 5.0) return vec3(x,   0.0, 1.0);
    return              vec3(1.0, 0.0, x  );
}

// Quasiperiodic analytic noise — range roughly [-3, +3]
float noise(vec3 p) {
    return dot(cos(GOLD * p), sin(PHI * p * GOLD));
}

// Three-octave FBM warp
float pattern(vec2 p, out float h, out float f) {
    f = noise(vec3(p.xy * uScale, T * 0.75)) + sin(p.y + T) * 2.0;
    f = noise(vec3(m * p.xy * 0.5 + 0.965, f)) + (2.0 + sin(p.y - 1.6 - T));
    f = noise(vec3(f - 2.1561, f / 0.2 + 0.165, f * 2.0)) + (1.0 + sin(p.y - T));
    h = f; // h not used externally but fulfils the out contract
    return f;
}

// Sobel normal from the warp field
vec3 fbmNormal(vec2 p) {
    float d = 0.1;
    float ha, fa, hb, fb; // separate vars to avoid aliasing out params
    float tl = pattern(p + vec2(-d, +d), ha, fa);
    float l  = pattern(p + vec2(-d,  0), ha, fa);
    float bl = pattern(p + vec2(-d, -d), ha, fa);
    float t  = pattern(p + vec2( 0, +d), hb, fb);
    float b  = pattern(p + vec2( 0, -d), hb, fb);
    float tr = pattern(p + vec2(+d, +d), ha, fa);
    float r  = pattern(p + vec2(+d,  0), ha, fa);
    float br = pattern(p + vec2(+d, -d), hb, fb);

    float dx = (tr + 2.0*r + br) - (tl + 2.0*l + bl);
    float dy = (bl + 2.0*b + br) - (tl + 2.0*t + tr);
    return normalize(vec3(dx, 2.0*d, dy));
}

void main() {
    // Centered, aspect-corrected UV
    vec2 p = (2.0 * vUv - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);

    float h, k;
    float z = pattern(p, h, k);     // warp field value
    vec3  n = fbmNormal(p);         // surface normal

    // Phong lighting — user-controlled light hue
    vec3 light       = hue2rgb(uLightHue);
    vec3 lightsource = normalize(vec3(1.0, 1.0, 1.0));
    float strength   = max(0.0, dot(n, lightsource));
    vec3 diffuse     = strength * light;

    vec3  camSource     = normalize(vec3(1.0, -5.0, 1.0));
    vec3  reflectSource = normalize(reflect(-lightsource, n));
    float specStr       = pow(max(0.0, dot(camSource, reflectSource)), 32.0);
    vec3  specular      = specStr * light;

    vec3 ambient   = mix(vec3(0.7), vec3(1.0), n.y * 2.0);
    vec3 cLighting = ambient + diffuse * 0.1 + specular;

    // Base color from warp field × lighting
    vec4 o = vec4(sin(z) * cLighting, 1.0);

    // Color grade: warm tint mix with inverse
    // uWarmth drives the (2, 1, 0.1) multiplier — 0 = neutral, 2 = very warm
    vec4 warmTint = vec4(uBrightness, uBrightness * 0.5, uBrightness * 0.05 * uWarmth + 0.05, 1.0);
    o = mix(o * warmTint, 2.0 - o, uColorMix);

    gl_FragColor = vec4(o.rgb, 1.0);
}
