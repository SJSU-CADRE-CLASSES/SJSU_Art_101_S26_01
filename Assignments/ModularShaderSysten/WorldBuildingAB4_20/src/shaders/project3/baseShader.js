export const vertexShader3Base = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

export const fragmentShader3Base = `
uniform float iTime;
uniform vec2 iResolution;
uniform float uFractalScale;
uniform float uGlowIntensity;
uniform float uIterations;

varying vec2 vUv;

// Rotation matrix
mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float maxcomp(vec3 p) { return max(p.x, max(p.y, p.z)); }

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(maxcomp(q), 0.0);
}

// Menger Sponge SDF
float map(vec3 p) {
    float d = sdBox(p, vec3(1.0));
    float s = 1.0;
    for(int m = 0; m < 5; m++) {
        if(float(m) > uIterations) break;
        
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

void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= iResolution.x / iResolution.y;

    vec3 ro = vec3(0.0, 0.0, -2.5);
    vec3 rd = normalize(vec3(uv, 1.0));
    
    // Tumble the camera
    ro.xz *= rot(iTime * 0.2);
    rd.xz *= rot(iTime * 0.2);
    ro.yz *= rot(iTime * 0.15);
    rd.yz *= rot(iTime * 0.15);

    float t = 0.0;
    float maxD = 10.0;
    vec3 p;
    for(int i = 0; i < 100; i++) {
        p = ro + rd * t;
        float d = map(p);
        if(d < 0.001 || t > maxD) break;
        t += d;
    }

    vec3 col = vec3(0.0);
    
    if(t < maxD) {
        vec3 n = calcNormal(p);
        vec3 l = normalize(vec3(1.0, 1.0, -1.0));
        l.xz *= rot(iTime);
        
        float diff = max(dot(n, l), 0.0);
        float amb = 0.2;
        
        vec3 matObj = vec3(0.5, 0.8, 1.0); 
        col = matObj * (diff + amb);
        
        // Depth fog
        col = mix(col, vec3(0.0), smoothstep(0.0, maxD, t));
    }
    
    // Artificial volumetric glow from core
    col += vec3(0.1, 0.4, 0.8) * uGlowIntensity / (1.0 + t*t);
    
    gl_FragColor = vec4(col, 1.0);
}
`;
