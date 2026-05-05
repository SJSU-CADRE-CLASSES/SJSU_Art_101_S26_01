'use client';

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as THREE from 'three';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { validateControlsSchemaJson } from '@/lib/controls-schema';
import { normalizeManifest, workWithDefaultBlack, type Manifest, type Work } from '@/lib/manifest';
import { buildUniformsFromSchema, parseControlsSource } from '@/lib/shader-uniforms';

const DROP_ZONE_HEIGHT = 54;
const PREVIEW_W = 160;
const PREVIEW_H = 90;

function DropSquare({
  label,
  valueLabel,
  onPickFile,
  accept,
  zoneHeight = DROP_ZONE_HEIGHT,
}: {
  label: string;
  valueLabel?: string;
  accept: string;
  onPickFile: (file: File) => void;
  /** Pixel height of the dashed drop area */
  zoneHeight?: number;
}) {
  const [isOver, setIsOver] = useState(false);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onPickFile(file);
    },
    [onPickFile]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', minHeight: '1rem' }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{label}</span>
        <span
          style={{
            fontSize: '0.65rem',
            color: 'var(--muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '42%',
            textAlign: 'right',
          }}
        >
          {valueLabel ?? ''}
        </span>
      </div>

      <label
        onDragEnter={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setIsOver(false)}
        onDrop={onDrop}
        style={{
          width: '100%',
          height: zoneHeight,
          border: `1px dashed ${isOver ? 'var(--accent)' : '#333'}`,
          borderRadius: 8,
          background: isOver ? 'rgba(0,255,128,0.06)' : '#070707',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <input
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickFile(f);
            e.target.value = '';
          }}
        />
        <div style={{ textAlign: 'center', lineHeight: 1.1 }}>
          <div style={{ fontSize: '1.1rem', color: 'var(--accent)' }}>+</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>Drop / click</div>
        </div>
      </label>
    </div>
  );
}

const DEFAULT_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

function ShaderPreview({
  fragmentShader,
  vertexShader,
  controlsSource,
  width = PREVIEW_W,
  height = PREVIEW_H,
}: {
  fragmentShader?: string;
  vertexShader?: string;
  controlsSource?: string;
  width?: number;
  height?: number;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const controlsSchema = useMemo(() => parseControlsSource(controlsSource), [controlsSource]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    mount.innerHTML = '';
    setErr(null);

    if (!fragmentShader) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
      setErr(e instanceof Error ? e.message : 'Shader compile failed');
      renderer.dispose();
      return;
    }

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    let raf = 0;
    const start = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      uniforms.iTime.value = (performance.now() - start) / 1000;
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, [fragmentShader, vertexShader, controlsSchema, width, height]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Preview</span>
      <div
        style={{
          width,
          height,
          border: '1px solid #222',
          borderRadius: 8,
          background: '#050505',
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {err ? (
          <span style={{ color: '#f66', fontSize: '0.65rem', padding: '0 0.35rem' }}>{err}</span>
        ) : fragmentShader ? (
          <div ref={mountRef} />
        ) : (
          <span style={{ color: 'var(--muted)', fontSize: '0.65rem' }}>No shader</span>
        )}
      </div>
    </div>
  );
}

async function readFileAsText(file: File, maxBytes: number) {
  if (file.size > maxBytes) {
    throw new Error(`File too large (${Math.round(file.size / 1024)}KB). Max is ${Math.round(maxBytes / 1024)}KB.`);
  }
  return await file.text();
}

function DragHandle() {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: 0.55, lineHeight: 0.35 }}>
      <span style={{ width: 10, borderTop: '2px solid var(--muted)' }} />
      <span style={{ width: 10, borderTop: '2px solid var(--muted)' }} />
      <span style={{ width: 10, borderTop: '2px solid var(--muted)' }} />
    </span>
  );
}

type SortableWorkRowProps = {
  work: Work;
  index: number;
  manifest: Manifest;
  saving: boolean;
  setError: (msg: string | null) => void;
  updateWork: (workId: string, patch: Partial<Work>) => void;
  removeWork: (workId: string) => void;
};

