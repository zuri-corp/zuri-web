import type {MetadataRoute} from 'next';
import {connection} from 'next/server';
import {loadProfiles,loadStories} from '@/lib/publishing/public';
import {profileHref} from '@/lib/content/website';
import {siteOrigin} from '@/lib/discovery/profiles';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 await connection();const origin=siteOrigin();if(!origin)return [];
 const paths=['/pricing','/','/about','/tech','/tech/services','/tech/marketplace','/tech/products','/tech/invites','/select','/pamoja'];
 const entries:MetadataRoute.Sitemap=paths.map(path=>({url:origin+path}));
 if(process.env.ZURI_CONTENT_MODE!=='live')return entries;
 const[profiles,stories]=await Promise.all([loadProfiles(),loadStories()]);
 return [...entries,...profiles.items.filter(p=>!p.sample).map(p=>({url:origin+profileHref(p)})),...stories.items.filter(s=>!s.sample).map(s=>({url:origin+'/select/'+s.slug}))];
}

