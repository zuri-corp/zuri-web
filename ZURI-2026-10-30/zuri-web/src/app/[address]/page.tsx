import {profileCanonical} from '@/lib/discovery/profiles';
import { notFound } from 'next/navigation';
import Profile from '@/components/site/Profile';
import ContentState from '@/components/site/ContentState';
import { directory } from '@/lib/content/website';
import { validSpaceAddress } from '@/lib/navigation/routes';
import { findProfile, loadProfiles } from '@/lib/publishing/public';
export function generateStaticParams() { return directory.filter(p => p.kind === 'space' && validSpaceAddress(p.slug)).map(p => ({ address: p.slug })); }
export async function generateMetadata({ params }: {
    params: Promise<{
        address: string;
    }>;
}) { const { address } = await params; if (!validSpaceAddress(address))
    return { title: 'Page not found', robots: { index: false, follow: false } }; const { item, available } = await findProfile('space', address); return { alternates: profileCanonical(item), title: item?.name ?? (available ? 'Space not found' : 'Space unavailable'), description: item?.description, robots: { index: !!item && !item.sample && !item.previewOnly && available, follow: true } }; }
export default async function Page({ params }: {
    params: Promise<{
        address: string;
    }>;
}) { const { address } = await params; if (!validSpaceAddress(address))
    notFound(); const { item, available } = await findProfile('space', address); if (!available)
    return <main id="main" className="pamoja-page page-wrap section-pad"><ContentState available={false} label="profiles"/></main>; if (!item)
    notFound(); const related = await loadProfiles(); return <Profile item={item} related={related.items.slice(0, 6)}/>; }


