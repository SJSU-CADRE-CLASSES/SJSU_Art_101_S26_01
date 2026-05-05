import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireSupabaseEnv } from '@/lib/supabase/config';

export async function createClient() {
  const { url, anonKey: key } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options as never));
          } catch {
            // Session refresh from a Server Component: middleware will persist cookies.
          }
        },
      },
    }
  );
}
