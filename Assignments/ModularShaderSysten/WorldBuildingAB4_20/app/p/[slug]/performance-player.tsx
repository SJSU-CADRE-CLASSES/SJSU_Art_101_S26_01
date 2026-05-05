'use client';

import * as THREE from 'three';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeManifest, worksWithDefaultBlackWhenMissing, type Work } from '@/lib/manifest';
import { buildUniformsFromSchema, parseControlsSource } from '@/lib/shader-uniforms';

const FADE_MS = 280;

function findNextShaderIndex(works: Work[], from: number, dir: 1 | -1): number {
  if (works.length < 2) return from;
  for (let step = 1; step <= works.length; step++) {
    const i = (from + dir * step + works.length * 100) % works.length;
    if (works[i]?.shader?.source?.trim()) return i;
  }
  return from;
}

const DEFAULT_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

function isEditableTarget(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  if (!t) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function PerformancePlayer({
  title,
  slug,
  manifest,
  isDraft,
}: {
  title: string;
  slug: string;
  manifest: unknown;
  isDraft?: boolean;
}) {
  const parsed = useMemo(() => {
    const m = normalizeManifest(manifest, 'empty');
    if (m.works.length === 0) {
      return { version: 1 as const, works: [] };
    }
    return { version: 1 as const, works: worksWithDefaultBlackWhenMissing(m.works) };
  }, [manifest]);
  const works = parsed.works;

  const [workIdx, setWorkIdx] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(false);
  /** Navigation chrome (header, work switcher): hidden by default; see keyboard hint in controls panel. */
  const [chromeVisible, setChromeVisible] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [fadeOpacity, setFadeOpacity] = useState(1);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const wheelRootRef = useRef<HTMLDivElement | null>(null);
  const fadeShellRef = useRef<HTMLDivElement | null>(null);
  const uniformsRef = useRef<Record<string, THREE.IUniform> | null>(null);
  /** Pending slider values written by setUniform — flushed into uniformsRef every frame. */
  const pendingRef = useRef<Record<string, number>>({});
  const workIdxRef = useRef(0);
  const switchingRef = useRef(false);
  const fadeTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const safeIdx = Math.min(Math.max(0, workIdx), Math.max(0, works.length - 1));
  workIdxRef.current = safeIdx;
  const work = works[safeIdx];

  useEffect(() => {
    if (works.length === 0) return;
    if (workIdx < 0 || workIdx >= works.length) setWorkIdx(0);
  }, [works.length, workIdx]);
  const fragmentShader = work?.shader?.source;
  const vertexShader = work?.vertexShader?.source;
  const controlsSchema = useMemo(() => parseControlsSource(work?.controls?.source), [work?.controls?.source]);

  useEffect(() => {
    const macish =
      typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || navigator.platform || '');

    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      if (e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        setControlsVisible((v) => !v);
        return;
      }

      // Navigation chrome: Shift+C (same family as Shift+Space for controls). Mac: Control+C also works.
      const shiftC = e.code === 'KeyC' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey;
      const macControlC =
        macish && e.code === 'KeyC' && e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
      if (shiftC || macControlC) {
        if (typeof window !== 'undefined' && window.getSelection()?.toString()) return;
        e.preventDefault();
        setChromeVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clearFadeTimers = useCallback(() => {
    for (const t of fadeTimersRef.current) clearTimeout(t);
    fadeTimersRef.current = [];
    switchingRef.current = false;
  }, []);

  const goToWorkAnimated = useCallback(
    (nextIdx: number) => {
      if (nextIdx === workIdxRef.current) return;
      if (!works[nextIdx]?.shader?.source?.trim()) return;
      clearFadeTimers();
      switchingRef.current = true;

      // Ensure opacity 1 is committed before fading out (React batches consecutive setState).
      setFadeOpacity(1);
      const t0 = setTimeout(() => {
        setFadeOpacity(0);
        const t1 = setTimeout(() => {
          setWorkIdx(nextIdx);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setFadeOpacity(1);
              const t2 = setTimeout(() => {
                switchingRef.current = false;
              }, FADE_MS + 50);
              fadeTimersRef.current.push(t2);
            });
          });
        }, FADE_MS);
        fadeTimersRef.current.push(t1);
      }, 20);
      fadeTimersRef.current.push(t0);
    },
    [works, clearFadeTimers]
  );

  useEffect(() => () => clearFadeTimers(), [clearFadeTimers]);

  useEffect(() => {
    const root = wheelRootRef.current;
    if (!root || works.length < 2) return;

    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      if (switchingRef.current) {
        e.preventDefault();
        return;
      }
      const el = e.target as HTMLElement | null;
      if (el?.closest('[data-performance-controls]')) return;

      e.preventDefault();
      acc += e.deltaY;
      const TH = 80;
      if (acc > TH) {
        acc = 0;
        const next = findNextShaderIndex(works, workIdxRef.current, 1);
        goToWorkAnimated(next);
      } else if (acc < -TH) {
        acc = 0;
        const next = findNextShaderIndex(works, workIdxRef.current, -1);
        goToWorkAnimated(next);
      }
    };

    root.addEventListener('wheel', onWheel, { passive: false });
    return () => root.removeEventListener('wheel', onWheel);
  }, [works, goToWorkAnimated]);

  useEffect(() => {
    uniformsRef.current = null;
    pendingRef.current = {};   // clear stale slider values when work changes
    setStatus(null);

    const mount = mountRef.current;
    if (!mount) return;
    mount.innerHTML = '';

    if (!fragmentShader?.trim()) {
      setStatus('This work has no fragment shader yet.');
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 1);
    renderer.debug.onShaderError = (gl, program, vs, fs) => {
      const parts = [gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs), gl.getProgramInfoLog(program)]
        .map((s) => (s || '').trim())
        .filter(Boolean);
      setStatus(parts.join('\n\n') || 'Shader could not compile.');
    };
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const dynamic = buildUniformsFromSchema(controlsSchema);
    const uniforms: Record<string, THREE.IUniform> = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2(width, height) },
      iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
      ...dynamic,
    };
    uniformsRef.current = uniforms;

    const vertex = vertexShader?.trim() ? vertexShader : DEFAULT_VERTEX;

    let material: THREE.ShaderMaterial;
    try {
      material = new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader,
        uniforms,
        depthWrite: false,
        depthTest: false,
      });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Shader compile failed');
      renderer.dispose();
      return;
    }

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    const clock = new THREE.Clock();

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      const u = uniforms.iResolution;
      if (u && u.value instanceof THREE.Vector2) {
        u.value.set(w, h);
      }
    };
    window.addEventListener('resize', onResize);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      uniforms.iTime.value = clock.getElapsedTime();
      // Flush any slider values written by setUniform this frame
      const pending = pendingRef.current;
      for (const key in pending) {
        if (uniforms[key]) uniforms[key].value = pending[key];
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.debug.onShaderError = null;
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
      mount.innerHTML = '';
      uniformsRef.current = null;
    };
  }, [fragmentShader, vertexShader, controlsSchema]);

  const setUniform = useCallback((name: string, value: number) => {
    // Write into the pending buffer — the tick loop flushes this into the
    // live Three.js uniforms object every frame, even if the uniforms object
    // was rebuilt after the initial controlsSchema parse.
    pendingRef.current[name] = value;
    // Also write directly if the uniform slot already exists.
    const u = uniformsRef.current?.[name];
    if (u) u.value = value;
  }, []);

  if (works.length === 0) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          color: 'var(--fg)',
          display: 'grid',
          placeItems: 'center',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '24rem' }}>
          <p style={{ fontSize: '1.05rem', margin: '0 0 0.75rem' }}>No works available.</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0 0 1.25rem' }}>
            This set has no works in its manifest yet. Add shaders and assets in Studio, then save.
          </p>
          <p style={{ fontSize: '0.85rem' }}>
            <Link href={`/studio/${slug}`}>Open in Studio</Link>
            {' · '}
            <Link href="/studio">All sets</Link>
            {' · '}
            <Link href="/">Home</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', color: 'var(--fg)' }}>
      <div ref={wheelRootRef} style={{ position: 'absolute', inset: 0 }}>
        <div
          ref={fadeShellRef}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: fadeOpacity,
            transition: `opacity ${FADE_MS}ms ease`,
            background: '#000',
          }}
        >
          <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
        </div>
      </div>

      {status ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: '2rem',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ pointerEvents: 'auto', maxWidth: '28rem' }}>
            <p style={{ color: '#f66', marginBottom: '1rem' }}>{status}</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              Add a fragment shader in{' '}
              <Link href={`/studio/${slug}`}>Studio</Link>.
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '1rem', lineHeight: 1.45 }}>
              Show navigation: <kbd>Shift+C</kbd> (Mac: also <kbd>Control+C</kbd>)
            </p>
          </div>
        </div>
      ) : null}

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: '0.65rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem 1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 2,
          pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
          opacity: chromeVisible ? 1 : 0,
          transform: chromeVisible ? 'translateY(0)' : 'translateY(-6px)',
          transition: 'opacity 160ms ease, transform 160ms ease',
          visibility: chromeVisible ? 'visible' : 'hidden',
        }}
      >
        <div style={{ pointerEvents: 'auto', fontSize: '0.78rem', color: 'var(--muted)' }}>
          <Link href="/">Home</Link>
          <span style={{ opacity: 0.45 }}>{' · '}</span>
          <Link href="/studio">Studio</Link>
          <span style={{ opacity: 0.45 }}>{' · '}</span>
          <Link href={`/studio/${slug}`}>Edit set</Link>
        </div>
        <div style={{ pointerEvents: 'none', textAlign: 'right' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#fff' }}>{title}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            {isDraft ? <span style={{ color: '#fa0', marginRight: '0.5rem' }}>draft</span> : null}
            <code style={{ color: 'var(--accent)' }}>/p/{slug}</code>
          </div>
        </div>
      </div>

      {works.length > 1 ? (
        <div
          style={{
            position: 'fixed',
            bottom: '1rem',
            left: '50%',
            transform: chromeVisible ? 'translateX(-50%)' : 'translateX(-50%) translateY(12px)',
            display: 'flex',
            gap: '0.35rem',
            zIndex: 2,
            pointerEvents: chromeVisible ? 'auto' : 'none',
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: 'calc(100% - 2rem)',
            opacity: chromeVisible ? 1 : 0,
            transition: 'opacity 160ms ease, transform 160ms ease',
            visibility: chromeVisible ? 'visible' : 'hidden',
          }}
        >
          {works.map((w, i) => {
            const hasShader = Boolean(w.shader?.source?.trim());
            const active = i === safeIdx;
            return (
              <button
                key={w.id}
                type="button"
                disabled={!hasShader}
                onClick={() => goToWorkAnimated(i)}
                style={{
                  fontSize: '0.72rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 999,
                  border: `1px solid ${active ? 'var(--accent)' : '#333'}`,
                  background: active ? 'rgba(0,255,128,0.12)' : '#0a0a0a',
                  color: hasShader ? (active ? 'var(--accent)' : 'var(--muted)') : '#444',
                  cursor: hasShader ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                }}
              >
                {i + 1}
                {w.shader?.name ? ` · ${w.shader.name}` : ''}
              </button>
            );
          })}
        </div>
      ) : null}

      {controlsSchema && controlsSchema.controls.length > 0 ? (
        <div
          data-performance-controls
          style={{
            position: 'fixed',
            bottom: works.length > 1 ? '3.25rem' : '1rem',
            right: '1rem',
            width: 'min(18rem, calc(100vw - 2rem))',
            maxHeight: '42vh',
            overflow: 'auto',
            zIndex: 2,
            pointerEvents: 'auto',
            padding: '0.75rem',
            borderRadius: 10,
            border: '1px solid #222',
            background: 'rgba(8,8,8,0.92)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            fontSize: '0.78rem',
            opacity: controlsVisible ? 1 : 0,
            transform: controlsVisible ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 160ms ease, transform 160ms ease',
            visibility: controlsVisible ? 'visible' : 'hidden',
          }}
        >
          <div style={{ color: 'var(--muted)', marginBottom: '0.5rem' }}>Controls</div>
          {controlsSchema.controls.map((c) => {
            if (c.type === 'range' && c.uniform) {
              return (
                <label key={c.id} style={{ display: 'block', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: 2 }}>
                    <span>{c.label}</span>
                    <span style={{ color: 'var(--muted)' }}>{c.uniform}</span>
                  </div>
                  <input
                    key={`${safeIdx}-range-${c.id}`}
                    type="range"
                    min={c.min}
                    max={c.max}
                    step={c.step ?? (c.max - c.min) / 100}
                    defaultValue={c.default}
                    onInput={(e) => setUniform(c.uniform!, parseFloat((e.target as HTMLInputElement).value))}
                    style={{ width: '100%' }}
                  />
                </label>
              );
            }
            if (c.type === 'checkbox' && c.uniform) {
              return (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.55rem' }}>
                  <input
                    key={`${safeIdx}-chk-${c.id}`}
                    type="checkbox"
                    defaultChecked={c.default}
                    onChange={(e) => setUniform(c.uniform!, e.target.checked ? 1 : 0)}
                  />
                  <span>
                    {c.label} <span style={{ color: 'var(--muted)' }}>({c.uniform})</span>
                  </span>
                </label>
              );
            }
            if (c.type === 'select' && c.uniform) {
              return (
                <label key={c.id} style={{ display: 'block', marginBottom: '0.65rem' }}>
                  <div style={{ marginBottom: 4 }}>{c.label}</div>
                  <select
                    key={`${safeIdx}-sel-${c.id}`}
                    defaultValue={c.default}
                    onChange={(e) => {
                      const idx = Math.max(
                        0,
                        c.options.findIndex((o) => o.value === (e.target as HTMLSelectElement).value)
                      );
                      setUniform(c.uniform!, idx);
                    }}
                    style={{ width: '100%', background: '#111', color: '#eee', border: '1px solid #333', borderRadius: 6, padding: '0.25rem' }}
                  >
                    {c.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }
            return (
              <div key={c.id} style={{ color: 'var(--muted)', marginBottom: '0.45rem' }}>
                {c.label} — add a <code>uniform</code> name in Studio to drive the shader.
              </div>
            );
          })}
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.45 }}>
            Shift+Space toggles this panel.
            <br />
            Navigation: <kbd style={{ opacity: 0.9 }}>Shift+C</kbd> (Mac: also <kbd style={{ opacity: 0.9 }}>Control+C</kbd>)
            {works.length > 1 ? (
              <>
                <br />
                Scroll wheel switches works (fades between).
              </>
            ) : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}
