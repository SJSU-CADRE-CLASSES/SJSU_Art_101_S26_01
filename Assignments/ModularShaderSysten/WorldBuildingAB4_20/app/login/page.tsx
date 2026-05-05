import Link from 'next/link';
import { Suspense } from 'react';
import { getSupabaseEnv } from '@/lib/supabase/config';
import { LoginForm } from './ui/login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const authError = params.error === 'auth';
  const { url, anonKey } = getSupabaseEnv();

  return (
    <main>
      <h1 style={{ fontWeight: 400 }}>Sign in</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Magic link via Supabase (enable Email in Auth → Providers). <Link href="/">Home</Link>
      </p>
      {authError ? (
        <p style={{ color: '#f66', marginBottom: '1rem', fontSize: '0.9rem' }}>Could not confirm login. Try again.</p>
      ) : null}
      <Suspense fallback={<p style={{ color: 'var(--muted)' }}>Loading…</p>}>
        <LoginForm supabaseUrl={url ?? ''} supabaseAnonKey={anonKey ?? ''} />
      </Suspense>
    </main>
  );
}
