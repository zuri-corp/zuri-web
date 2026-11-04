'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { worlds, home, parseRoute, routeHash, initialData, readData, runFocus, today, type World, type Route, type LocalData } from '@/lib/experience/model';
import { spaces, societies, events, pings, trips, users, content, userMap } from '@/lib/experience/seed';

const STORAGE = 'zuri-experience-v2';
const channels = [{ id: 'nile', name: 'Nile culture', description: 'Photography, sound and stories along the river.', spaceId: 's2' }, { id: 'makers', name: 'Made in Jinja', description: 'Ideas, works in progress and things worth sharing.', spaceId: 's1' }];
const intros: Record<string, string> = { Home: 'A sense of belonging starts here.', Spaces: 'Places with people, purpose and possibility.', Societies: 'A shared interest is a good beginning.', Find: 'Something good, somewhere close.', Planner: 'Less scattered. More intentional.', Events: 'Good reasons to get out there.', Trips: 'A change of scene, a new perspective.', Pings: 'Small invitations. Real-world possibilities.', Feed: 'A window into your world.', Create: 'A thought, a photograph, a little story.', Channels: 'Follow the things that draw you in.', Chats: 'Every conversation, together here.', Moments: 'Your photographs and videos. Your perspective.', Discover: 'See the world through someone else’s eyes.', Chapters: 'Give your moments a place to belong.', Profile: 'One identity, everywhere in ZURI.' };
type ViewState = { scroll: number; query: string; filter: string; focus?: string };
const toggle = (list: string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];

function Empty({ title, children }: { title: string; children: ReactNode }) { return <div className="zx-empty"><span aria-hidden="true">◌</span><h3>{title}</h3><p>{children}</p></div>; }
function Picture({ src, alt = '', className = '' }: { src?: string; alt?: string; className?: string }) { const [failed, setFailed] = useState(false); return src && !failed ? <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} /> : <div role="img" aria-label={alt || 'Image unavailable'} className={`zx-picture-fallback ${className}`}>Z</div>; }

