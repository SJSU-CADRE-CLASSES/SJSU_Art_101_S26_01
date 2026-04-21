export type ControlsSchemaV1 = {
  version: 1;
  controls: ControlDef[];
  midi?: MidiSchema;
};

export type ControlDef =
  | RangeControl
  | CheckboxControl
  | SelectControl;

export type BaseControl = {
  /** Unique stable id. Used by MIDI mappings and UI. */
  id: string;
  /** Human label shown in UI. */
  label: string;
  /** Which uniform this control drives in the shader (optional for preview-only / future use). */
  uniform?: string;
  /** Which work asset this belongs to (future-proofing). */
  scope?: 'shader';
};

export type RangeControl = BaseControl & {
  type: 'range';
  min: number;
  max: number;
  step?: number;
  default: number;
};

export type CheckboxControl = BaseControl & {
  type: 'checkbox';
  default: boolean;
};

export type SelectControl = BaseControl & {
  type: 'select';
  options: { label: string; value: string }[];
  default: string;
};

export type MidiSchema = {
  enabled?: boolean;
  mappings: MidiMapping[];
};

export type MidiMapping =
  | MidiCcMapping;

export type MidiCcMapping = {
  type: 'cc';
  /** Optional substring match against MIDIInput.name */
  inputNameIncludes?: string;
  /** 1-16 */
  channel?: number;
  /** 0-127 */
  cc: number;
  /** Which control id to drive */
  controlId: string;
  /** Optional scaling of 0..127 to control range */
  transform?: {
    /** Defaults to linear */
    mode?: 'linear';
    /** 0..1 default 0 */
    inMin?: number;
    /** 0..1 default 1 */
    inMax?: number;
    /** If provided, overrides control's min/max */
    outMin?: number;
    outMax?: number;
  };
};

function isObj(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function isStr(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function validateControlsSchemaJson(json: unknown): { ok: true; value: ControlsSchemaV1 } | { ok: false; error: string } {
  if (!isObj(json)) return { ok: false, error: 'Controls JSON must be an object.' };
  if (json.version !== 1) return { ok: false, error: 'Controls JSON: version must be 1.' };
  if (!Array.isArray(json.controls)) return { ok: false, error: 'Controls JSON: controls must be an array.' };

  const seen = new Set<string>();
  for (let i = 0; i < json.controls.length; i++) {
    const c = json.controls[i];
    if (!isObj(c)) return { ok: false, error: `controls[${i}] must be an object.` };
    if (!isStr(c.id)) return { ok: false, error: `controls[${i}].id must be a non-empty string.` };
    if (!isStr(c.label)) return { ok: false, error: `controls[${i}].label must be a non-empty string.` };
    if (seen.has(c.id)) return { ok: false, error: `Duplicate control id: ${c.id}` };
    seen.add(c.id);
    if (c.uniform !== undefined && typeof c.uniform !== 'string') {
      return { ok: false, error: `controls[${i}].uniform must be a string when provided.` };
    }

    if (!isStr(c.type)) return { ok: false, error: `controls[${i}].type must be a string.` };
    if (c.type === 'range') {
      if (!isNum(c.min) || !isNum(c.max) || !isNum(c.default)) {
        return { ok: false, error: `controls[${i}] range must have min/max/default numbers.` };
      }
      if (c.step !== undefined && !isNum(c.step)) return { ok: false, error: `controls[${i}].step must be a number.` };
      if (c.min >= c.max) return { ok: false, error: `controls[${i}] min must be < max.` };
    } else if (c.type === 'checkbox') {
      if (typeof c.default !== 'boolean') return { ok: false, error: `controls[${i}] checkbox default must be boolean.` };
    } else if (c.type === 'select') {
      if (!Array.isArray(c.options) || c.options.length < 1) return { ok: false, error: `controls[${i}] select must have options.` };
      for (let j = 0; j < c.options.length; j++) {
        const o = c.options[j];
        if (!isObj(o) || !isStr(o.label) || !isStr(o.value)) {
          return { ok: false, error: `controls[${i}].options[${j}] must be {label, value} strings.` };
        }
      }
      if (!isStr(c.default)) return { ok: false, error: `controls[${i}] select default must be a string.` };
    } else {
      return { ok: false, error: `controls[${i}].type must be one of: range, checkbox, select.` };
    }
  }

  if (json.midi !== undefined) {
    if (!isObj(json.midi)) return { ok: false, error: 'midi must be an object when provided.' };
    if (!Array.isArray(json.midi.mappings)) return { ok: false, error: 'midi.mappings must be an array.' };
    for (let i = 0; i < json.midi.mappings.length; i++) {
      const m = json.midi.mappings[i];
      if (!isObj(m)) return { ok: false, error: `midi.mappings[${i}] must be an object.` };
      if (m.type !== 'cc') return { ok: false, error: `midi.mappings[${i}].type must be "cc".` };
      if (!isNum(m.cc) || m.cc < 0 || m.cc > 127) return { ok: false, error: `midi.mappings[${i}].cc must be 0..127.` };
      if (!isStr(m.controlId)) return { ok: false, error: `midi.mappings[${i}].controlId must be a string.` };
      if (!seen.has(m.controlId)) return { ok: false, error: `midi mapping references unknown controlId: ${m.controlId}` };
      if (m.channel !== undefined && (!isNum(m.channel) || m.channel < 1 || m.channel > 16)) {
        return { ok: false, error: `midi.mappings[${i}].channel must be 1..16.` };
      }
      if (m.inputNameIncludes !== undefined && typeof m.inputNameIncludes !== 'string') {
        return { ok: false, error: `midi.mappings[${i}].inputNameIncludes must be a string.` };
      }
      if (m.transform !== undefined) {
        if (!isObj(m.transform)) return { ok: false, error: `midi.mappings[${i}].transform must be an object.` };
      }
    }
  }

  return { ok: true, value: json as ControlsSchemaV1 };
}

