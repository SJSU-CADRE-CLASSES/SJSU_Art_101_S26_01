// Project 6 — DVD Ripple
// Bouncing DVD logos with spectral ripple reflections and specular lighting.
// uNumLogos is driven as a float (0-5) — truncated to int in-shader.
// uMonochrome is a float checkbox (0 = color, 1 = mono).

#define PI 3.14159265359

uniform float iTime;
uniform vec2  iResolution;

uniform float uNumLogos;
uniform float uRippleSpread;
uniform float uRippleFreq;
uniform float uBaseSpeed;
uniform float uLogoScale;
uniform float uMonochrome;
uniform float uBumpFactor;
uniform float uOffsetDistance;
uniform float uSpecularIntensity;
uniform float uSpecularShininess;

varying vec2 vUv;

float vminV(vec2 v) { return min(v.x, v.y); }
float vmaxV(vec2 v) { return max(v.x, v.y); }

float ellip(vec2 p, vec2 s) { float m = vminV(s); return (length(p/s)*m) - m; }
float halfEllip(vec2 p, vec2 s) { p.x = max(0.0, p.x); float m = vminV(s); return (length(p/s)*m) - m; }
float fBox(vec2 p, vec2 b) { return vmaxV(abs(p) - b); }

float dvd_d(vec2 p) {
    float d = halfEllip(p, vec2(0.8, 0.5)); d = max(d, -p.x - 0.5);
    float d2 = halfEllip(p, vec2(0.45, 0.3)); d2 = max(d2, min(-p.y + 0.2, -p.x - 0.15));
    return max(d, -d2);
}
float dvd_v(vec2 p) {
    vec2 pp = p; p.y += 0.7; p.x = abs(p.x);
    vec2 a = normalize(vec2(1.0, -0.55));
    float d = dot(p, a); float d2 = d + 0.3;
    p = pp; d = min(d, -p.y + 0.3); d2 = min(d2, -p.y + 0.5);
    d = max(d, -d2); d = max(d, abs(p.x + 0.3) - 1.1);
    return d;
}
float dvd_c(vec2 p) {
    p.y += 0.95; float d = ellip(p, vec2(1.8, 0.25)); float d2 = ellip(p, vec2(0.45, 0.09));
    return max(d, -d2);
}
float dvd(vec2 p) {
    p.y -= 0.345; p.x -= 0.035;
    p *= mat2(1.0, -0.2, 0.0, 1.0);
    float d = dvd_v(p); d = min(d, dvd_c(p));
    p.x += 1.3; d = min(d, dvd_d(p));
    p.x -= 2.4; d = min(d, dvd_d(p));
    return d;
}

float rangec(float a, float b, float t) { return clamp((t-a)/(b-a), 0.0, 1.0); }

vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b*cos(6.28318*(c*t+d)); }
vec3 spectrum(float n) { return pal(n, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0,0.33,0.67)); }

void drawHit(inout vec4 col, vec2 p, vec2 hitPos, float hitDist) {
    float d = length(p - hitPos);
    float wavefront = d - hitDist * uRippleSpread;
    float freq = uRippleFreq;
    vec3 spec = 1.0 - spectrum(-wavefront * freq + hitDist * freq);
    float ripple = sin((wavefront * freq) * PI*2.0 - PI/2.0);
    float blend = smoothstep(3.0, 0.0, hitDist);
    blend *= smoothstep(0.2, -0.5, wavefront);
    blend *= rangec(-4.0, 0.0, wavefront);
    col.rgb *= mix(vec3(1.0), spec, pow(blend, 4.0));
    col.a -= ripple * blend * 1.9 / freq;
}

vec2 ref2(vec2 p, vec2 n, float o) { float t = dot(p,n)+o; p -= 2.0*t*n; return p; }

void drawReflectedHit(inout vec4 col, vec2 p, vec2 hitPos, float hitDist, vec2 screenSize) {
    col.a += length(p) * 0.0001;
    drawHit(col, p, ref2(hitPos, vec2(0.0, 1.0), 1.0), hitDist);
    drawHit(col, p, ref2(hitPos, vec2(0.0,-1.0), 1.0), hitDist);
    drawHit(col, p, ref2(hitPos, vec2(1.0, 0.0), screenSize.x/screenSize.y), hitDist);
    drawHit(col, p, ref2(hitPos, vec2(-1.0,0.0), screenSize.x/screenSize.y), hitDist);
}

void flipV(inout vec2 pos) {
    vec2 f = mod(floor(pos), 2.0);
    pos = abs(f - mod(pos, 1.0));
}

