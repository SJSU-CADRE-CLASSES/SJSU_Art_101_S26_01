export const vertexShaderDOF = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

export const fragmentShaderDOF = `
// Translated precisely from Shadertoy User snippet
uniform sampler2D tDiffuse;
uniform vec2 iResolution;
uniform float uFocalDepth;
uniform float uCircleOfConfusion;

varying vec2 vUv;

vec3 DpthFld(sampler2D iCh, vec2 uv){
    float focD = uFocalDepth;
    float coc = uCircleOfConfusion;
    
    // Uses the .w (alpha channel) which we mapped to pure depth (T) from the first pass
    float l = abs(texture2D(iCh, uv).w - focD - coc) - coc;
    float dof = clamp(l/coc, 0.0, 2.0); 
    
    vec3 acc = vec3(0.0);
    
    // WebGL loops require integer thresholds
    for(int i = 0; i < 25; i++){
        float fi = float(i);
        vec2 offset = vec2(floor(fi / 5.0), mod(fi, 5.0)) - 2.0;
        acc += texture2D(iCh, uv + offset / vec2(800.0, 450.0) * dof).xyz;
    }

    return acc / 25.0;
}

void main() {
    vec3 color = DpthFld(tDiffuse, vUv);
    gl_FragColor = vec4(color, 1.0);
}
`;
