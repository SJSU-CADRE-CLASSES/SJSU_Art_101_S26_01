import type { IUniform } from 'three';
import type { ControlsSchemaV1 } from '@/lib/controls-schema';
import { validateControlsSchemaJson } from '@/lib/controls-schema';

export function parseControlsSource(source: string | undefined): ControlsSchemaV1 | null {
  if (!source?.trim()) return null;
  try {
    const parsed = JSON.parse(source) as unknown;
    const v = validateControlsSchemaJson(parsed);
    return v.ok ? v.value : null;
  } catch {
    return null;
  }
}

export function buildUniformsFromSchema(schema: ControlsSchemaV1 | null): Record<string, IUniform> {
  const out: Record<string, IUniform> = {};
  if (!schema) return out;
  for (const c of schema.controls) {
    const name = c.uniform;
    if (!name) continue;
    if (c.type === 'range') {
      out[name] = { value: c.default };
    } else if (c.type === 'checkbox') {
      out[name] = { value: c.default ? 1.0 : 0.0 };
    } else if (c.type === 'select') {
      const idx = Math.max(0, c.options.findIndex((o) => o.value === c.default));
      out[name] = { value: idx };
    }
  }
  return out;
}
