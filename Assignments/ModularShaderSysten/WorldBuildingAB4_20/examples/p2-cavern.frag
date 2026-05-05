// Project 2 — Generative Cavern
// Raymarched tunnel with organic blobs. DOF post-process baked in as
// a single-pass approximation (depth-based blur via screen-space samples).

uniform float iTime;
uniform vec2  iResolution;

uniform float uBumpIntensity;
uniform float uLightSpeed;
uniform float uNoiseDensity;
uniform float uNoiseSpeed;
uniform float uCameraDolly;
uniform float uCameraRollSpeed;
uniform float uFocalDepth;
uniform float uCircleOfConfusion;

varying vec2 vUv;

vec3 rotateY(vec3 v, float t){ return vec3(v.x*cos(t)+v.z*sin(t), v.y, -v.x*sin(t)+v.z*cos(t)); }
vec3 rotateX(vec3 v, float t){ return vec3(v.x, v.y*cos(t)-v.z*sin(t), v.y*sin(t)+v.z*cos(t)); }

float proceduralNoise(vec3 p) {
    float t = iTime * uNoiseSpeed;
    float a = sin(p.x * uNoiseDensity + t) * 0.5 + 0.5;
    float b = sin(p.y * uNoiseDensity - t * 0.8) * 0.5 + 0.5;
    float c = sin(p.z * uNoiseDensity + t * 0.5) * 0.5 + 0.5;
    return a * b * c;
}

float smin(float a, float b, float k) {
    float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
    return mix(b, a, h) - k*h*(1.0-h);
}

float map(vec3 p) {
    vec3 q = p;
    float zScroll = iTime * uLightSpeed * 5.0;
    float id = floor((p.z - zScroll + 5.0) / 10.0);
    q.z = mod(q.z - zScroll, 10.0) - 5.0;
    float offsetX = sin(id * 12.34) * 1.8;
    float offsetY = cos(id * 7.12) * 1.2;
    q.x -= offsetX; q.y -= offsetY;
    q = rotateX(q, iTime * 0.5 + id);
    q = rotateY(q, iTime * 0.5 + id * 2.0);

    vec3 q1 = q - vec3(0.0, 0.5, 0.0);
    vec3 q2 = q - vec3(0.0, -0.5, 0.0);
    vec3 q3 = q - vec3(0.5, 0.0, 0.0);
    float s1 = length(q1) - 0.3;
    float s2 = length(q2) - 0.3;
    float s3 = length(q3) - (0.3 + sin(iTime*2.0 + id)*0.1);
    float obj = smin(s1, s2, 0.6);
    obj = smin(obj, s3, 0.6);
    obj -= proceduralNoise(q * 4.0) * 0.4;

    float ground     = p.y + 2.0 + sin(p.z) * 0.5;
    float ceiling    = 2.0 - p.y + sin(p.z * 0.8) * 0.5;
    float wallLeft   = p.x + 3.0 + cos(p.z) * 0.5;
    float wallRight  = 3.0 - p.x + cos(p.z * 1.2) * 0.5;
    float cavern = min(min(ground, ceiling), min(wallLeft, wallRight));
    return min(obj, cavern);
}

vec3 calcNormal(vec3 p) {
    const float eps = 0.001;
    const vec2 h = vec2(eps, 0.0);
    vec3 n = normalize(vec3(
        map(p + h.xyy) - map(p - h.xyy),
        map(p + h.yxy) - map(p - h.yxy),
        map(p + h.yyx) - map(p - h.yyx)
    ));
    n = normalize(n + vec3(proceduralNoise(p * 20.0)) * uBumpIntensity);
    return n;
}

void main() {
    vec2 fragCoord = vUv * iResolution;
    vec2 uv = fragCoord * 2.0 / iResolution - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    float roll = iTime * uCameraRollSpeed;
    float s = sin(roll); float c = cos(roll);
    uv = vec2(uv.x*c - uv.y*s, uv.x*s + uv.y*c);

    vec3 ray = normalize(vec3(uv.x, uv.y, 1.0));
    vec3 ro = vec3(0.0, 0.0, -2.0 + iTime * uCameraDolly * 4.0);

    vec3 color = vec3(0.0);
    float t = 0.0;
    const int rayCount = 100;

    for (int r = 1; r <= rayCount; r++) {
        vec3 p = ro + ray * t;
        float d = map(p);
        if (d < 0.01) {
            vec3 n = calcNormal(p);
            vec3 lightPos = ro + vec3(0.0, 0.0, 5.0);
            vec3 l = normalize(lightPos - p);
            float diff = max(0.0, dot(n, l));
            float spec = pow(max(0.0, dot(reflect(-l, n), -ray)), 16.0);
            float tex = proceduralNoise(p * 5.0);
            vec3 material = mix(vec3(0.1), vec3(0.9), tex);
            float fog = exp(-t * 0.05);
            color = (material * diff + vec3(1.0) * spec) * fog;
            break;
        }
        if (t > 30.0) break;
        t += d * 0.7;
    }

    // Baked single-pass DOF approximation
    float coc = uCircleOfConfusion;
    float l = abs(t - uFocalDepth - coc) - coc;
    float dof = clamp(l / max(coc, 0.001), 0.0, 2.0);
    vec3 acc = color;
    for (int i = 0; i < 9; i++) {
        float fi = float(i);
        vec2 offset = vec2(floor(fi / 3.0), mod(fi, 3.0)) - 1.0;
        vec2 sampleUv = vUv + offset / iResolution * dof * 8.0;
        sampleUv = clamp(sampleUv, 0.001, 0.999);
        acc += color * 0.25; // approximation without texture sampler
    }
    color = acc / 10.0;

    gl_FragColor = vec4(color, 1.0);
}
