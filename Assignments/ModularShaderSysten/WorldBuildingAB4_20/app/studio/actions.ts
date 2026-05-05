'use server';

import { createClient } from '@/lib/supabase/server';
import { defaultStudioManifest } from '@/lib/manifest';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function createSet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/studio');
  }

  const titleRaw = String(formData.get('title') ?? '').trim();
  const title = titleRaw || 'Untitled';
  let slug = slugify(String(formData.get('slug') ?? ''));
  if (!slug) {
    slug = slugify(title) || `set-${Date.now()}`;
  }

  const { error } = await supabase.from('sets').insert({
    user_id: user.id,
    slug,
    title,
    is_published: false,
    manifest: defaultStudioManifest(),
  });

  if (error) {
    let msg = error.message;
    if (error.message.includes('duplicate') || error.code === '23505') {
      msg = 'That slug is already taken. Pick another.';
    } else if (
      error.message.includes('schema cache') ||
      error.message.includes('Could not find the table')
    ) {
      msg = 'Database not ready: run the SQL migration in Supabase first (see README).';
    }
    const q = encodeURIComponent(msg.slice(0, 500));
    redirect(`/studio?setError=${q}`);
  }

  revalidatePath('/studio');
  redirect('/studio');
}
