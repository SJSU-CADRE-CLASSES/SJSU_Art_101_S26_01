import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser client — pass URL and anon key from a Server Component so values
 * work on Vercel even when NEXT_PUBLIC_* was not present at build time.
 */
export function createBrowserSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createBrowserClient(url, anonKey);
}
