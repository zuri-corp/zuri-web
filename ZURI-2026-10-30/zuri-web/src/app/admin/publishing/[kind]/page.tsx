import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase/requireAdmin';
import { contentKind } from '@/lib/publishing/model';
import Workspace from '@/components/admin/publishing/Workspace';
export const metadata = { title: 'Curated publishing' };
async function Publishing({ params }: {
    params: Promise<{
        kind: string;
    }>;
}) { await requireAdmin(); let kind; try {
    kind = contentKind((await params).kind);
}
catch {
    notFound();
} return <main id="main" className="publishing-page"><div className="page-wrap"><Link href="/admin" className="text-link blue">← Administration</Link><p className="eyebrow blue mt-8">ZURI Internal / Curated publishing</p><h1 className="headline">{kind === 'story' ? 'Select editorial' : kind === 'space' ? 'Pamoja Spaces' : 'Pamoja people & creators'}</h1><p className="intro">Draft privately. Review the public presentation. Publish deliberately.{kind !== 'story' ? ' Public profiles require recorded consent; they do not create visitor accounts or grant Member status.' : ''}</p><nav className="publishing-nav" aria-label="Publishing destinations"><Link href="/admin/publishing/story" aria-current={kind === 'story' ? 'page' : undefined}>Select stories</Link><Link href="/admin/publishing/space" aria-current={kind === 'space' ? 'page' : undefined}>Spaces</Link><Link href="/admin/publishing/person" aria-current={kind === 'person' ? 'page' : undefined}>People / creators</Link></nav><Workspace kind={kind}/></div></main>; }
export default function Page({ params }: {
    params: Promise<{
        kind: string;
    }>;
}) { return <Suspense fallback={<p role="status" className="p-12">Loading publishing workspace…</p>}><Publishing params={params}/></Suspense>; }