export default function Experience() {
  const [route, setRoute] = useState<Route>(home);
  const [data, setData] = useState<LocalData>(initialData);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [viola, setViola] = useState(false);
  const [widgets, setWidgets] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'assistant'; content: string}[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [photoError, setPhotoError] = useState('');
  const main = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const views = useRef<Record<string, ViewState>>({});
  const lastTabs = useRef<Partial<Record<World, string>>>({});
  const restore = useRef<ViewState | null>(null);
  const storageSafe = useRef(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const current = useRef({ route, query, filter });
  current.current = { route, query, filter };
  const theme = worlds[route.world];
  const draftKey = route.kind === 'chat' ? `chat-${route.id}` : `${route.world}-${route.tab}`;
  const draft = drafts[draftKey] || '';
  const setDraft = (value: string) => setDrafts(prev => ({ ...prev, [draftKey]: value }));
  const update = (fn: (previous: LocalData) => LocalData) => setData(fn);
  const notify = (message: string) => setNotice(message);

  useEffect(() => {
    try {
      let next = readData(localStorage.getItem(STORAGE));
      if (next.automations.some(a => a.id === 'daily' && a.enabled && a.lastRun !== today())) next = runFocus(next);
      setData(next);
      const savedViews = sessionStorage.getItem('zuri-v2-views');
      if (savedViews) views.current = JSON.parse(savedViews);
    } catch { storageSafe.current = false; setStorageError('Saved data could not be read. Changes will stay in memory until you export or reset this workspace.'); }
    const initial = parseRoute(window.location.hash);
    const saved = views.current[routeHash(initial)];
    if (saved) { setQuery(saved.query || ''); setFilter(saved.filter || 'All'); restore.current = saved; }
    setRoute(initial); setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !storageSafe.current) return;
    try { localStorage.setItem(STORAGE, JSON.stringify(data)); }
    catch { setStorageError('This device could not save your latest changes. Export your workspace before leaving.'); }
  }, [data, ready]);
  useEffect(() => {
    const save = () => {
      const {route: r, query: q, filter: f} = current.current;
      views.current[routeHash(r)] = { scroll: main.current?.scrollTop || 0, query: q, filter: f, focus: (document.activeElement as HTMLElement)?.dataset.focus };
      try { sessionStorage.setItem('zuri-v2-views', JSON.stringify(views.current)); } catch { /* Navigation still works in memory. */ }
    };
    const pop = () => { save(); const next = parseRoute(window.location.hash); const saved = window.history.state?.zuriView || views.current[routeHash(next)] || {scroll: 0, query: '', filter: 'All'}; restore.current = saved; setQuery(saved.query); setFilter(saved.filter); setRoute(next); };
    window.addEventListener('popstate', pop); window.addEventListener('hashchange', pop); window.addEventListener('pagehide', save);
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener('hashchange', pop); window.removeEventListener('pagehide', save); };
  }, []);
  useLayoutEffect(() => {
    if (!ready) return;
    const saved = restore.current;
    main.current?.scrollTo({ top: saved?.scroll || 0, behavior: 'instant' });
    const focus = saved?.focus ? Array.from(main.current?.querySelectorAll<HTMLElement>('[data-focus]') || []).find(el => el.dataset.focus === saved.focus) : null;
    (focus || heading.current)?.focus({ preventScroll: true });
    restore.current = null;
  }, [route, ready]);
  useEffect(() => {
    if (!ready) return;
    const rememberEntry = () => window.history.replaceState({ ...window.history.state, zuriView: {scroll: main.current?.scrollTop || 0, query, filter, focus: (document.activeElement as HTMLElement)?.dataset.focus} }, '');
    rememberEntry();
    const element = main.current;
    element?.addEventListener('scroll', rememberEntry, {passive:true});
    return () => element?.removeEventListener('scroll', rememberEntry);
  }, [ready, query, filter, route]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    if (!viola) return;
    const controller = new AbortController();
    setAiError('');
    fetch('/api/viola', {signal: controller.signal}).then(r => r.json()).then(d => setAiEnabled(d.enabled === true)).catch(() => { if (!controller.signal.aborted) { setAiEnabled(false); setAiError('Could not check Viola’s connection. Close and reopen to retry.'); } });
    dialog.current?.showModal();
    return () => controller.abort();
  }, [viola]);

  function go(next: Route, replace = false) {
    views.current[routeHash(route)] = { scroll: main.current?.scrollTop || 0, query, filter, focus: (document.activeElement as HTMLElement)?.dataset.focus };
    window.history.replaceState({...window.history.state, zuriView:views.current[routeHash(route)]}, '');
    lastTabs.current[route.world] = route.tab;
    const saved = views.current[routeHash(next)] || { scroll: 0, query: '', filter: 'All' };
    restore.current = saved;
    window.history[replace ? 'replaceState' : 'pushState']({ ...window.history.state, zuriExperience: true, zuriView:saved }, '', routeHash(next));
    setQuery(saved.query); setFilter(saved.filter); setRoute(next);
  }
  function launch(world: World) { go({ world, tab: lastTabs.current[world] || worlds[world].tabs[0] || '' }); }
  function open(kind: string, id: string) {
    const world: World = ['space', 'society'].includes(kind) ? 'aura' : ['event', 'ping', 'trip'].includes(kind) ? 'motion' : ['chat', 'channel'].includes(kind) ? 'rizz' : 'lore';
    const tab = ({space: 'Spaces', society: 'Societies', event: 'Events', ping: 'Pings', trip: 'Trips', chat: 'Chats', channel: 'Channels', person: 'Profile', moment: 'Moments', chapter: 'Chapters'} as Record<string, string>)[kind];
    go({world, tab, kind, id});
  }
  function back() { if (window.history.state?.zuriExperience) window.history.back(); else go({ world: route.world, tab: route.tab }, true); }
  function save(id: string) { update(d => ({ ...d, saved: toggle(d.saved, id) })); }
  function addPlan(id: string) { update(d => ({...d, plan: toggle(d.plan, id)})); }
  function addTask(text: string) { if (!text.trim()) return; update(d => ({...d, tasks: [...d.tasks, { id: crypto.randomUUID(), text: text.trim(), date: today(), done: false }]})); }
  const matching = (name: string) => name.toLowerCase().includes(query.toLowerCase());
  const records = [ ...spaces.map(s => ({id: s.id, kind: 'space', title: s.name, sub: s.location, image: s.image})), ...societies.map(s => ({id: s.id, kind: 'society', title: s.name, sub: 'Society', image: s.image})), ...events.map(s => ({id: s.id, kind: 'event', title: s.name, sub: `${s.date} · ${s.time}`, image: s.image})), ...pings.map(s => ({id:s.id, kind:'ping', title:s.title, sub:'An invitation to join in', image:s.image})), ...trips.map(s => ({id:s.id, kind:'trip', title:s.departure + ' → ' + s.destination, sub:s.time + ' · ' + s.type + ' ride', image:events.find(e => e.id === s.eventId)?.image || ''})) ];
  function card(record: typeof records[number]) { return <article className="zx-card" key={`${record.kind}-${record.id}`}><button data-focus={`${record.kind}-${record.id}`} className="zx-card-open" onClick={() => open(record.kind, record.id)}><Picture src={record.image}/><div className="zx-card-body"><small>{record.sub}</small><h3>{record.title}</h3><span>Explore {record.kind} <b aria-hidden="true">↗</b></span></div></button><button className="zx-save" aria-label={`${data.saved.includes(record.id) ? 'Unsave' : 'Save'} ${record.title}`} aria-pressed={data.saved.includes(record.id)} onClick={() => save(record.id)}>{data.saved.includes(record.id) ? '♥' : '♡'}</button></article>; }
  function grid(items: typeof records) { return items.length ? <div className="zx-grid">{items.map(card)}</div> : <Empty title="Nothing here yet">Try a different search, or explore another destination.</Empty>; }
  function search() { return <label className="zx-search"><span aria-hidden="true">⌕</span><input aria-label={`Search ${route.tab}`} placeholder={`Search ${route.tab.toLowerCase()}…`} value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}>×</button>}</label>; }
  function tasks() { return <><form className="zx-inline" onSubmit={e => { e.preventDefault(); addTask(draft); setDraft(''); }}><input aria-label="New focus task" value={draft} maxLength={180} onChange={e => setDraft(e.target.value)} placeholder="Make space for one thing…" required/><button className="zx-primary" type="submit">Add</button></form>{data.tasks.length ? <ul className="zx-tasks">{data.tasks.map(t => <li key={t.id}><label><input type="checkbox" checked={t.done} onChange={() => update(d => ({...d, tasks: d.tasks.map(x => x.id === t.id ? {...x, done: !x.done} : x)}))}/><span className={t.done ? 'zx-done' : ''}>{t.text}<small>{t.date}</small></span></label><button aria-label={`Remove ${t.text}`} onClick={() => update(d => ({...d, tasks: d.tasks.filter(x => x.id !== t.id)}))}>×</button></li>)}</ul> : <p className="zx-muted">A clear page. Add something you want to make time for.</p>}</>; }
  function automations() { return <>{data.automations.map(a => <div className="zx-automation" key={a.id}><div><h3>{a.name}</h3><p>Once each day when you open ZURI. Runs on this device.</p><small>{a.lastRun ? `Last run: ${a.lastRun}` : 'No runs yet'}</small></div><button role="switch" aria-checked={a.enabled} aria-label={a.name} className={a.enabled ? 'zx-switch on' : 'zx-switch'} onClick={() => update(d => ({...d, automations: d.automations.map(x => x.id === a.id ? {...x, enabled: !x.enabled} : x)}))}><span/></button><button className="zx-text" onClick={() => { update(d => runFocus(d)); notify('Daily focus added to Planner. Repeated runs do not duplicate it.'); }}>Run now ↗</button></div>)}</>; }
  function profile() { return <div className="zx-profile zx-panel"><span className="zx-avatar large">{data.name.slice(0,1)}</span><small>YOUR SHARED ZURI IDENTITY</small><h2>{data.name}</h2><p>{data.bio}</p><form onSubmit={e => {e.preventDefault(); const f = new FormData(e.currentTarget); update(d => ({...d, name: String(f.get('name')).trim(), bio: String(f.get('bio')).trim()})); notify('Your identity was updated across ZURI on this device.');}}><label>Display name<input name="name" defaultValue={data.name} required maxLength={60} pattern=".*\S.*"/></label><label>A little about you<textarea name="bio" defaultValue={data.bio} maxLength={300}/></label><button className="zx-primary">Save identity</button></form><p className="zx-muted">Device workspace · not signed in. Existing Supabase sign-in remains available on the ZURI website; this preview does not link to a real account.</p><button className="zx-text" onClick={exportData}>Export my workspace ↓</button></div>; }
  function exportData() { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = 'zuri-workspace.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  const legacyAIRequest=useRef({json:'',id:''});
  async function submitAI() {
    if (!aiInput.trim() || aiBusy || !aiEnabled) return;
    const next = [...aiMessages, {role:'user' as const, content:aiInput.trim()}].slice(-12);const json=JSON.stringify(next);if(legacyAIRequest.current.json!==json)legacyAIRequest.current={json,id:crypto.randomUUID()};
    setAiMessages(next); setAiInput(''); setAiBusy(true); setAiError('');
    try { const response = await fetch('/api/viola', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({messages:next,consent:true,requestId:legacyAIRequest.current.id}), signal:AbortSignal.timeout(50000)}); const result = await response.json(); if (!response.ok || !result.reply) throw new Error(result.error || 'Viola could not finish. Please retry.'); setAiMessages([...next, {role:'assistant', content:result.reply}]); }
    catch (error) { setAiError(error instanceof Error ? error.message : 'Connection failed. Please retry.'); setAiInput(next.at(-1)?.content || ''); setAiMessages(next.slice(0,-1)); } finally {setAiBusy(false);}
  }
  function detail() {
    const {kind, id} = route;
    if (kind === 'chat') {
      const person = users.find(u => u.id === id);
      if (!person) return <Empty title="Conversation not found">Choose someone from Chats.</Empty>;
      return <div className="zx-panel zx-conversation"><div className="zx-person"><Picture src={person.avatar}/><div><h2>{person.name}</h2><p>Local draft conversation · no delivery service connected</p></div></div><div className="zx-messages" aria-live="polite">{data.messages.filter(m => m.personId === id).map(m => <div className="zx-message" key={m.id}><p>{m.text}</p><small>Stored on this device · {new Date(m.created).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small></div>)}</div>{!data.messages.some(m => m.personId === id) && <Empty title="Start with a hello">Messages you write here are saved locally. They are not sent to {person.name.split(' ')[0]}.</Empty>}<form className="zx-inline" onSubmit={e => {e.preventDefault(); if (!draft.trim()) return; update(d => ({...d, messages:[...d.messages,{id:crypto.randomUUID(),text:draft.trim(),personId:id!,created:new Date().toISOString()}]}));setDraft('');}}><input aria-label="Message draft" placeholder="Write a local message…" maxLength={2000} value={draft} onChange={e => setDraft(e.target.value)} required/><button className="zx-primary">Save message</button></form></div>;
    }
    if (kind === 'person') { const person = users.find(u => u.id === id); if (!person) return <Empty title="Person not found">Return to Discover to find someone.</Empty>; return <div className="zx-panel zx-profile"><Picture src={person.avatar} className="zx-portrait"/><small>@{person.handle}</small><h2>{person.name}</h2><p>{person.bio}</p><button className="zx-primary" onClick={() => open('chat', person.id)}>Open in Rizz Chats ↗</button><h3>Moments</h3>{grid(content.filter(c => c.creatorId === id && c.mediaType === 'photo').map(c => ({id:c.id, kind:'moment',title:c.caption,sub:person.name,image:c.media || ''})))}</div>; }
    if (kind === 'moment') { const post = data.posts.find(p => p.id === id); const item = content.find(p => p.id === id); if (!post && !item) return <Empty title="Moment not found">It may have been removed from this device.</Empty>; return <article className="zx-panel"><Picture className="zx-detail-photo" src={post?.image || item?.media}/><h2>{post?.text || item?.caption}</h2><button className="zx-text" onClick={() => post ? go({world:'lore',tab:'Profile'}) : open('person', item?.creatorId || 'u1')}>{post ? data.name : userMap[item!.creatorId]?.name} ↗</button></article>; }
    if (kind === 'chapter') { const chapter = data.chapters.find(p => p.id === id); if (!chapter) return <Empty title="Chapter not found">Return to Chapters.</Empty>; const moments = data.posts.filter(p => p.image && chapter.momentIds.includes(p.id)); return <div><div className="zx-panel"><small>YOUR PHOTO COLLECTION · DEVICE WORKSPACE</small><h2>{chapter.title}</h2><p>Select the moments that belong in this chapter.</p>{data.posts.filter(p => p.image).map(p => <label className="zx-chapter-choice" key={p.id}><input type="checkbox" checked={chapter.momentIds.includes(p.id)} onChange={() => update(d => ({...d,chapters:d.chapters.map(c => c.id === id ? {...c,momentIds:toggle(c.momentIds,p.id)} : c)}))}/>{p.text}</label>)}<button className="zx-text" onClick={() => {update(d => ({...d,chapters:d.chapters.filter(c => c.id !== id)}));go({world:'lore',tab:'Chapters'});}}>Delete collection (keep moments)</button></div>{grid(moments.map(p => ({id:p.id,kind:'moment',title:p.text,sub:'Your moment',image:p.image || ''})))}</div>; }
    if (kind === 'channel') { const channel = channels.find(c => c.id === id); if (!channel) return <Empty title="Channel not found">Explore Channels to choose another.</Empty>; return <div className="zx-panel"><small>RIZZ CHANNEL · SAMPLE CONTENT</small><h2>{channel.name}</h2><p>{channel.description}</p><button className="zx-primary" aria-pressed={data.joined.includes(channel.id)} onClick={() => update(d => ({...d,joined:toggle(d.joined,channel.id)}))}>{data.joined.includes(channel.id) ? 'Following' : 'Follow channel'}</button><button className="zx-text" onClick={() => open('space',channel.spaceId)}>Visit its Space ↗</button>{feed(channel.spaceId)}</div>; }
    const record = records.find(r => r.kind === kind && r.id === id);
    if (!record) return <Empty title="We couldn’t find this">The link may be incomplete. Go back to explore available items.</Empty>;
    const space = spaces.find(s => s.id === id);
    const society = societies.find(s => s.id === id);
    const event = events.find(s => s.id === id);
    const ping = pings.find(s => s.id === id);
    const trip = trips.find(s => s.id === id);
    const relatedSpace = event?.spaceId || ping?.spaceId;
    return <article className="zx-detail"><Picture className="zx-detail-photo" src={record.image}/><div className="zx-panel"><small>{record.kind.toUpperCase()} · EXISTING ZURI SAMPLE</small><h2>{record.title}</h2><p>{space?.description || society?.description || event?.description || ping?.description || (trip ? 'Ride from ' + trip.departure + ' to ' + trip.destination + '. Original sample listing.' : '')}</p><div className="zx-tags"><span>{record.sub}</span>{event && <span>{event.isFree ? 'Free event' : `UGX ${event.price.toLocaleString()}` } · sample listing</span>}</div><div className="zx-actions"><button className="zx-primary" aria-pressed={data.saved.includes(id!)} onClick={() => save(id!)}>{data.saved.includes(id!) ? 'Saved to your world' : 'Save to your world'}</button>{['event','trip','ping'].includes(kind!) && <button className="zx-secondary" aria-pressed={data.plan.includes(id!)} onClick={() => addPlan(id!)}>{data.plan.includes(id!) ? 'Remove from Planner' : 'Add to Planner'}</button>}{kind === 'society' && <button className="zx-secondary" onClick={() => update(d => ({...d,joined:toggle(d.joined,id!)}))}>{data.joined.includes(id!) ? 'Leave local membership' : 'Join in this preview'}</button>}</div>{relatedSpace && <button className="zx-context" onClick={() => open('space', relatedSpace)}>◎ Explore the connected Space <span>↗</span></button>}<button className="zx-context" onClick={() => open('chat',event?.organizerId || ping?.creatorId || 'u3')}>◈ Continue in Rizz Chats <span>↗</span></button>{['event','trip'].includes(kind!) && <p className="zx-muted">Adding to Planner records your interest. It does not reserve a place, purchase a ticket or confirm availability. Listings are sample content from the earlier prototype.</p>}{kind === 'space' && <><h3>What’s happening here</h3>{grid(records.filter(r => r.kind === 'event' && events.find(e => e.id === r.id)?.spaceId === id))}</>}</div></article>;
  }
  function feed(spaceId?: string) {
    const all = [...data.posts.map(p => ({...p, author:data.name, userId:'self', spaceIds:p.spaceId ? [p.spaceId] : []})), ...content.filter(c => c.mediaType !== 'reel').map(c => ({id:c.id,text:c.caption,image:c.mediaType === 'photo' ? c.media : undefined,created:c.createdAt,author:userMap[c.creatorId]?.name || 'ZURI creator',userId:c.creatorId,spaceIds:c.taggedSpaceIds}))];
    return <div className="zx-feed">{all.filter(p => matching(p.text + p.author) && (!spaceId || p.spaceIds.includes(spaceId))).map(p => <article className="zx-panel zx-post" key={p.id}><button className="zx-author" onClick={() => p.userId === 'self' ? go({world:'lore',tab:'Profile'}) : open('person',p.userId)}><span className="zx-avatar">{p.author[0]}</span><span><b>{p.author}</b><small>{p.userId === 'self' ? 'Your local post' : 'ZURI sample story'}</small></span><span aria-hidden="true">↗</span></button>{p.image && <button className="zx-post-image" onClick={() => open('moment',p.id)}><Picture src={p.image}/></button>}<p>{p.text}</p>{p.spaceIds.map(id => <button key={id} className="zx-context" onClick={() => open('space',id)}>◎ {spaces.find(s=>s.id===id)?.name || 'Connected Space'} ↗</button>)}<div className="zx-actions"><button aria-pressed={data.liked.includes(p.id)} className="zx-text" onClick={() => update(d => ({...d,liked:toggle(d.liked,p.id)}))}>{data.liked.includes(p.id) ? '♥ Liked' : '♡ Appreciate'}</button><button className="zx-text" onClick={() => p.userId === 'self' ? go({world:'rizz',tab:'Chats'}) : open('chat',p.userId)}>Talk in Chats ↗</button>{p.userId === 'self' && <button className="zx-text" onClick={() => update(d => ({...d,posts:d.posts.filter(x => x.id !== p.id)}))}>Delete local post</button>}</div></article>)}</div>;
  }
  function renderPage() {
    if (route.kind) return detail();
    if (route.world === 'lounge') return <><section className="zx-hero"><div><small>YOUR WORLD, WITH ROOM TO BREATHE</small><h2>A little intention.<br/><em>A world of possibility.</em></h2><p>Your people, plans and ideas — brought together in one calm place.</p><button className="zx-primary" onClick={() => setViola(true)}>✦ Make space with Viola <span>↗</span></button></div><div className="zx-orbit" aria-hidden="true"><i/><i/><i/><span>✦</span><b className="zx-orbit-one">◎</b><b className="zx-orbit-two">↗</b><b className="zx-orbit-three">◈</b></div></section><div className="zx-section-title"><div><small>A WORKSPACE THAT FEELS LIKE YOU</small><h2>At a glance</h2></div><button className="zx-text" aria-expanded={widgets} onClick={() => setWidgets(!widgets)}>Customize widgets {widgets ? '−' : '+'}</button></div>{widgets && <div className="zx-panel zx-actions">{['planner','saved','automations'].map(w => <label key={w}><input type="checkbox" checked={data.widgets.includes(w)} onChange={() => update(d => ({...d, widgets:toggle(d.widgets,w)}))}/> {w}</label>)}</div>}<div className="zx-widgets">{data.widgets.includes('planner') && <section className="zx-panel"><div className="zx-section-title"><h3><span className="zx-dot motion"/>My focus</h3><button className="zx-text" onClick={() => go({world:'motion',tab:'Planner'})}>Planner ↗</button></div>{tasks()}</section>}{data.widgets.includes('saved') && <section className="zx-panel"><div className="zx-section-title"><h3><span className="zx-dot aura"/>Saved possibilities</h3><span>{data.saved.length}</span></div>{data.saved.length ? records.filter(r => data.saved.includes(r.id)).slice(0,4).map(r => <button className="zx-context" key={r.id} onClick={() => open(r.kind,r.id)}>{r.title}<span>↗</span></button>) : <p className="zx-muted">Keep a place, event or invitation close. Tap the heart as you explore.</p>}<button className="zx-text" onClick={() => go({world:'aura',tab:'Find'})}>Find something good ↗</button></section>}{data.widgets.includes('automations') && <section className="zx-panel zx-wide"><div className="zx-section-title"><h3>✧ Your quiet helpers</h3><small>DEVICE AUTOMATIONS</small></div>{automations()}</section>}</div><div className="zx-section-title"><h2>Where will today take you?</h2><small>ONE ZURI. YOUR OWN WAY.</small></div><div className="zx-world-tiles">{(Object.keys(worlds) as World[]).filter(w => w !== 'lounge').map(w => <button key={w} style={{'--tile-color':worlds[w].color} as CSSProperties} onClick={() => launch(w)}><span>{worlds[w].mark}</span><h3>{worlds[w].name}</h3><p>{worlds[w].description}</p><b>Step inside ↗</b></button>)}</div></>;
    if (route.world === 'aura') {
      if (route.tab === 'Home') return <><div className="zx-banner"><small>ROOTED IN REAL PLACES</small><h2>You belong somewhere.<br/>Start close to home.</h2><p>Explore the communities and places in the original Jinja collection.</p><button className="zx-primary" onClick={() => go({world:'aura',tab:'Spaces'})}>Discover Spaces ↗</button></div><div className="zx-section-title"><h2>Around your world</h2><button className="zx-text" onClick={() => go({world:'aura',tab:'Societies'})}>Meet the Societies ↗</button></div>{grid(records.filter(r => r.kind === 'space').slice(0,3))}</>;
      const kind = route.tab === 'Spaces' ? 'space' : route.tab === 'Societies' ? 'society' : '';
      return <>{search()}{!kind && <div className="zx-filters" aria-label="Filter results">{['All','Saved','Spaces','Societies','Events'].map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}</div>}{grid(records.filter(r => matching(r.title + r.sub) && (!kind || r.kind === kind) && (kind || filter === 'All' || filter === 'Saved' && data.saved.includes(r.id) || ({Spaces:'space',Societies:'society',Events:'event'} as Record<string,string>)[filter] === r.kind)))}</>;
    }
    if (route.world === 'motion') {
      if (route.tab === 'Planner') return <><section className="zx-panel"><small>{today()} · AFRICA / KAMPALA</small><h2>Your day, with intention.</h2>{tasks()}</section><div className="zx-section-title"><h2>On your horizon</h2><button className="zx-text" onClick={() => go({world:'motion',tab:'Events'})}>Explore events ↗</button></div>{data.plan.length ? grid(records.filter(r => data.plan.includes(r.id))) : <Empty title="Something to look forward to">Add an event, trip or Ping to keep it here. You can plan without making a booking.</Empty>}</>;
      return <>{search()}{grid(records.filter(r => r.kind === ({Events:'event',Trips:'trip',Pings:'ping'} as Record<string,string>)[route.tab] && matching(r.title + r.sub)))}</>;
    }
    if (route.world === 'rizz') {
      if (route.tab === 'Feed') return <>{search()}{feed()}</>;
      if (route.tab === 'Create') return <form className="zx-panel zx-composer" onSubmit={e => {e.preventDefault(); if (!draft.trim()) return; const form = new FormData(e.currentTarget); update(d => ({...d,posts:[{id:crypto.randomUUID(),text:draft.trim(),created:new Date().toISOString(),image:photo,spaceId:String(form.get('space') || '')},...d.posts]}));setDraft('');setPhoto(undefined);if(fileRef.current)fileRef.current.value='';notify('Post saved locally. It is also in Lore when it includes a photo.');go({world:'rizz',tab:'Feed'});}}><div className="zx-person"><span className="zx-avatar">{data.name[0]}</span><div><h3>{data.name}</h3><p>Sharing to your local Feed</p></div></div><label>Your story<textarea required value={draft} maxLength={2000} onChange={e => setDraft(e.target.value)} placeholder="What’s worth remembering?"/></label><label>Add a photograph<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => {const f=e.target.files?.[0];setPhotoError('');if(!f){setPhoto(undefined);return;}if(f.size > 900000 || !['image/jpeg','image/png','image/webp'].includes(f.type)){setPhotoError('Choose a JPG, PNG or WebP photograph under 900 KB for device storage.');setPhoto(undefined);return;}const reader=new FileReader();reader.onload=()=>setPhoto(String(reader.result));reader.onerror=()=>setPhotoError('The photograph could not be read. Please choose it again.');reader.readAsDataURL(f);}}/></label>{photoError && <p role="alert">{photoError}</p>}{photo && <Picture className="zx-upload-preview" src={photo}/>}<label>Connect a Space<select name="space"><option value="">No Space</option>{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><p className="zx-muted">Posts and photographs stay on this device. Cloud publishing and video uploads require the app’s authenticated storage service.</p><button className="zx-primary">Save local post ↗</button></form>;
      if (route.tab === 'Channels') return <>{search()}<div className="zx-grid">{channels.filter(c => matching(c.name)).map(c => <button className="zx-panel zx-channel" key={c.id} onClick={() => open('channel',c.id)}><span>◈</span><small>CURATED SAMPLE CHANNEL</small><h2>{c.name}</h2><p>{c.description}</p><b>Open channel ↗</b></button>)}</div></>;
      return <>{search()}<div className="zx-panel"><p className="zx-muted">Your single messaging home. Preview conversations are stored locally and are never delivered.</p>{users.filter(u => u.id !== 'me' && matching(u.name)).map(u => <button data-focus={`chat-${u.id}`} className="zx-chat-row" key={u.id} onClick={() => open('chat',u.id)}><Picture src={u.avatar}/><span><b>{u.name}</b><small>{data.messages.filter(m => m.personId === u.id).at(-1)?.text || 'Start a local conversation'}</small></span><span>↗</span></button>)}</div></>;
    }
    if (route.tab === 'Profile') return profile();
    if (route.tab === 'Moments') return <>{data.posts.some(p => p.image) ? grid(data.posts.filter(p => p.image).map(p => ({id:p.id,kind:'moment',title:p.text,sub:data.name,image:p.image!}))) : <Empty title="Your story starts with a moment">Only your photographs and videos belong here. Add your first photograph through Rizz Create.<br/><button className="zx-primary" onClick={() => go({world:'rizz',tab:'Create'})}>Create a moment ↗</button></Empty>}</>;
    if (route.tab === 'Discover') return <>{search()}<div className="zx-grid">{users.filter(u => u.id !== 'me' && matching(u.name + u.bio)).map(u => <button className="zx-panel zx-discover-person" key={u.id} onClick={() => open('person',u.id)}><Picture src={u.avatar}/><small>@{u.handle}</small><h3>{u.name}</h3><p>{u.bio}</p><span>See their world ↗</span></button>)}</div></>;
    return <><form className="zx-inline" onSubmit={e => {e.preventDefault();if(!draft.trim())return;const id=crypto.randomUUID();update(d=>({...d,chapters:[...d.chapters,{id,title:draft.trim(),momentIds:[]}]}));setDraft('');open('chapter',id);}}><input aria-label="Chapter title" placeholder="A chapter worth keeping…" required maxLength={80} value={draft} onChange={e=>setDraft(e.target.value)}/><button className="zx-primary">Create chapter</button></form>{data.chapters.length ? grid(data.chapters.map(p => ({id:p.id,kind:'chapter',title:p.title,sub:`${p.momentIds.filter(id => data.posts.some(post => post.id === id)).length} moments`,image:data.posts.find(post=>p.momentIds.includes(post.id))?.image || ''}))) : <Empty title="A home for your memories">Create a chapter, then choose the photographs that belong together.</Empty>}</>;
  }
  if (!ready) return <div className="zuri-exp zx-opening" role="status">✦ Opening your world…</div>;
  return <div className="zuri-exp" style={{'--zx-accent':theme.color} as CSSProperties}>
    <a href="#zx-main" className="zx-skip">Skip to workspace</a>
    <aside className="zx-sidebar"><button className="zx-logo" aria-label="ZURI Lounge" onClick={() => launch('lounge')}>ZURI<span>✦</span></button><small>YOUR WORLD, CONNECTED</small><nav aria-label="ZURI destinations">{(Object.keys(worlds) as World[]).map(w => <button key={w} aria-current={route.world === w ? 'page' : undefined} onClick={() => launch(w)} style={{'--nav-color':worlds[w].color} as CSSProperties}><span>{worlds[w].mark}</span>{worlds[w].name}{route.world === w && <i/>}</button>)}</nav><div className="zx-sidebar-note"><span>✧</span><p>One identity.<br/>A world of possibility.</p><small>EXPERIENCE V2</small></div><button className="zx-identity" onClick={() => go({world:'lore',tab:'Profile'})}><span className="zx-avatar">{data.name[0]}</span><span><b>{data.name}</b><small>Device workspace</small></span><span>↗</span></button></aside>
    <div className="zx-body"><header className="zx-topbar"><div><span className="zx-world-mark">{theme.mark}</span><b>{theme.name}</b><span className="zx-top-caption">{theme.description}</span></div><div><span className="zx-preview-badge">LOCAL PREVIEW</span><button className="zx-avatar" aria-label="Your shared profile" onClick={() => go({world:'lore',tab:'Profile'})}>{data.name[0]}</button></div></header>
      {theme.tabs.length > 0 && <nav className="zx-tabs" aria-label={`${theme.name} sections`}>{theme.tabs.map(t => <button key={t} aria-current={route.tab === t ? 'page' : undefined} onClick={() => go({world:route.world,tab:t})}>{t}</button>)}</nav>}
      <main id="zx-main" ref={main} className="zx-main"><div className="zx-content">{storageError && <div className="zx-alert" role="alert"><p>{storageError}</p><button onClick={exportData}>Export current data</button><button onClick={() => {localStorage.removeItem(STORAGE);storageSafe.current=true;setStorageError('');setData(structuredClone(initialData));}}>Reset local workspace</button></div>}<div className="zx-page-heading"><div>{route.kind && <button className="zx-text zx-back" onClick={back}>← Back to where you were</button>}<small>{route.world === 'lounge' ? `JINJA, UGANDA · ${today()}` : `ZURI / ${theme.name.toUpperCase()}`}</small><h1 ref={heading} tabIndex={-1}>{route.world === 'lounge' ? `Welcome back, ${data.name.split(' ')[0]}.` : route.kind ? theme.name + ' / ' + route.kind : route.tab}</h1>{route.world !== 'lounge' && <p>{intros[route.tab]}</p>}</div>{route.world === 'lounge' && <span className="zx-quiet-tag">◌ Your own pace</span>}</div>{renderPage()}<footer className="zx-footer"><span>ZURI · Powering &amp; Distributing Good Systems</span><span>Shared foundation. Distinct experiences.</span></footer></div></main>
    </div><nav className="zx-mobile-nav" aria-label="ZURI mobile destinations">{(Object.keys(worlds) as World[]).map(w => <button key={w} aria-current={route.world === w ? 'page' : undefined} onClick={() => launch(w)}><span style={{color:worlds[w].color}}>{worlds[w].mark}</span>{worlds[w].name}</button>)}</nav><button className="zx-viola-fab" onClick={() => setViola(true)} aria-haspopup="dialog"><span>✦</span> Viola <span>↗</span></button>
    <div className="zx-toast" role="status">{notice}</div>
    {viola && <dialog className="zx-viola" ref={dialog} aria-labelledby="viola-title" onCancel={() => setViola(false)} onClick={e => {if(e.target === e.currentTarget){dialog.current?.close();setViola(false);}}}><header><div><span>✦</span><h2 id="viola-title">A little help from Viola</h2></div><button aria-label="Close Viola" onClick={() => {dialog.current?.close();setViola(false);}}>×</button></header><div className="zx-viola-content"><small>YOUR ZURI WORKSPACE COMPANION</small><p>Turn a little intention into a next step.</p><div className="zx-suggestions"><button onClick={() => {addTask('Make time to explore a new Space');notify('Added to your focus list.');}}>＋ Add an exploration to my focus</button><button onClick={() => {setViola(false);go({world:'motion',tab:'Planner'});}}>↗ Open my Planner</button><button onClick={() => {update(d=>runFocus(d));notify('Daily focus list prepared.');}}>✧ Prepare my daily focus</button></div><p className="zx-muted">These quick actions work on this device. AI replies provide guidance and cannot make bookings, send messages or run background automations.</p><div className="zx-ai-messages" aria-live="polite">{aiMessages.map((m,i) => <div key={i} className={m.role === 'user' ? 'zx-message' : 'zx-ai-reply'}><small>{m.role === 'user' ? 'YOU' : 'VIOLA · AI'}</small><p>{m.content}</p></div>)}{aiBusy && <p role="status">Viola is thinking…</p>}</div>{aiEnabled === null && <p role="status">Checking the AI connection…</p>}{aiEnabled === false && <p className="zx-alert">Live Viola is not connected. Quick actions above still work.</p>}{aiError && <p className="zx-alert" role="alert">{aiError}</p>}<form className="zx-inline" onSubmit={e => {e.preventDefault();void submitAI();}}><input aria-label="Ask Viola" maxLength={2000} placeholder="What would you like to make space for?" value={aiInput} onChange={e => setAiInput(e.target.value)} disabled={!aiEnabled || aiBusy} required/><button className="zx-primary" disabled={!aiEnabled || aiBusy}>Ask</button></form></div></dialog>}
  </div>;
}





