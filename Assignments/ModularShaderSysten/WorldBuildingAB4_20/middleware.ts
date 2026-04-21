import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv } from '@/lib/supabase/config';

export async function middleware(request: NextRequest) {
  const { url, anonKey: key } = getSupabaseEnv();
  if (!url || !key) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as never)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}

/**
 * Only run session refresh on real page routes — never on `/_next/static/*` (CSS/JS chunks),
 * fonts, or public files. A too-broad matcher can break styling if middleware touches chunk responses.
 */
export const config = {
  matcher: [
    '/',
    '/login',
    '/login/:path*',
    '/studio',
    '/studio/:path*',
    '/p/:path*',
    '/auth/:path*',
  ],
};