float stepSign(float a) { return step(0.0, a) * 2.0 - 1.0; }
vec2 compassDir(vec2 p) {
    vec2 a = vec2(stepSign(p.x), 0.0);
    vec2 b = vec2(0.0, stepSign(p.y));
    float s = stepSign(p.x - p.y) * stepSign(-p.x - p.y);
    return mix(a, b, s * 0.5 + 0.5);
}

vec2 calcHitPos(vec2 move, vec2 dir, vec2 size) {
    vec2 hitPos = mod(move, 1.0);
    vec2 xCross = hitPos - hitPos.x / (size / size.x) * (dir / dir.x);
    vec2 yCross = hitPos - hitPos.y / (size / size.y) * (dir / dir.y);
    hitPos = max(xCross, yCross);
    hitPos += floor(move);
    return hitPos;
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    vec2 fragCoord = vUv * iResolution;
    vec2 p = (-iResolution.xy + 2.0*fragCoord) / iResolution.y;
    vec2 screenSize = vec2(iResolution.x/iResolution.y, 1.0) * 2.0;

    vec4 col  = vec4(1.0, 1.0, 1.0, 0.0);
    vec4 colFx = vec4(1.0, 1.0, 1.0, 0.0);
    vec4 colFy = vec4(1.0, 1.0, 1.0, 0.0);
    vec2 e = vec2(uOffsetDistance, 0.0) / iResolution.y;

    float logoScale = uLogoScale;
    vec2 logoSize = vec2(2.0, 0.85) * logoScale;
    vec2 size = screenSize - logoSize * 2.0;

    float finalDvdMask = 1.0;
    int numLogos = int(clamp(uNumLogos, 1.0, 5.0));

    for (int idx = 0; idx < 5; ++idx) {
        if (idx >= numLogos) break;
        float fIdx = float(idx);
        float offsetTime = iTime * uBaseSpeed + (fIdx * 123.456);
        float angleX = mod(fIdx * 5.12, 10.0) + 7.0;
        float angleY = mod(fIdx * 8.43, 10.0) + 12.0;
        vec2 activeDir = normalize(vec2(angleX, angleY) * screenSize);
        vec2 move = activeDir * offsetTime / 1.5;
        move = move / size + 0.5;

        vec2 lastHitPos = calcHitPos(move, activeDir, size);
        for (int i = 0; i < 15; i++) {
            vec2 hitPos = lastHitPos;
            if (i > 0) hitPos = calcHitPos(hitPos - 0.00001/size, activeDir, size);
            lastHitPos = hitPos;
            float hitDist = distance(hitPos, move);
            if (hitDist > 3.0) break;
            flipV(hitPos);
            hitPos = (hitPos - 0.5) * size;
            hitPos += logoSize * compassDir(hitPos / size);
            drawReflectedHit(col,   p,       hitPos, hitDist, screenSize);
            drawReflectedHit(colFx, p+e,     hitPos, hitDist, screenSize);
            drawReflectedHit(colFy, p+e.yx,  hitPos, hitDist, screenSize);
        }
        flipV(move);
        move = (move - 0.5) * size;
        float dMask = dvd((p - move) / logoScale);
        float fw = max(fwidth(dMask), 0.001);
        dMask = 1.0 - clamp(dMask / fw, 0.0, 1.0);
        finalDvdMask = min(finalDvdMask, 1.0 - dMask);
    }

    float fx = (col.a - colFx.a) * 2.0;
    float fy = (col.a - colFy.a) * 2.0;
    float ff = length(vec2(fx, fy));
    float ee = rangec(0.0, 10.0/iResolution.y, ff);
    vec3 nor = normalize(vec3(vec2(fx, fy)*ee, ff));

    col.rgb = clamp(1.0 - col.rgb, 0.0, 1.0) / 3.0;

    vec3 lig = normalize(vec3(1.0, 2.0, 2.0));
    vec3 rd = normalize(vec3(p, -10.0));
    vec3 hal = normalize(lig - rd);
    float dif = clamp(dot(lig, nor), 0.0, 1.0);
    float spe = pow(clamp(dot(nor, hal), 0.0, 1.0), uSpecularShininess)
                * dif
                * (0.04 + 0.96*pow(clamp(1.0+dot(hal,rd),0.0,1.0), 5.0));
    col.rgb = col.rgb * (5.0*dif + 0.2) + uSpecularIntensity * spe;
    col.rgb = mix(col.rgb, vec3(1.0), 1.0 - finalDvdMask);
    col.rgb += (hash12(fragCoord) * 2.0 - 1.0) * 0.005;
    col.rgb = pow(col.rgb, vec3(1.0/1.5));

    if (uMonochrome > 0.5) {
        float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
        col.rgb = vec3(gray);
    }

    col.a = col.a * 0.5 + 0.5;
    col.a *= 0.3;
    gl_FragColor = col;
}
