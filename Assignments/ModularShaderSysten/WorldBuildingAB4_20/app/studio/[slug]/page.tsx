import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SetEditor } from './set-editor';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export default async function SetEditorPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/studio/${slug}`)}`);
  }

  const { data: set, error } = await supabase
    .from('sets')
    .select('id, slug, title, manifest, is_published')
    .eq('slug', slug)
    .maybeSingle();

  // RLS ensures drafts are only visible to owner.
  if (error || !set) {
    notFound();
  }

  return (
    <main style={{ maxWidth: '56rem' }}>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
        <Link href="/studio">Studio</Link>
        {' · '}
        <Link href={`/p/${set.slug}`}>Performance</Link>
        {!set.is_published ? (
          <>
            {' '}
            <span style={{ color: '#fa0' }}>(draft)</span>
          </>
        ) : null}
      </p>
      <h1 style={{ fontWeight: 400, marginTop: '0.5rem' }}>{set.title}</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0 }}>
        Open performance:{' '}
        <Link href={`/p/${set.slug}`} style={{ color: 'var(--accent)' }}>
          <code style={{ fontSize: '0.85rem' }}>/p/{set.slug}</code>
        </Link>
      </p>

      <div style={{ marginTop: '1.5rem' }}>
        <SetEditor setId={set.id} initialManifest={set.manifest ?? {}} />
      </div>
    </main>
  );
}
