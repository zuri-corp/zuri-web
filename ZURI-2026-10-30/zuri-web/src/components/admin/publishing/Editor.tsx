"use client";
import { useEffect, useState, type FormEvent } from 'react';
import type { ContentRecord, ContentKind, ContentData, StoryData, ProfileData } from '@/lib/publishing/model';
import ContentPreview from './ContentPreview';
const storyDefault: StoryData = { title: '', category: '', standfirst: '', image: '', caption: '', byline: '', paragraphs: [] };
const profileDefault: ProfileData = { name: '', category: '', location: '', initials: '', description: '', about: '', offerings: [] };
export default function Editor({ kind, initial, onSaved, onClose }: {
    kind: ContentKind;
    initial: ContentRecord | null;
    onSaved: (record: ContentRecord) => void;
    onClose: () => void;
}) {
    const [record, setRecord] = useState(initial);
    const [slug, setSlug] = useState(initial?.slug ?? '');
    const [data, setData] = useState<ContentData>(initial?.data ?? (kind === 'story' ? storyDefault : profileDefault));
    const [consent, setConsent] = useState(initial?.consent_verified ?? false);
    const [reference, setReference] = useState(initial?.consent_reference ?? '');
    const [paragraphText, setParagraphText] = useState(kind === 'story' ? ((initial?.data as StoryData | undefined)?.paragraphs ?? []).join('\n\n') : '');
    const [offeringsText, setOfferingsText] = useState(kind !== 'story' ? ((initial?.data as ProfileData | undefined)?.offerings ?? []).join('\n') : '');
    const [view, setView] = useState<'edit' | 'preview'>('edit');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const dirty = !record || slug !== record.slug || JSON.stringify(data) !== JSON.stringify(record.data) || consent !== record.consent_verified || reference !== record.consent_reference;
    useEffect(() => {
        function preventLoss(e: BeforeUnloadEvent) {
            if (dirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        }
        window.addEventListener('beforeunload', preventLoss);
        return () => window.removeEventListener('beforeunload', preventLoss);
    }, [dirty]);
    function update(key: string, value: unknown) { setData(previous => ({ ...previous, [key]: value })); setNotice(''); }
    async function mutate(action: string) {
        if (busy)
            return;
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const res = await fetch(`/api/admin/publishing/${kind}${record ? '/' + record.id : ''}`, { method: record ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, revision: record?.revision, slug, data, consent_verified: consent, consent_reference: reference }) });
            const result = await res.json();
            if (!res.ok)
                throw new Error(result.error || 'Unable to save content.');
            const next = result.item as ContentRecord;
            setRecord(next);
            setData(next.data);
            setSlug(next.slug);
            setConsent(next.consent_verified);
            setReference(next.consent_reference);
            setParagraphText(kind === 'story' ? (next.data as StoryData).paragraphs.join('\n\n') : '');
            setOfferingsText(kind !== 'story' ? (next.data as ProfileData).offerings.join('\n') : '');
            onSaved(next);
            setNotice(action === 'publish' ? (result.publicDeliveryEnabled ? 'Published. The reviewed snapshot is now public.' : 'Publication saved. The public website is still in preview mode.') : action === 'unpublish' ? 'Withdrawn from the public website.' : action === 'archive' ? 'Archived. You can restore this item to draft.' : action === 'restore' ? 'Restored as a private draft.' : 'Draft saved. Public content changes only when you publish.');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to save content.');
        }
        finally {
            setBusy(false);
        }
    }
    function save(e: FormEvent<HTMLFormElement>) { e.preventDefault(); void mutate('save'); }
    function field(key: string, label: string, max: number, area = false) { const value = String((data as unknown as Record<string, unknown>)[key] ?? ''); return <label key={key}>{label}{area ? <textarea rows={key === 'about' ? 7 : 3} maxLength={max} value={value} onChange={e => update(key, e.target.value)} className="input-style"/> : <input maxLength={max} value={value} onChange={e => update(key, e.target.value)} className="input-style"/>}</label>; }
