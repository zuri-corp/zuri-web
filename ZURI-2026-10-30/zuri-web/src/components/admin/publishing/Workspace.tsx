"use client";
import { useEffect, useState, useCallback } from 'react';
import type { ContentKind, ContentRecord, StoryData, ProfileData } from '@/lib/publishing/model';
import Editor from './Editor';
export default function Workspace({ kind }: {
    kind: ContentKind;
}) {
    const [items, setItems] = useState<ContentRecord[]>([]);
    const [selected, setSelected] = useState<ContentRecord | null>(null);
    const [editing, setEditing] = useState(false);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const load = useCallback(async (signal?: AbortSignal) => { setLoading(true); try {
        const res = await fetch(`/api/admin/publishing/${kind}?page=${page}`, { cache: 'no-store', signal });
        const result = await res.json();
        if (!res.ok)
            throw new Error(result.error || 'Unable to load content.');
        setItems(result.items);
        setPages(result.pages);
        setTotal(result.total);
        setError('');
    }
    catch (e) {
        if (!signal?.aborted)
            setError(e instanceof Error ? e.message : 'Unable to load content.');
    }
    finally {
        if (!signal?.aborted)
            setLoading(false);
    } }, [kind, page]);
    useEffect(() => {
        const controller = new AbortController();
        // The effect owns an external fetch and updates state after its response.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load(controller.signal);
        return () => controller.abort();
    }, [load]);
    function open(item: ContentRecord | null) { setSelected(item); setEditing(true); }
    const filtered = items.filter(i => (filter === 'all' || i.status === filter) && [i.slug, kind === 'story' ? (i.data as StoryData).title : (i.data as ProfileData).name].join(' ').toLowerCase().includes(search.toLowerCase().trim()));
    return <div>{editing ? <Editor key={selected?.id ?? 'new'} kind={kind} initial={selected} onClose={() => { setEditing(false); void load(); }} onSaved={item => { setSelected(item); setItems(previous => [item, ...previous.filter(i => i.id !== item.id)]); }}/> : <><div className="publishing-toolbar"><button type="button" className="button button-blue" onClick={() => open(null)}>Create {kind === 'story' ? 'story' : kind === 'space' ? 'Space' : 'person profile'} +</button><button type="button" className="text-link" onClick={() => load()}>Refresh list</button></div><div className="publishing-filters"><input type="search" aria-label="Search content on this page" placeholder="Search title or slug" className="input-style" value={search} onChange={e => setSearch(e.target.value)}/><select aria-label="Content status" className="input-style" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>{loading ? <p role="status" className="mt-8">Loading content…</p> : error ? <div className="empty-state"><p role="alert">{error}</p><button type="button" className="button button-dark mt-4" onClick={() => load()}>Retry</button></div> : <><p role="status" className="muted text-sm mt-6">{filtered.length} shown on page {page} of {pages}. {total} total items. Filters apply to this page.</p><div className="publishing-list">{filtered.length ? filtered.map(item => <button type="button" key={item.id} onClick={() => open(item)}><div><p className="eyebrow">{item.status} {item.status === 'published' && item.revision !== item.published_revision ? '· Unpublished edits' : ''}</p><h2>{kind === 'story' ? (item.data as StoryData).title : (item.data as ProfileData).name}</h2><p>/{item.slug} · Revision {item.revision}</p></div><span aria-hidden="true">Edit ↗</span></button>) : <div className="empty-state"><h2>{items.length ? 'No matching content.' : 'Nothing here yet.'}</h2><p>Create a private draft to begin. Nothing is published automatically.</p></div>}</div><nav className="publishing-pagination" aria-label="Content pages"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous page</button><button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next page →</button></nav></>}</>}</div>;
}
