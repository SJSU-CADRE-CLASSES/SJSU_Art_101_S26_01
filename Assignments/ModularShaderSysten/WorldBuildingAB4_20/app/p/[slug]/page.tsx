import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PerformancePlayer } from './performance-player';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export default async function PerformancePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: set, error } = await supabase
    .from('sets')
    .select('id, title, slug, manifest, is_published')
    .eq('slug', slug)
    .maybeSingle();

  // RLS: published rows are readable by anyone; drafts only by owner. No row => 404.
  if (error || !set) {
    notFound();
  }

  return (
    <main style={{ margin: 0, padding: 0, maxWidth: 'none', minHeight: '100vh' }}>
      <PerformancePlayer
        title={set.title}
        slug={set.slug}
        manifest={set.manifest}
        isDraft={!set.is_published}
      />
    </main>
  );
}
