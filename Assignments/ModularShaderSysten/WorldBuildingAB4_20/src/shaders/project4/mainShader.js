export const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

export const fragmentShader = `
uniform float iTime;
uniform vec2 iResolution;

uniform float uSpeed;
uniform vec3 uGlowColor;
uniform float uGridDensity;
uniform float uExposure;

varying vec2 vUv;

#define T (iTime * uSpeed)
#define P(z) (vec3(cos((z)*0.06)*16.0, cos((z)*0.125)*7.0-26.0, (z)))
#define R(a) mat2(cos(a), -sin(a), sin(a), cos(a))
#define N normalize

float tunnel(vec3 p) {
    p = abs(p - P(p.z));
    return 0.3 - length(max(p.xy, 0.0));
}

float box(vec3 p, float i) {
    p = abs(fract(p/i)*i - i*0.5) - i*0.2;
    return min(p.x, min(p.y, p.z));
}

float boxen(vec3 p) {
    float d = -9e9;
    float i = uGridDensity * 8.0; 
    for(int k=0; k<10; k++) { 
        if (i <= 0.8) break;
        p.xy *= R(0.6);
        d = max(d, box(p, i));
        i *= 0.8;
    }
    return d;
}

vec4 light = vec4(0.0);

float map(vec3 p) {
    vec3 q = P(p.z);
    float e = 0.001 + abs(length(p.xy - q.xy - sin(cos(p.z*2.0)*0.5 + vec2(0.0, 1.57))) - 0.1);

    light += vec4(uGlowColor * 5.0, 0.0) / e;
    return min(e, max(tunnel(p), boxen(p)));
}

vec4 tanhCustom(vec4 v) {
    vec4 e2x = exp(2.0 * v);
    return (e2x - 1.0) / (e2x + 1.0);
}

void main() {
    vec4 o = vec4(0.0); 
    float s = 0.0, d = 0.0;
    
    vec2 u = (vUv * 2.0 - 1.0) * iResolution.xy / iResolution.y;

    vec3 p = P(T);
    vec3 Z = N(P(T + 10.0) - p);
    vec3 X = N(vec3(Z.z, 0.0, -Z.x));
    
    vec2 rotFactor = R(sin(T*0.2)*0.8) * u;
    vec3 D = N(vec3(rotFactor, 1.0) * mat3(-X, cross(X, Z), Z));

    // Reset global accumulator safely every frame render
    light = vec4(0.0);

    for(int k=0; k<70; k++) { 
        if (d >= 30.0) break; 
        
        s = 0.001 + 0.9 * abs(map(p));
        d += s;
        p += D * s * 0.8;
        
        o += 1.0 / s + light;
    }

    o /= uExposure * 1000000.0;
    
    vec4 bg = vec4(uGlowColor * 0.2, 0.0);
    o = mix(o * o, bg, smoothstep(0.0, 30.0, d));
    
    gl_FragColor = tanhCustom(o);
}
`;
