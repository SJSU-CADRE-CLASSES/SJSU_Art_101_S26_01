// helpers 0
const float tau  = atan(1.)*8.;
const float pi   = tau/2.;
const float tauq = tau/4.;

#define rot(a) mat2(cos((a)*tau + vec4(0.0, tauq, 3.0*tauq, 0.0)))


// --------------------- palette ------------------
#define PALETTE_CLICK 1
vec3 paletteSelect(float t, int pal) {
    if(pal == PALETTE_CLICK) { // pastel
        vec3 a = vec3(0.55, 0.55, 0.60);
        vec3 b = vec3(0.35, 0.30, 0.25);
        vec3 c = vec3(1.0);
        vec3 d = vec3(0.00, 0.15, 0.25);
        return ( a + 1.3*b*cos(tau*(c*t + d)) );
    }

    vec3 a = vec3(.248, 0.645, 0.135);
    vec3 b = vec3(0., 0.40, 0.135);
    vec3 c = vec3(.5);
    vec3 d = vec3(0.00, 0.10, 0.20)+.2;
    return a + b*cos(tau*(c*t + d));
}

vec3 pickTetraColor(float idx, vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4)
{
    return (idx < 0.5) ? c0 :
           (idx < 1.5) ? c1 :
           (idx < 2.5) ? c2 :
           (idx < 3.5) ? c3 : c4;
}



// ---------------------- noise helpers ----------------------
float hash13(vec3 p) {
    p = fract(p*0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x+p.y)*p.z);
}

float noise3d(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f*f*(3.0-2.0*f);

    float n000 = hash13(i+vec3(0,0,0));
    float n100 = hash13(i+vec3(1,0,0));
    float n010 = hash13(i+vec3(0,1,0));
    float n110 = hash13(i+vec3(1,1,0));
    float n001 = hash13(i+vec3(0,0,1));
    float n101 = hash13(i+vec3(1,0,1));
    float n011 = hash13(i+vec3(0,1,1));
    float n111 = hash13(i+vec3(1,1,1));

    float nx00 = mix(n000,n100,f.x);
    float nx10 = mix(n010,n110,f.x);
    float nx01 = mix(n001,n101,f.x);
    float nx11 = mix(n011,n111,f.x);

    float nxy0 = mix(nx00,nx10,f.y);
    float nxy1 = mix(nx01,nx11,f.y);

    return mix(nxy0,nxy1,f.z);
}

float hash12(vec2 p)
{
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// tonemaps

#define tonemap(x) ((x*1.05)/((x)+vec3(1.)))

vec3 tonemap2(vec3 o)
{
	float w = 1.;
	float l = dot(o.rgb, vec3(0.2126, 0.7152, 0.0722));
	float L = l * (1. + l / (w*w)) / (1. + l);
	o.rgb *= L / l;
	return tanh( o*.75 )*.9; // twist
}
