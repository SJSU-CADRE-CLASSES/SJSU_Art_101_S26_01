export type WorkAsset = { name: string; source: string };

export type Work = {
  id: string;
  shader?: WorkAsset;
  vertexShader?: WorkAsset;
  patch?: WorkAsset;
  controls?: WorkAsset;
};

export type Manifest = { version: 1; works: Work[] };

export type NormalizeMissing = 'default-work' | 'empty';

/** Fragment that clears to black; keeps the usual uniforms so it matches other shaders. */
export const DEFAULT_BLACK_FRAG = `uniform float iTime;
uniform vec2 iResolution;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

export function workWithDefaultBlack(id: string): Work {
  return {
    id,
    shader: { name: 'default-black.frag', source: DEFAULT_BLACK_FRAG },
  };
}

export function defaultStudioManifest(): Manifest {
  return { version: 1, works: [workWithDefaultBlack('work-1')] };
}

/** Any work without a non-empty fragment gets the default black shader (studio + performance baseline). */
export function worksWithDefaultBlackWhenMissing(works: Work[]): Work[] {
  return works.map((w) => {
    if (w.shader?.source?.trim()) return w;
    return { ...w, shader: { name: 'default-black.frag', source: DEFAULT_BLACK_FRAG } };
  });
}

/**
 * Coerce unknown DB JSON into a v1 manifest.
 * Use `missing: 'default-work'` for the studio editor (deterministic SSR id).
 * Use `missing: 'empty'` for performance/runtime when there is nothing to play.
 */
export function normalizeManifest(input: unknown, missing: NormalizeMissing = 'default-work'): Manifest {
  const v = input as { version?: unknown; works?: unknown } | null;
  if (v && v.version === 1 && Array.isArray(v.works)) {
    const w = v.works as Work[];
    // Explicit [] means “no works yet” (UI shows empty state). New sets use defaultStudioManifest() instead.
    if (w.length === 0) {
      return { version: 1, works: [] };
    }
    return { version: 1, works: worksWithDefaultBlackWhenMissing(w) };
  }
  if (missing === 'empty') {
    return { version: 1, works: [] };
  }
  // IMPORTANT: studio SSR + hydration must not use random IDs here.
  return defaultStudioManifest();
}
