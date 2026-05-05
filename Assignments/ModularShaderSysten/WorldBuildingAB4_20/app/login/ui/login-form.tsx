'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type Props = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function LoginForm({ supabaseUrl, supabaseAnonKey }: Props) {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/studio';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createBrowserSupabaseClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setStatus('error');
      setMessage('Supabase is not configured. Set env vars and redeploy (see README).');
      return;
    }
    setStatus('loading');
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }
    setStatus('sent');
    setMessage('Check your email for the login link.');
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <p style={{ color: '#f66', fontSize: '0.9rem', maxWidth: '28rem', lineHeight: 1.5 }}>
        Supabase URL and anon key are missing. For local dev, add{' '}
        <code style={{ color: 'var(--fg)' }}>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
        <code style={{ color: 'var(--fg)' }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
        <code style={{ color: 'var(--fg)' }}>.env.local</code> and restart the dev server. On Vercel, add the same
        names (or <code style={{ color: 'var(--fg)' }}>SUPABASE_URL</code> /{' '}
        <code style={{ color: 'var(--fg)' }}>SUPABASE_ANON_KEY</code>) and redeploy.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '20rem' }}>
      <label htmlFor="email" style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          padding: '0.5rem 0.65rem',
          background: '#111',
          border: '1px solid #333',
          borderRadius: 6,
          color: 'var(--fg)',
        }}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        style={{
          padding: '0.5rem 1rem',
          background: '#0a3',
          border: 'none',
          borderRadius: 6,
          color: '#000',
          cursor: status === 'loading' ? 'wait' : 'pointer',
          fontWeight: 600,
        }}
      >
        {status === 'loading' ? 'Sending…' : 'Send magic link'}
      </button>
      {message ? <p style={{ fontSize: '0.85rem', color: status === 'error' ? '#f66' : 'var(--muted)' }}>{message}</p> : null}
    </form>
  );
}
