/**
 * Supabase URL + anon key.
 * - Prefer NEXT_PUBLIC_* for local dev and when inlined at build time.
 * - On Vercel you can also set SUPABASE_URL + SUPABASE_ANON_KEY (no NEXT_PUBLIC);
 *   those are read at runtime on the server and passed to client components as props.
 */
export function getSupabaseEnv(): { url: string | undefined; anonKey: string | undefined } {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  return { url, anonKey };
}

export function requireSupabaseEnv(): { url: string; anonKey: string } {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.local.example), or SUPABASE_URL and SUPABASE_ANON_KEY on the server. After changing env on Vercel, redeploy.'
    );
  }
  return { url, anonKey };
}
