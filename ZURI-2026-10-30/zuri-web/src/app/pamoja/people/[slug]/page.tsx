import {profileCanonical} from '@/lib/discovery/profiles';
import {notFound} from 'next/navigation';
import Profile from '@/components/site/Profile';
import ContentState from '@/components/site/ContentState';
import {directory} from '@/lib/content/website';
import {findProfile,loadProfiles} from '@/lib/publishing/public';
export function generateStaticParams(){return directory.filter(d=>d.kind==='person').map(d=>({slug:d.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const {item,available}=await findProfile('person',slug);return {alternates:profileCanonical(item),robots:{index:!!item&&!item.sample&&!item.previewOnly&&available,follow:true},title:item?`${item.name}${item.sample?' — Example profile':''}`:available?'Profile not found':'Profiles unavailable',description:item?.description};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const {item,available}=await findProfile('person',slug);if(!available)return <main id="main" className="pamoja-page page-wrap section-pad"><ContentState available={false} label="profiles"/></main>;if(!item)notFound();const related=await loadProfiles();return <Profile item={item} related={related.items.slice(0,6)}/>;}


