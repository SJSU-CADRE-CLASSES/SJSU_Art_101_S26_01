import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type WorkAsset = { name: string; source: string };
type Work = { id: string; shader?: WorkAsset; vertexShader?: WorkAsset; patch?: WorkAsset; controls?: WorkAsset };
type Manifest = { version: 1; works: Work[] };

function isManifest(value: unknown): value is Manifest {
  if (!value || typeof value !== 'object') return false;
  const v = value as { version?: unknown; works?: unknown };
  if (v.version !== 1) return false;
  if (!Array.isArray(v.works)) return false;
  return true;
}

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isManifest(body)) {
    return NextResponse.json({ error: 'Invalid manifest shape' }, { status: 400 });
  }

  // RLS enforces owner-only update; this update will fail if user does not own the set.
  const { error } = await supabase
    .from('sets')
    .update({ manifest: body })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