function linksField(key:'sources'|'social_links',label:string){const links=(data as unknown as Record<string,unknown>)[key] as {title:string;url:string}[]|undefined;return <label>{label}<textarea rows={4} className="input-style" defaultValue={(links??[]).map(l=>`${l.title} | ${l.url}`).join('\n')} onChange={e=>update(key,e.target.value.split('\n').filter(s=>s.trim()).map(line=>{const[title,...url]=line.split('|');return{title:title.trim(),url:url.join('|').trim()}}))}/><span className="muted text-sm">One link per line: label | https://address</span></label>}
    function close() {
        if (dirty && !window.confirm('Discard your unsaved edits?'))
            return;
        onClose();
    }
    return <section className="publishing-editor" aria-label="Content editor"><div className="editor-top"><div><p className="eyebrow">{record ? `${record.status} / Revision ${record.revision}` : 'New private draft'}</p><h2>{kind === 'story' ? 'Select story' : kind === 'space' ? 'Pamoja Space' : 'Pamoja person / creator'}</h2></div><button type="button" onClick={close} disabled={busy} className="text-link">Close editor ×</button></div><div className="filter-tabs mb-6"><button type="button" aria-pressed={view === 'edit'} onClick={() => setView('edit')}>Edit</button><button type="button" aria-pressed={view === 'preview'} onClick={() => setView('preview')}>Review preview</button></div>{view === 'edit' ? <form onSubmit={save} className="publishing-form"><fieldset disabled={busy || record?.status === 'archived'}><label>URL slug<input required maxLength={90} pattern="[a-z0-9]+(-[a-z0-9]+)*" className="input-style" value={slug} onChange={e => setSlug(e.target.value)} placeholder="a-clear-public-url"/></label>{kind === 'story' ? <>{field('title', 'Story title', 160)}{field('category', 'Category', 60)}{field('standfirst', 'Short introduction', 400, true)}{field('byline', 'Public author / contributor credit', 120)}{field('image', 'Image URL (optional; existing /brands asset or Unsplash)', 1500)}{field('caption', 'Image caption and credit', 400)}{field('series', 'Series label (optional)', 100)}{field('tech_path', 'Related Tech page (optional; /tech/...)', 300)}{linksField('sources','Sources and further reading')}<label>Article text (blank lines between paragraphs; start section headings with ## )<textarea rows={12} maxLength={300000} className="input-style" value={paragraphText} onChange={e => { setParagraphText(e.target.value); update('paragraphs', e.target.value.split(/\n\s*\n/).filter(p => p.trim())); }}/></label></> : <>{field('name', 'Public name', 120)}<div className="form-grid">{field('category', 'Category', 80)}{field('location', 'Public location (city / area)', 120)}</div>{field('initials', 'Initials (optional)', 4)}{field('description', 'Short introduction', 400, true)}{field('about', 'About', 6000, true)}{kind === 'space' && field('opening_info', 'Opening information (public; optional)', 600, true)}<div className="form-grid">{field('public_email', 'Public email (optional)', 254)}{field('public_phone', 'Public phone (optional)', 40)}</div>{field('website', 'Public website (HTTPS; optional)', 1500)}{linksField('social_links','Public social links (optional)')}{field('image', 'Profile image URL (approved host or /brands; optional)', 1500)}{field('image_caption', 'Image caption and credit', 400)}<label>Offerings (one per line)<textarea rows={5} className="input-style" maxLength={3400} value={offeringsText} onChange={e => { setOfferingsText(e.target.value); update('offerings', e.target.value.split('\n').filter(s => s.trim())); }}/></label><div className="consent-panel"><label className="consent-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/>The subject or their authorized representative has consented to this public profile, including any contact details and imagery.</label><label>Private consent reference<textarea rows={3} maxLength={1000} className="input-style" value={reference} onChange={e => setReference(e.target.value)} placeholder="Record who authorized the profile and where permission is documented. Avoid unnecessary personal information."/></label><p>Consent references remain internal. Unchecking confirmed consent withdraws the profile when saved.</p></div></>}<button className="button button-blue" disabled={busy} type="submit">{busy ? 'Saving…' : record ? 'Save draft changes' : 'Create private draft'}</button></fieldset></form> : <><ContentPreview kind={kind} data={data}/>{dirty && <p className="sample-notice mt-6">These changes are unsaved. Save your draft before publishing.</p>}{record && record.status !== 'archived' && <button type="button" className="button button-blue mt-6" disabled={busy || dirty} onClick={() => mutate('publish')}>{busy ? 'Working…' : record.status === 'published' ? 'Publish reviewed changes' : 'Publish reviewed content'}</button>}</>}{record && <div className="editor-lifecycle">{record.status === 'published' && <><p>Live revision {record.published_revision}. {record.revision !== (record.published_revision ?? 0) ? 'Draft edits have not been published.' : ''}</p><button type="button" disabled={busy || dirty} onClick={() => mutate('unpublish')}>Withdraw from website</button></>}{record.status === 'archived' ? <button type="button" disabled={busy} onClick={() => mutate('restore')}>Restore to private draft</button> : <button type="button" disabled={busy || dirty} onClick={() => mutate('archive')}>Archive item</button>}</div>}{error && <p role="alert" className="text-red-700 mt-6">{error} Your unsaved edits remain here.</p>}{notice && <p role="status" className="text-blue-800 mt-6">{notice}</p>}</section>;
}

