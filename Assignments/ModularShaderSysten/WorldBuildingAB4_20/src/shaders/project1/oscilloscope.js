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
uniform vec2 uControllerRot;

// Dynamic Modifiers
uniform float uThickness;
uniform float uStructureWidth;
uniform float uNoiseDensity;
uniform float uNoiseSpeed;
uniform float uOutlineTightness;
uniform float uInnerVolumeGlow;
uniform float uVignette;
uniform float uZoom;

varying vec2 vUv;

vec3 rotateY(vec3 v, float t){
    float cost = cos(t); float sint = sin(t);
    return vec3(v.x * cost + v.z * sint, v.y, -v.x * sint + v.z * cost);
}

vec3 rotateX(vec3 v, float t){
    float cost = cos(t); float sint = sin(t);
    return vec3(v.x, v.y * cost - v.z * sint, v.y * sint + v.z * cost);
}

float smin( float a, float b, float k )
{
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}

float proceduralNoise(vec3 p){
    float t = iTime;
    vec3 np = normalize(p);
    
    // Smooth procedural sine interference influenced by sliders
    float a = sin(np.x * uNoiseDensity + t * uNoiseSpeed) * 0.5 + 0.5;      
    float b = sin(np.y * uNoiseDensity - t * uNoiseSpeed + 0.8) * 0.5 + 0.5;
    
    a = mix(a, 0.5, abs(np.x));
    b = mix(b, 0.5, abs(np.z));
    
    float n = a + b - 0.4;    
    n = mix(n, 0.5, abs(np.y) / 2.0);
        
    return n;
}

float map(vec3 p){
    p = rotateX(p, uControllerRot.y * 3.14);
    p = rotateY(p, uControllerRot.x * 3.14);
    
    float d = (-1.0 * length(p) + 3.0) + 1.5 * proceduralNoise(p);    
    d = min(d, (length(p) - 1.5) + 1.5 * proceduralNoise(p));  
    
    float m = uThickness; float s = uStructureWidth; 
    d = smin(d, max(abs(p.x) - s, abs(p.y + p.z * 0.2) - 0.07), m);          
    d = smin(d, max(abs(p.z) - s, abs(p.x + p.y / 2.0) - 0.07), m);    
    d = smin(d, max(abs(p.z - p.y * 0.4) - s, abs(p.x - p.y * 0.2) - 0.07), m);    
    d = smin(d, max(abs(p.z * 0.2 - p.y) - s, abs(p.x + p.z) - 0.07), m);    
    d = smin(d, max(abs(p.z * -0.2 + p.y) - s, abs(-p.x + p.z) - 0.07), m);
    
    return d;
}

vec3 calcNormal(vec3 p) {
    const float eps = 0.001;
    const vec2 h = vec2(eps, 0.0);
    return normalize(vec3(
        map(p + h.xyy) - map(p - h.xyy),
        map(p + h.yxy) - map(p - h.yxy),
        map(p + h.yyx) - map(p - h.yyx)
    ));
}

void main()
{    
    vec2 fragCoord = vUv * iResolution;
    vec2 uv = fragCoord.xy * 2.0 / iResolution.xy - 1.0;
    uv.x *= iResolution.x / iResolution.y;
    
    uv /= exp2(uZoom * 6.0); // Infinite inward scaling mechanism
    
    vec3 ray = normalize(vec3(uv.x, uv.y, 1.0));
    
    vec3 color = vec3(0.0);    
    const int rayCount = 100;
    
    float t = 0.0;
    for (int r = 1; r <= rayCount; r++)
    {
        vec3 p = vec3(0.0, 0.0, -3.0) + ray * t; // Reverting camera back to default     
        p = rotateY(p, iTime / 3.0);
        
        float mask = max(0.0, (1.0 - length(p / 3.0)));
        p = rotateY(p, mask * sin(iTime / 2.0) * 1.2);        
        p.y += sin(iTime + p.x) * mask * 0.5;
        p *= 1.1 + (sin(iTime / 2.0) * mask * 0.3);

        float d = map(p);   
        
        if (d < 0.01 || r == rayCount)
        {                 
            float iter = float(r) / float(rayCount);
            vec3 n = calcNormal(p);
            float rim = 1.0 - max(0.0, dot(-ray, n));
            
            float outline = pow(rim, uOutlineTightness); 
            float depthFalloff = 1.0 / (1.0 + t * t * 0.1);
            float nearFade = smoothstep(0.1, 1.2, t); // Strictly fades pixels that get dangerously close to the lens
            
            color = vec3(1.0) * outline * depthFalloff * nearFade;
            color += vec3(1.0) * pow(iter, uInnerVolumeGlow) * nearFade;
            
            break;          
        }
        
        if (t > 15.0) break;
        t += d * 0.5; 
    }
    
    uv = fragCoord.xy / iResolution.xy;
    uv *= 1.0 - uv.yx; 
    float vig = uv.x * uv.y * 30.0;    
    color *= pow(vig, uVignette);        
    
    gl_FragColor = vec4(color, 1.0);
}
`;
