import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1 style={{ fontWeight: 400, letterSpacing: '0.05em' }}>World Building Portfolio</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
        Next.js + Supabase scaffold. Configure environment variables (see{' '}
        <code>.env.local.example</code>), run the SQL in <code>supabase/migrations</code>, then open{' '}
        <Link href="/login">login</Link> and <Link href="/studio">studio</Link>.
      </p>
      <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
        Performance URLs will live at <code>/p/[slug]</code> once sets are wired to the player.
      </p>
    </main>
  );
}
