export const vertexShader3Radial = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

export const fragmentShader3Radial = `
uniform sampler2D tDiffuse;
uniform float iTime;
uniform vec2 iResolution;

// Exposed Parameters
uniform float uDecay;
uniform float uDensity;
uniform float uWeight;

varying vec2 vUv;

// WebGL requires constants for looping
const float SAMPLES = 24.0; 

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.0, 289.0)))*45758.5453); }

vec3 lOff() {    
    vec2 u = sin(vec2(1.57, 0.0) - iTime/2.0);
    mat2 a = mat2(u.x, u.y, -u.y, u.x);
    
    vec3 l = normalize(vec3(1.5, 1.0, -0.5));
    l.xz = a * l.xz;
    l.xy = a * l.xy;
    
    return l;
}

void main() {
    vec2 uv = vUv;
    vec3 l = lOff();
    vec2 tuv = uv - 0.5 - l.xy * 0.45;
    vec2 dTuv = tuv * uDensity / SAMPLES;
    
    vec4 col = texture2D(tDiffuse, uv) * 0.25;
    
    uv += dTuv * (hash(uv + fract(iTime)) * 2.0 - 1.0);
    
    float currentWeight = uWeight;
    for(float i=0.0; i < SAMPLES; i++) {
        uv -= dTuv;
        col += texture2D(tDiffuse, uv) * currentWeight;
        currentWeight *= uDecay;
    }
    
    col.rgb *= (1.0 - dot(tuv, tuv) * 0.75);
    
    gl_FragColor = vec4(sqrt(smoothstep(0.0, 1.0, col.rgb)), 1.0);
}
`;
