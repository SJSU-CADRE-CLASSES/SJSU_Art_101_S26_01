import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createSet } from './actions';

export const dynamic = 'force-dynamic';

function isMissingSetsTable(message: string) {
  return message.includes('schema cache') || message.includes('Could not find the table');
}

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ setError?: string }>;
}) {
  const sp = await searchParams;
  const setError = sp.setError;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/studio');
  }

  const { data: sets, error: setsError } = await supabase
    .from('sets')
    .select('id, slug, title, is_published, created_at')
    .order('updated_at', { ascending: false });

  const missingTable = setsError && isMissingSetsTable(setsError.message);
  const hasSets = Boolean(sets?.length);

  return (
    <main>
      <h1 style={{ fontWeight: 400 }}>Studio</h1>
      <div style={{ color: 'var(--muted)' }}>
        Signed in as <strong>{user.email}</strong> ·{' '}
        <form action="/auth/signout" method="post" style={{ display: 'inline' }}>
          <button
            type="submit"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit',
              textDecoration: 'underline',
            }}
          >
            Sign out
          </button>
        </form>
      </div>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 400, marginBottom: '0.75rem' }}>Your sets</h2>

        {missingTable ? (
          <div style={{ maxWidth: '36rem', lineHeight: 1.6 }}>
            <p style={{ color: '#f66', fontSize: '0.95rem', marginTop: 0 }}>
              The <code style={{ color: 'var(--fg)' }}>sets</code> table does not exist yet.
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              In Supabase: <strong>SQL Editor</strong> → New query → paste the full contents of{' '}
              <code style={{ color: 'var(--fg)' }}>supabase/migrations/20260419000000_init_sets.sql</code> from this repo →
              Run. Then refresh this page — you will be able to create sets below.
            </p>
          </div>
        ) : setsError ? (
          <p style={{ color: '#f66', fontSize: '0.9rem' }}>Could not load sets ({setsError.message}).</p>
        ) : (
          <>
            {!hasSets ? (
              <p style={{ color: 'var(--muted)' }}>No sets yet — create one to get a slug and performance URL.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '1.5rem' }}>
                {sets.map((row) => (
                  <li key={row.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #222' }}>
                    <Link href={`/studio/${row.slug}`} style={{ color: 'var(--fg)' }}>
                      {row.title}
                    </Link>{' '}
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                      /{row.slug} {row.is_published ? '· live' : '· draft'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <h3 style={{ fontSize: '0.95rem', fontWeight: 400, marginBottom: '0.5rem' }}>New set</h3>
            {setError ? (
              <p style={{ color: '#f66', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{setError}</p>
            ) : null}
            <form
              action={createSet}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                maxWidth: '22rem',
                marginTop: '0.75rem',
                padding: '1rem',
                border: '1px solid #333',
                borderRadius: 8,
                background: '#0a0a0a',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                {hasSets
                  ? 'Add another set (saved as draft until you publish).'
                  : 'Create your first set (draft, not public until you publish).'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label htmlFor="title" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="My performance"
                  required
                  style={{
                    padding: '0.45rem 0.6rem',
                    background: '#111',
                    border: '1px solid #333',
                    borderRadius: 6,
                    color: 'var(--fg)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label htmlFor="slug" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  URL slug <span style={{ opacity: 0.7 }}>(letters, numbers, hyphens)</span>
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  placeholder="my-show"
                  style={{
                    padding: '0.45rem 0.6rem',
                    background: '#111',
                    border: '1px solid #333',
                    borderRadius: 6,
                    color: 'var(--fg)',
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: '0.45rem 1rem',
                  background: '#0a3',
                  border: 'none',
                  borderRadius: 6,
                  color: '#000',
                  cursor: 'pointer',
                  fontWeight: 600,
                  alignSelf: 'flex-start',
                }}
              >
                Create set
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
