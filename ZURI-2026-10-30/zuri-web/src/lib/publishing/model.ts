import { validSpaceAddress } from '@/lib/navigation/routes';
export const contentKinds = ['story', 'space', 'person'] as const;
export type ContentKind = typeof contentKinds[number];
export type StoryData = {
    title: string;
    category: string;
    standfirst: string;
    image: string;
    caption: string;
    byline: string;
    paragraphs: string[];
    sources?: { title: string; url: string }[];
    series?: string;
    tech_path?: string;
};
export type ProfileData = {
    name: string;
    category: string;
    location: string;
    initials: string;
    description: string;
    about: string;
    offerings: string[];
    opening_info?: string;
    public_email?: string;
    public_phone?: string;
    website?: string;
    image?: string;
    image_caption?: string;
    social_links?: { title: string; url: string }[];
};
export type ContentData = StoryData | ProfileData;
export type ContentRecord = {
    id: string;
    kind: ContentKind;
    slug: string;
    status: 'draft' | 'published' | 'archived';
    data: ContentData;
    consent_verified: boolean;
    consent_reference: string;
    revision: number;
    published_revision: number | null;
    published_at: string | null;
    updated_at: string;
};
export type PublicStory = StoryData & {
    slug: string;
    sample: boolean;
    publishedAt: string | null;
    editorialDraft?: boolean;
};
export type PublicProfile = ProfileData & {
    slug: string;
    kind: 'space' | 'person';
    sample: boolean;
    previewOnly?: boolean;
};
export const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export function contentKind(value: string): ContentKind {
    if (!(contentKinds as readonly string[]).includes(value))
        throw new Error('Unknown content type.');
    return value as ContentKind;
}
export function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Invalid content.');
    return value as Record<string, unknown>;
}
function text(input: Record<string, unknown>, key: string, max: number, required = false) {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.length > max)
        throw new Error(`Please check ${key} (maximum ${max} characters).`);
    const trimmed = value.trim();
    if (required && !trimmed)
        throw new Error(`${key} is required before publishing.`);
    return trimmed;
}
function lines(input: Record<string, unknown>, key: string, maxItems: number, maxLength: number, required = false) {
    const value = input[key] ?? [];
    if (!Array.isArray(value) || value.length > maxItems || value.some(x => typeof x !== 'string' || x.length > maxLength))
        throw new Error(`Please check ${key}.`);
    const result = (value as string[]).map(x => x.trim()).filter(Boolean);
    if (required && !result.length)
        throw new Error(`${key} is required before publishing.`);
    return result;
}
function publicLinks(input: Record<string, unknown>, key: string) {
    if (input[key] === undefined) return undefined;
    if (!Array.isArray(input[key]) || input[key].length > 10) throw new Error(`Please check ${key}.`);
    return input[key].map((entry: unknown) => {
        const link = object(entry); const title = text(link, 'title', 180, true); const url = text(link, 'url', 1500, true);
        try { const parsed = new URL(url); if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error(); }
        catch { throw new Error('Public links must use HTTPS without credentials.'); }
        return {title, url};
    });
}
export function approvedImage(image: string) {
    if (image.startsWith('/'))
        return /^\/(?:brands|photos)\/[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(image);
    try {
        const url = new URL(image);
        return url.protocol === 'https:' && url.hostname === 'images.unsplash.com' && !url.username && !url.password;
    }
    catch {
        return false;
    }
}
export function validateData(kind: ContentKind, raw: unknown, publishing = false): ContentData {
    const input = object(raw);
    if (kind === 'story') {
        const image = text(input, 'image', 1500);
        if (image && !approvedImage(image))
            throw new Error('Use an existing /brands or /photos image, or an HTTPS image from the approved Unsplash host.');
        const sources = publicLinks(input, 'sources'); const series = text(input, 'series', 100); const tech_path = text(input, 'tech_path', 300);
        if (tech_path && !/^\/tech(?:\/[a-z0-9-]+)*$/.test(tech_path)) throw new Error('Use a ZURI Tech page for the related service.');
        return { title: text(input, 'title', 160, true), category: text(input, 'category', 60, publishing), standfirst: text(input, 'standfirst', 400, publishing), image, caption: text(input, 'caption', 400, publishing && !!image), byline: text(input, 'byline', 120, publishing), paragraphs: lines(input, 'paragraphs', 60, 5000, publishing), ...(sources ? {sources} : {}), ...(series ? {series} : {}), ...(tech_path ? {tech_path} : {}) };
    }
    const public_email = text(input, 'public_email', 254);
    if (public_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(public_email))
        throw new Error('Enter a valid public email address.');
    const public_phone = text(input, 'public_phone', 40);
    if (public_phone && (!/^[+\d\s().-]+$/.test(public_phone) || public_phone.replace(/\D/g, '').length < 7))
        throw new Error('Enter a valid public phone number.');
    const website = text(input, 'website', 1500);
    if (website) {
        let url: URL;
        try {
            url = new URL(website);
        }
        catch {
            throw new Error('Enter a valid website address.');
        }
        if (url.protocol !== 'https:' || url.username || url.password)
            throw new Error('Public website links must use HTTPS without credentials.');
    }
    const image = text(input, 'image', 1500);
    if (image && !approvedImage(image))
        throw new Error('Use an approved image URL.');
    const social_links = publicLinks(input, 'social_links');
    return { name: text(input, 'name', 120, true), category: text(input, 'category', 80, publishing), location: text(input, 'location', 120, publishing), initials: text(input, 'initials', 4) || text(input, 'name', 120).split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(), description: text(input, 'description', 400, publishing), about: text(input, 'about', 6000, publishing), offerings: lines(input, 'offerings', 20, 160), opening_info: text(input, 'opening_info', 600), public_email, public_phone, website, image, image_caption: text(input, 'image_caption', 400, publishing && !!image), ...(social_links ? {social_links} : {}) };
}
export function validateDraft(kind: ContentKind, raw: unknown) {
    const input = object(raw);
    const slug = text(input, 'slug', 90, true);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
        throw new Error('Slug must use lowercase letters, numbers and single hyphens.');
    if (kind === 'space' && !validSpaceAddress(slug))
        throw new Error('This address is reserved for ZURI. Choose another Space address.');
    const data = validateData(kind, input.data);
    if (input.consent_verified !== undefined && typeof input.consent_verified !== 'boolean')
        throw new Error('Invalid consent confirmation.');
    const consent_verified = kind === 'story' ? false : input.consent_verified === true;
    const consent_reference = kind === 'story' ? '' : text(input, 'consent_reference', 1000);
    if (consent_verified && !consent_reference)
        throw new Error('Record a private consent reference before confirming consent.');
    return { slug, data, consent_verified, consent_reference };
}
export function publicationData(record: Pick<ContentRecord, 'kind' | 'data' | 'consent_verified' | 'consent_reference' | 'slug'>) {
    if (record.kind === 'space' && !validSpaceAddress(record.slug))
        throw new Error('This Space address is reserved for ZURI. Withdraw the item and choose another address.');
    if (record.kind !== 'story' && (!record.consent_verified || !record.consent_reference.trim()))
        throw new Error('Profiles require recorded subject consent before publication.');
    return validateData(record.kind, record.data, true);
}
export function publicStory(slug: string, data: unknown, publishedAt: string | null): PublicStory {
    const story = validateData('story', data, true) as StoryData;
    return { ...story, slug, sample: false, publishedAt };
}
export function publicProfile(kind: 'space' | 'person', slug: string, data: unknown): PublicProfile {
    const profile = validateData(kind, data, true) as ProfileData;
    return { ...profile, slug, kind, sample: false };
}
