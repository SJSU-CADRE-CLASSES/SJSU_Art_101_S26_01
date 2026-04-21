// Voxel Reflection Field — adapted from Shadertoy (-40 FabriceNeyret2 / -13 GregRostami / -7 coyote)
// Expanded from golfed form for readability and control.

uniform float iTime;
uniform vec2  iResolution;

// ── Light sweeping system ─────────────────────────────────────────────────────
uniform float uSweepSpeed;    // axis rotation speed   (default 0.05)
uniform float uAxisX;         // X phase offset        (default 3.0)
uniform float uAxisY;         // Y phase offset        (default 2.0)
uniform float uAxisZ;         // Z phase offset        (default 0.0)
// ── Color / chromatics ────────────────────────────────────────────────────────
uniform float uColorSpeed;    // color cycling speed   (default 1.0)
uniform float uZFreq;         // color z-frequency     (default 0.5)
uniform float uColorPhaseG;   // green channel phase   (default 0.2)
uniform float uColorPhaseB;   // blue channel phase    (default 0.4)
// ── Structure ─────────────────────────────────────────────────────────────────
uniform float uVoxelDensity;  // grid quantization     (default 24.0)
uniform float uCylRadius;     // structure thickness   (default 0.2)
uniform float uExposure;      // tone-map brightness   (default 2000.0)
// ─────────────────────────────────────────────────────────────────────────────

varying vec2 vUv;

// Safe tanh for vec4 — WebGL 1.0 doesn't guarantee built-in tanh on vec4
vec4 tanhSafe(vec4 v) {
    vec4 e2 = exp(clamp(2.0 * v, -20.0, 20.0));
    return (e2 - 1.0) / (e2 + 1.0);
}

void main() {
    vec2 fragCoord = vUv * iResolution;

    // iResolution.xyy equivalent (original uses vec3 iResolution)
    vec3 iResXYY = vec3(iResolution, iResolution.y);

    // Initialize accumulator to 0 (original: O*=i with i=0)
    vec4 O = vec4(0.0);
    vec3 p;
    float i = 0.0, t = 0.0, v = 1.0, l = 1.0;

    for (int iter = 0; iter < 50; iter++) {
        i += 1.0;

        // ── Ray position ──────────────────────────────────────────────────────
        // normalize(vec3(I+I, 0) - iResolution.xyy) is the ray direction;
        // multiplying by t gives the current sample point along the ray.
        p = t * normalize(vec3(fragCoord * 2.0, 0.0) - iResXYY);
        p.z -= 0.1; // nudge camera back slightly

        // ── Sweeping reflection ───────────────────────────────────────────────
        // The reflection normal slowly rotates via iTime*uSweepSpeed.
        // uAxisX/Y/Z offset the three sine components, changing the sweep shape.
        vec3 axis = normalize(sin(iTime * uSweepSpeed + vec3(uAxisX, uAxisY, uAxisZ)));
        p = reflect(p, axis);

        // ── Spherical inversion ───────────────────────────────────────────────
        // Divides p by its squared length — maps outsides to insides of a sphere.
        l = dot(p, p);
        p = p / max(l, 0.0001);

        // ── Voxel quantization ────────────────────────────────────────────────
        // Snaps p to a grid of size 1/uVoxelDensity.
        // Higher uVoxelDensity = finer grid, more complex lattice.
        p = round(p * uVoxelDensity) / uVoxelDensity;

        // ── Cylinder cross-section SDF ────────────────────────────────────────
        // Reflects/repeats p.xy, then measures distance to thin cylinder.
        // The cos(p.z/...) term bends the lattice along depth — this is what
        // creates the rippling tunnel perspective effect.
        vec2 Imod = abs(mod(p.xy - 2.0, 4.0) - 2.0) - 1.0
                    + 0.6 * cos(p.z / vec2(3.0, 2.0));
        v = abs(length(Imod) - uCylRadius) + 0.01;

        // ── Color accumulation ────────────────────────────────────────────────
        // t marches negatively (like exp(-t) in the readable version).
        // The sin term creates RGB color separation via per-channel phase offsets.
        t -= v * l * 0.8;
        vec4 colorPhase = vec4(0.0, uColorPhaseG, uColorPhaseB, 0.0);
        O += exp(t) / v
           / (abs(sin(p.z * uZFreq - iTime * uColorSpeed + colorPhase)) + 0.1);
    }

    // ── Tone mapping ──────────────────────────────────────────────────────────
    // tanh compresses the accumulated HDR value into [0,1].
    // uExposure scales the input — lower = brighter/more saturated.
    gl_FragColor = tanhSafe(O / uExposure);
}
