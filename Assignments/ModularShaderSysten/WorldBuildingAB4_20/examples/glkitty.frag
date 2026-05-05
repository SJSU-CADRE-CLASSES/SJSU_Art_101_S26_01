// GLKITTY — adapted from Shadertoy original (2016)
// Ported for WorldBuildingAB4_20: iChannel0 replaced with procedural noise.

uniform float iTime;
uniform vec2  iResolution;
uniform vec4  iMouse;

// ── Live controls ─────────────────────────────────────────────────────────────
uniform float uRotSpeed;      // auto-rotation speed   (default 1.0)
uniform float uDeform;        // deformation strength  (default 1.0)
uniform float uNoiseStr;      // surface noise amount  (default 1.5)
uniform float uGlow;          // teal glow intensity   (default 1.0)
uniform float uFog;           // purple depth fog      (default 1.0)
uniform float uMono;          // monochrome toggle     (0 = color, 1 = mono)
// ─────────────────────────────────────────────────────────────────────────────

// ── Procedural noise (replaces iChannel0 texture) ────────────────────────────
float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}
// ─────────────────────────────────────────────────────────────────────────────

vec3 rotateY(vec3 v, float t) {
    float cost = cos(t); float sint = sin(t);
    return vec3(v.x * cost + v.z * sint, v.y, -v.x * sint + v.z * cost);
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float noise(vec3 p) {
    float t = iTime;
    vec3 np = normalize(p);

    // bi-planar mapping using procedural noise
    float a = valueNoise((t / 20.0 + np.xy) * 5.0);
    float b = valueNoise((t / 20.0 + 0.77 + np.yz) * 5.0);

    a = mix(a, 0.5, abs(np.x));
    b = mix(b, 0.5, abs(np.z));

    float n = a + b - 0.4;
    n = mix(n, 0.5, abs(np.y) / 2.0);

    return n;
}

float map(vec3 p) {
    // Clamp noise contribution to keep the SDF well-defined at high values.
    float ns = clamp(uNoiseStr, 0.0, 2.2);
    // spheres
    float d = (-1.0 * length(p) + 3.0) + ns * noise(p);
    d = min(d, (length(p) - 1.5) + ns * noise(p));

    // links
    float m = 1.5; float s = 0.03;
    d = smin(d, max(abs(p.x) - s,         abs(p.y + p.z * 0.2) - 0.07), m);
    d = smin(d, max(abs(p.z) - s,         abs(p.x + p.y / 2.0) - 0.07), m);
    d = smin(d, max(abs(p.z - p.y * 0.4) - s, abs(p.x - p.y * 0.2) - 0.07), m);
    d = smin(d, max(abs(p.z * 0.2 - p.y) - s, abs(p.x + p.z) - 0.07),   m);
    d = smin(d, max(abs(p.z * -0.2 + p.y) - s, abs(-p.x + p.z) - 0.07), m);

    return d;
}

void main() {
    vec2 fragCoord = gl_FragCoord.xy;

    // Ray from UV
    vec2 uv = fragCoord * 2.0 / iResolution.xy - 1.0;
    uv.x *= iResolution.x / iResolution.y;
    vec3 ray = normalize(vec3(1.0 * uv.x, 1.0 * uv.y, 1.0));

    vec3 color = vec3(0.0);
    const int rayCount = 128; // lowered from 1024 for realtime performance

    // Raymarching
    float t = 0.0;
    for (int r = 1; r <= rayCount; r++) {
        vec3 p = vec3(0.0, 0.0, -3.0) + ray * t;

        // Rotation (mouse X orbits, time auto-rotates)
        p = rotateY(p, iMouse.x / iResolution.x * 2.0 * 3.14159);
        p = rotateY(p, iTime / 3.0 * uRotSpeed);

        // Deformation
        float mask = max(0.0, 1.0 - length(p / 3.0));
        p = rotateY(p, mask * sin(iTime / 2.0) * 1.2 * uDeform);
        p.y += sin(iTime + p.x) * mask * 0.5 * uDeform;
        p *= 1.1 + (sin(iTime / 2.0) * mask * 0.3 * uDeform);

        float d = map(p);

        if (d < 0.01 || r == rayCount) {
            float iter = float(r) / float(rayCount);
            float ao = 1.0 - iter;
            ao *= ao;
            ao = 1.0 - ao;

            // Glow: teal highlight driven by AO and surface pulse
            float pulse = 0.5 + 0.5 * sin(iTime * -1.5 + length(p) + p.x);
            color += uGlow * vec3(0.1, 1.0, 0.8) * pulse * (1.0 - ao) * 0.8;
            color += vec3(0.1, 0.5, 0.6) * ao * 6.0;
            color += vec3(0.27, 0.2, 0.4) * (t / 8.0) * uFog;

            color *= 2.0;
            color -= 0.15;

            break;
        }

        t += d * 0.5;
    }

    // Vignette (by Ippokratis — shadertoy.com/view/lsKSWR)
    uv = fragCoord / iResolution.xy;
    uv *= 1.0 - uv.yx;
    float vig = uv.x * uv.y * 20.0;
    vig = pow(vig, 0.25);
    color *= vig;

    // Color grading
    color.y *= 0.8;
    color.x *= 1.5;

    // Monochrome toggle
    if (uMono > 0.5) {
        float grey = dot(color, vec3(0.299, 0.587, 0.114));
        color = vec3(grey);
    }

    gl_FragColor = vec4(color, 1.0);
}