function SortableWorkRow({ work: w, index, manifest, saving, setError, updateWork, removeWork }: SortableWorkRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: w.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    position: 'relative',
    zIndex: isDragging ? 2 : 0,
    opacity: isDragging ? 0.92 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          display: 'flex',
          gap: '0.45rem',
          alignItems: 'stretch',
        }}
      >
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          aria-label="Drag to reorder work"
          title="Drag to reorder"
          disabled={manifest.works.length < 2}
          style={{
            flex: '0 0 1.75rem',
            width: '1.75rem',
            minWidth: '1.75rem',
            border: '1px solid #2a2a2a',
            borderRadius: 8,
            background: manifest.works.length < 2 ? '#0a0a0a' : '#0d0d0d',
            display: 'grid',
            placeItems: 'center',
            cursor: manifest.works.length < 2 ? 'not-allowed' : 'grab',
            touchAction: 'none',
            padding: 0,
            color: 'var(--muted)',
          }}
        >
          <DragHandle />
        </button>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            border: '1px solid #222',
            borderRadius: 10,
            padding: '0.65rem 0.75rem',
            background: '#050505',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '0.65rem',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '0.45rem',
            }}
          >
            <h3 style={{ margin: 0, fontWeight: 400, fontSize: '0.88rem' }}>{`Work ${index + 1}`}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{w.id.slice(0, 8)}</span>
              <button
                type="button"
                disabled={manifest.works.length <= 1 || saving}
                onClick={() => removeWork(w.id)}
                title={manifest.works.length <= 1 ? 'At least one work is required' : 'Remove this work'}
                style={{
                  fontSize: '0.68rem',
                  padding: '0.22rem 0.45rem',
                  borderRadius: 6,
                  border: '1px solid #522',
                  background: manifest.works.length <= 1 ? '#1a1a1a' : '#1a0808',
                  color: manifest.works.length <= 1 ? '#555' : '#f88',
                  cursor: manifest.works.length <= 1 || saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Remove
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `1fr 1fr ${PREVIEW_W}px`,
              gridTemplateRows: 'auto auto',
              gap: '0.45rem 0.5rem',
              marginTop: '0.35rem',
            }}
          >
            <DropSquare
              label="Vertex (opt.)"
              accept=".glsl,.vert,.txt"
              valueLabel={w.vertexShader?.name}
              onPickFile={async (file) => {
                try {
                  const source = await readFileAsText(file, 250_000);
                  updateWork(w.id, { vertexShader: { name: file.name, source } });
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not read file');
                }
              }}
            />

            <DropSquare
              label="Fragment"
              accept=".glsl,.frag,.txt"
              valueLabel={w.shader?.name}
              onPickFile={async (file) => {
                try {
                  const source = await readFileAsText(file, 250_000);
                  updateWork(w.id, { shader: { name: file.name, source } });
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not read file');
                }
              }}
            />

            <div style={{ gridRow: '1 / 3', gridColumn: 3 }}>
              <ShaderPreview
                fragmentShader={w.shader?.source}
                vertexShader={w.vertexShader?.source}
                controlsSource={w.controls?.source}
                width={PREVIEW_W}
                height={PREVIEW_H}
              />
            </div>

            <DropSquare
              label="Controls"
              accept=".json,.txt"
              valueLabel={w.controls?.name}
              onPickFile={async (file) => {
                try {
                  const source = await readFileAsText(file, 250_000);
                  const parsed = JSON.parse(source) as unknown;
                  const validated = validateControlsSchemaJson(parsed);
                  if (!validated.ok) throw new Error(validated.error);
                  updateWork(w.id, { controls: { name: file.name, source } });
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not read file');
                }
              }}
            />

            <DropSquare
              label="Pd patch"
              accept=".pd,.txt"
              valueLabel={w.patch?.name}
              onPickFile={async (file) => {
                try {
                  const source = await readFileAsText(file, 250_000);
                  updateWork(w.id, { patch: { name: file.name, source } });
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not read file');
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SetEditor({
  setId,
  initialManifest,
}: {
  setId: string;
  initialManifest: unknown;
}) {
  const [manifest, setManifest] = useState<Manifest>(() => normalizeManifest(initialManifest));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  // Prevents @dnd-kit aria-describedby mismatch between SSR and client
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const canAddWork = useMemo(() => manifest.works.length < 50, [manifest.works.length]);

  const sortableIds = useMemo(() => manifest.works.map((w) => w.id), [manifest.works]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const save = useCallback(
    async (next: Manifest) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/sets/${encodeURIComponent(setId)}/manifest`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || `Save failed (${res.status})`);
        }
        setManifest(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [setId]
  );

  const addWork = useCallback(() => {
    if (!canAddWork) return;
    const next: Manifest = {
      ...manifest,
      works: [...manifest.works, workWithDefaultBlack(crypto.randomUUID())],
    };
    void save(next);
  }, [canAddWork, manifest, save]);

  const removeWork = useCallback(
    (workId: string) => {
      if (manifest.works.length <= 1) return;
      const next: Manifest = { ...manifest, works: manifest.works.filter((w) => w.id !== workId) };
      void save(next);
    },
    [manifest, save]
  );

  const updateWork = useCallback(
    (workId: string, patch: Partial<Work>) => {
      const next: Manifest = {
        ...manifest,
        works: manifest.works.map((w) => (w.id === workId ? { ...w, ...patch } : w)),
      };
      void save(next);
    },
    [manifest, save]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = manifest.works.map((w) => w.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next: Manifest = { ...manifest, works: arrayMove(manifest.works, oldIndex, newIndex) };
      void save(next);
    },
    [manifest, save]
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const activeWork = activeDragId ? manifest.works.find((w) => w.id === activeDragId) : null;

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 400, margin: 0 }}>Works</h2>
        <button
          type="button"
          disabled={!canAddWork || saving}
          onClick={addWork}
          style={{
            padding: '0.45rem 0.8rem',
            background: saving ? '#333' : '#0a3',
            border: 'none',
            borderRadius: 8,
            color: saving ? '#bbb' : '#000',
            cursor: saving ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
        >
          {saving ? 'Saving…' : 'Add work'}
        </button>
      </div>

      {error ? (
        <p style={{ color: '#f66', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>
      ) : (
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '0.75rem' }}>
          Compact drops per work · use the grip to reorder (animated). Files save as draft text in the DB.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginTop: '0.75rem' }}>
        {manifest.works.length === 0 ? (
          <div
            style={{
              border: '1px dashed #333',
              borderRadius: 12,
              padding: '1.25rem',
              background: '#080808',
              color: 'var(--muted)',
              fontSize: '0.88rem',
              lineHeight: 1.5,
            }}
          >
            <p style={{ margin: '0 0 0.5rem', color: 'var(--fg)' }}>No works available.</p>
            <p style={{ margin: 0 }}>
              Use <strong>Add work</strong> to create a row, then drop a fragment shader (or start from the default black
              placeholder).
            </p>
          </div>
        ) : !mounted ? (
          // Skeleton while hydrating — avoids @dnd-kit aria-describedby SSR mismatch
          <div style={{ opacity: 0.4, fontSize: '0.82rem', color: 'var(--muted)', padding: '0.5rem 0' }}>
            Loading works…
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              {manifest.works.map((w, idx) => (
                <SortableWorkRow
                  key={w.id}
                  work={w}
                  index={idx}
                  manifest={manifest}
                  saving={saving}
                  setError={setError}
                  updateWork={updateWork}
                  removeWork={removeWork}
                />
              ))}
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
              {activeWork ? (
                <div
                  style={{
                    border: '1px solid var(--accent)',
                    borderRadius: 10,
                    padding: '0.5rem 0.65rem',
                    background: 'rgba(8,8,8,0.92)',
                    boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
                    fontSize: '0.82rem',
                    color: 'var(--fg)',
                    minWidth: '10rem',
                  }}
                >
                  Reordering… <span style={{ color: 'var(--muted)' }}>{activeWork.shader?.name ?? activeWork.id.slice(0, 8)}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </section>
  );
}
