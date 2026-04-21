// Project 5 — Vaporwave Terrain
// Procedural triangle noise terrain with constellation sky.

uniform float iTime;
uniform vec2  iResolution;

uniform float uSpeed;
uniform float uTerrainHeight;
uniform float uVaporwaveMix;
uniform float uSunY;
uniform float uSunStripeSpeed;
uniform float uGridGlow;
uniform float uConstellationDensity;
uniform float uConstellationScale;
uniform float uConstellationSpeed;
uniform float uConstellationThickness;
uniform float uNoiseControl;

varying vec2 vUv;

float jTime;

float amp(vec2 p){ return smoothstep(1.0, 8.0, abs(p.x)); }
float pow1d5(float a){ return a*sqrt(a); }
float hash21(vec2 co){ return fract(sin(dot(co.xy, vec2(1.9898, 7.233))) * 45758.5433); }
float hash(vec2 uv){
    float a = amp(uv);
    return a > 0.0 ? a * pow1d5(hash21(uv)) * uTerrainHeight : 0.0;
}

float edgeMin(float dx, vec2 da, vec2 db, vec2 uv){
    uv.x += 5.0;
    vec3 c = fract((round(vec3(uv, uv.x+uv.y))) * (vec3(0.0, 1.0, 2.0) + 0.61803398875));
    return min(min((1.0 - dx) * db.y, da.x), da.y);
}

vec2 trinoise(vec2 uv){
    const float sq = sqrt(1.5);
    uv.x *= sq;
    uv.y -= 0.5 * uv.x;
    vec2 d = fract(uv);
    uv -= d;
    float c = float(dot(d, vec2(1.0)) > 1.0);
    vec2 dd = 1.0 - d;
    vec2 da = c > 0.5 ? dd : d;
    vec2 db = c > 0.5 ? d : dd;
    float nn = hash(uv + c);
    float n2 = hash(uv + vec2(1.0, 0.0));
    float n3 = hash(uv + vec2(0.0, 1.0));
    float nmid = mix(n2, n3, d.y);
    float ns = mix(nn, c > 0.5 ? n2 : n3, da.y);
    float dx = da.x / db.y;
    return vec2(mix(ns, nmid, dx), edgeMin(dx, da, db, uv + d));
}

vec2 mapTerrain(vec3 p){
    vec2 n = trinoise(p.xz);
    return vec2(p.y - 2.0 * n.x, n.y);
}
vec3 grad(vec3 p){
    const vec2 e = vec2(0.005, 0.0);
    float a = mapTerrain(p).x;
    return vec3(mapTerrain(p+e.xyy).x-a, mapTerrain(p+e.yxy).x-a, mapTerrain(p+e.yyx).x-a) / e.x;
}
vec2 intersect(vec3 ro, vec3 rd){
    float d = 0.0; float h = 0.0;
    for (int i = 0; i < 50; i++){
        vec3 p = ro + d * rd;
        vec2 s = mapTerrain(p); h = s.x;
        d += h * 0.5;
        if (abs(h) < 0.003 * d) return vec2(d, s.y);
        if (d > 150.0 || p.y > 2.0) break;
    }
    return vec2(-1.0);
}

vec2 hash32(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}
float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a; vec2 ba = b - a;
    float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}
float constellations(vec3 rd) {
    vec2 uv = (vec2(atan(rd.x, rd.z), rd.y) * uConstellationDensity) / uConstellationScale;
    vec2 gv = fract(uv) - 0.5;
    vec2 id = floor(uv);
    float m = 0.0;
    vec2 p[9];
    int i = 0;
    for (float y = -1.0; y <= 1.0; y++) {
        for (float x = -1.0; x <= 1.0; x++) {
            vec2 cellId = id + vec2(x, y);
            vec2 n = hash32(vec3(cellId, jTime * uConstellationSpeed * 0.01));
            vec2 pt = vec2(x, y) + sin(n * 6.283) * uNoiseControl;
            p[i++] = pt;
        }
    }
    for (int j = 0; j < 9; j++) {
        m += smoothstep(0.04, 0.01, length(gv - p[j])) * 0.8;
        float dLine = length(p[j] - p[4]);
        if (dLine < 1.3 && j != 4) {
            float edgeDist = sdSegment(gv, p[4], p[j]);
            float lineGlow = smoothstep(0.02 * uConstellationThickness, 0.001, edgeDist);
            lineGlow *= smoothstep(1.3, 0.6, dLine) * 0.5;
            m += lineGlow;
        }
    }
    return m;
}

void addsun(vec3 rd, vec3 ld, inout vec3 col) {
    float sun = smoothstep(0.21, 0.20, distance(rd, ld));
    if (sun > 0.0) {
        float yd = rd.y - ld.y;
        float a = sin(3.1 * exp(-yd * 14.0) - iTime * uSunStripeSpeed);
        sun *= smoothstep(-0.8, 0.0, a);
        col = mix(col, vec3(1.0, 0.8, 0.4) * 0.75, sun);
    }
}

vec3 gsky(vec3 rd, vec3 ld, bool mask) {
    float haze = exp2(-5.0 * (abs(rd.y) - 0.2 * dot(rd, ld)));
    float cNet = 0.0;
    if (mask && rd.y > 0.0) {
        cNet = constellations(rd);
        cNet *= (1.0 - min(haze, 1.0)) * smoothstep(0.0, 0.2, rd.y);
    }
    vec3 back = vec3(0.4, 0.1, 0.7) * (1.0 - 0.5 * exp2(-0.1 * abs(length(rd.xz)/max(abs(rd.y), 0.001))) * max(sign(rd.y), 0.0));
    vec3 col = clamp(mix(back, vec3(0.7, 0.1, 0.4), haze), 0.0, 1.0);
    if (mask) addsun(rd, ld, col);
    col += vec3(1.0) * cNet;
    return col;
}

void main() {
    vec2 uv = (vUv * 2.0 - 1.0) * iResolution.xy / iResolution.y;
    jTime = mod(iTime, 4000.0);
    vec3 ro = vec3(0.0, 1.0, -20000.0 + jTime * uSpeed);
    vec3 rd = normalize(vec3(uv, 1.333));
    vec2 i = intersect(ro, rd);
    float d = i.x;
    vec3 ld = normalize(vec3(0.0, 0.125 + 0.05 * sin(0.1 * jTime) + uSunY, 1.0));
    vec3 fog = d > 0.0 ? exp2(-d * vec3(0.14, 0.1, 0.28)) : vec3(0.0);
    vec3 sky = gsky(rd, ld, d < 0.0);
    vec3 col = vec3(0.0);
    if (d > 0.0) {
        vec3 p = ro + d * rd;
        vec3 n = normalize(grad(p));
        float diff = dot(n, ld) + 0.1 * n.y;
        col = vec3(0.1, 0.11, 0.18) * diff;
        vec3 rfd = reflect(rd, n);
        col = mix(col, gsky(rfd, ld, true), 0.05 + 0.95 * pow(max(1.0 + dot(rd, n), 0.0), 5.0));
        vec3 gridColor = mix(vec3(0.8, 0.1, 0.92), vec3(0.4, 0.5, 1.0), uVaporwaveMix);
        col = mix(col, gridColor, smoothstep(uGridGlow, 0.0, i.y));
        col = mix(sky, col, fog);
        col = mix(col, sqrt(col), uVaporwaveMix);
    } else {
        col = sky;
    }
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
