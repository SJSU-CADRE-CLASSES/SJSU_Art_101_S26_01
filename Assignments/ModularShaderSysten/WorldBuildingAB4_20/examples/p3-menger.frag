// Project 3 — Menger Sponge Fractal
// Radial light scattering baked as a screen-space glow pass after raymarching.

uniform float iTime;
uniform vec2  iResolution;

uniform float uFractalScale;
uniform float uGlowIntensity;
uniform float uIterations;
uniform float uDecay;
uniform float uDensity;
uniform float uWeight;

varying vec2 vUv;

mat2 rot(float a) {
    float s = sin(a); float c = cos(a);
    return mat2(c, -s, s, c);
}

float maxcomp(vec3 p) { return max(p.x, max(p.y, p.z)); }

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(maxcomp(q), 0.0);
}

float map(vec3 p) {
    float d = sdBox(p, vec3(1.0));
    float s = 1.0;
    for (int m = 0; m < 5; m++) {
        if (float(m) > uIterations) break;
        vec3 a = mod(p * s, 2.0) - 1.0;
        s *= 3.0;
        vec3 r = abs(1.0 - uFractalScale * abs(a));
        float da = max(r.x, r.y);
        float db = max(r.y, r.z);
        float dc = max(r.z, r.x);
        float c = (min(da, min(db, dc)) - 1.0) / s;
        d = max(d, c);
    }
    return d;
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(1.0, -1.0) * 0.5773 * 0.0005;
    return normalize(
        e.xyy * map(p + e.xyy) +
        e.yyx * map(p + e.yyx) +
        e.yxy * map(p + e.yxy) +
        e.xxx * map(p + e.xxx)
    );
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.0, 289.0))) * 45758.5453); }

void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= iResolution.x / iResolution.y;

    vec3 ro = vec3(0.0, 0.0, -2.5);
    vec3 rd = normalize(vec3(uv, 1.0));
    ro.xz *= rot(iTime * 0.2); rd.xz *= rot(iTime * 0.2);
    ro.yz *= rot(iTime * 0.15); rd.yz *= rot(iTime * 0.15);

    float t = 0.0;
    float maxD = 10.0;
    vec3 p;
    for (int i = 0; i < 100; i++) {
        p = ro + rd * t;
        float d = map(p);
        if (d < 0.001 || t > maxD) break;
        t += d;
    }

    vec3 col = vec3(0.0);
    if (t < maxD) {
        vec3 n = calcNormal(p);
        vec3 l = normalize(vec3(1.0, 1.0, -1.0));
        l.xz *= rot(iTime);
        float diff = max(dot(n, l), 0.0);
        col = vec3(0.5, 0.8, 1.0) * (diff + 0.2);
        col = mix(col, vec3(0.0), smoothstep(0.0, maxD, t));
    }

    col += vec3(0.1, 0.4, 0.8) * uGlowIntensity / (1.0 + t*t);

    // Baked radial light scattering (replaces second-pass radial shader)
    vec2 tuv = vUv;
    vec2 lightUv = vec2(0.5);
    vec2 dTuv = (tuv - lightUv) * uDensity / 24.0;
    tuv += dTuv * (hash(tuv + fract(iTime)) * 2.0 - 1.0);
    vec3 radial = col * 0.25;
    float w = uWeight;
    for (int i = 0; i < 24; i++) {
        tuv -= dTuv;
        radial += col * w;
        w *= uDecay;
    }
    vec2 cv = vUv - 0.5;
    radial *= 1.0 - dot(cv, cv) * 0.75;
    col = mix(col, sqrt(clamp(radial, 0.0, 1.0)), 0.6);

    gl_FragColor = vec4(col, 1.0);
}
