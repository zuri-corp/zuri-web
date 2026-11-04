import {launchStories} from '@/lib/content/launch-stories';
import {launchProfiles} from '@/lib/content/launch-profiles';
import 'server-only';
import { connection } from 'next/server';
import { createPublicSupabaseClient } from '@/lib/supabase/public';
import { publicStory, publicProfile, type PublicStory, type PublicProfile } from './model';
type Delivery<T> = {
    items: T[];
    preview: boolean;
    available: boolean;
};
export async function loadStories(): Promise<Delivery<PublicStory>> {
    await connection();
    const preview = process.env.ZURI_CONTENT_MODE !== 'live';
    if (preview)
        return { items: launchStories, preview: true, available: true };
    try {
        const { data, error } = await createPublicSupabaseClient().from('zuri_website_content').select('kind,slug,published_data,published_at').eq('status', 'published').eq('kind', 'story').order('published_at', { ascending: false }).limit(100);
        if (error)
            throw new Error('Content query failed.');
        return { items: (data ?? []).map(row => publicStory(row.slug, row.published_data, row.published_at)), preview: false, available: true };
    }
    catch {
        return { items: [], preview: false, available: false };
    }
}
export async function loadProfiles(): Promise<Delivery<PublicProfile>> {
    await connection();
    const preview = process.env.ZURI_CONTENT_MODE !== 'live';
    if (preview)
        return { items: launchProfiles.filter(p=>!p.sample).map(p=>({...p,offerings:[...p.offerings]})), preview: true, available: true };
    try {
        const { data, error } = await createPublicSupabaseClient().from('zuri_website_content').select('kind,slug,published_data,published_at').eq('status', 'published').in('kind', ['space', 'person']).order('published_at', { ascending: false }).limit(500);
        if (error)
            throw new Error('Content query failed.');
        return { items: (data ?? []).map(row => publicProfile(row.kind, row.slug, row.published_data)), preview: false, available: true };
    }
    catch {
        return { items: [], preview: false, available: false };
    }
}
// Detail reads are exact lookups so profiles beyond the discovery page remain reachable.
export async function findStory(slug: string): Promise<{
    item: PublicStory | null;
    available: boolean;
}> {
    await connection();
    if (process.env.ZURI_CONTENT_MODE !== 'live')
        return {item:(await loadStories()).items.find(s=>s.slug===slug&&!s.sample)??null,available:true};
    try {
        const { data, error } = await createPublicSupabaseClient().from('zuri_website_content').select('kind,slug,published_data,published_at').eq('kind', 'story').eq('status', 'published').eq('slug', slug).maybeSingle();
        if (error)
            throw new Error('Content query failed.');
        return { item: data ? publicStory(data.slug, data.published_data, data.published_at) : null, available: true };
    }
    catch {
        return { item: null, available: false };
    }
}
export async function findProfile(kind: 'space' | 'person', slug: string): Promise<{
    item: PublicProfile | null;
    available: boolean;
}> {
    await connection();
    if (process.env.ZURI_CONTENT_MODE !== 'live')
        return { item: (await loadProfiles()).items.find(p => p.kind === kind && p.slug === slug) ?? null, available: true };
    try {
        const { data, error } = await createPublicSupabaseClient().from('zuri_website_content').select('kind,slug,published_data,published_at').eq('kind', kind).eq('status', 'published').eq('slug', slug).maybeSingle();
        if (error)
            throw new Error('Content query failed.');
        return { item: data ? publicProfile(kind, data.slug, data.published_data) : null, available: true };
    }
    catch {
        return { item: null, available: false };
    }
}

