import SettingsScreen from './SettingsScreen';
import {loadPreferences,storePreferences,textScale,type AppPreferences} from './appPreferences';
import {screenTitle,creationAction} from './screenPresentation';
import CloudWorld from './CloudWorld';
import CloudAccount from './CloudAccount';
import NotificationCenter,{NotificationPreview} from './NotificationCenter';
import {captureNotifications,unreadNotices} from './notifications';
import type {KnowledgeSource} from '../core/knowledge';
import ViolaWorkbox from './ViolaWorkbox';
import type {ConversationIntent} from '../core/intents';
import {PrivacyCore} from './PrivacyCore';
import IntentWorkspace from './IntentWorkspace';
import {reviewedAIMessages} from '../core/privacy';
import {ToolsHub} from './ToolsHub';
import DesktopWorkspace,{DesktopLaunchpad} from './DesktopWorkspace';
import AppIntroduction from './AppIntroduction';
import {replacesCreation} from './navigation';
import {MomentsLibrary} from './MomentsLibrary';
import {IdentityEditor,IdentityAvatar} from './IdentityEditor';
import {useFormMemory} from './useFormMemory';
import {ConnectedActions} from './ConnectedActions';
import type {ObjectRef} from './model';
import {PersonProfile,PresenceEditor} from './PersonProfile';
import {toggleTask} from './taskPlanning';
import {TaskPlanning} from './ChapterOverview';
import {initialScrollNav,nextScrollNav} from './navigation';
import {PostMeta} from './PostMeta';
'use client';
import {PamojaScreens,handlesPamoja,SpecLinks} from './PamojaScreens';
import {pj,getSpaces,getSocieties,visiblePerson,visiblePost} from './pamojaModel';
'use client';

import { AppGlyph,SectionGlyph } from './AppGlyph';
import { ExperienceFlows } from './ExperienceFlows';
import { allPings, contextHeader, tagLabel } from './activity';
import OpportunityDiscovery from './OpportunityDiscovery';
import {opportunityEndpoint} from './services';
import { HomeDashboard, MobileDestination } from './MobileWorlds';
import { getViolaStatus, askViola, violaDestination } from './services';
import type {ViolaEventResult,ViolaPingResult,ViolaPingDraft} from './services';
import { mergeBackup, migrateLegacy } from './backup';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { worlds, home, parseRoute, routeHash, objectRoute, initialData, readData, runFocus, today, type World, type Route, type LocalData } from './model';
import { spaces, societies, events, pings, trips, users, content, userMap } from '../data/catalog';

const STORAGE = 'zuri-experience-v2';
const channels: {id:string;name:string;description:string;spaceId:string}[]=[];
const intros: Record<string, string> = { Home: 'A sense of belonging starts here.', Spaces: 'Places with people, purpose and possibility.', Societies: 'A shared interest is a good beginning.', Find: 'Something good, somewhere close.', Planner: 'Less scattered. More intentional.', Events: 'Good reasons to get out there.', Trips: 'A change of scene, a new perspective.', Pings: 'Small invitations. Real-world possibilities.', Feed: 'A window into your world.', Create: 'A thought, a photograph, a little story.', Channels: 'Follow the things that draw you in.', Chats: 'Every conversation, together here.', Moments: 'Your photographs and videos. Your perspective.', Discover: 'See the world through someone else’s eyes.', Chapters: 'Give your moments a place to belong.', Profile: 'One identity, everywhere in ZURI.' };
type ViewState = { scroll: number; query: string; filter: string; focus?: string };
const toggle = (list: string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];

function Empty({ title, children }: { title: string; children: ReactNode }) { return <div className="zx-empty"><span aria-hidden="true">◌</span><h3>{title}</h3><p>{children}</p></div>; }
function Picture({ src, alt = '', className = '' }: { src?: string; alt?: string; className?: string }) { const [failed, setFailed] = useState(false); return src && !failed ? <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} /> : <div role="img" aria-label={alt || 'Image unavailable'} className={`zx-picture-fallback ${className}`}>Z</div>; }

export default function Experience() {
  const [contextTitle,setContextTitle]=useState('');
  useEffect(()=>{const changed=(event:Event)=>{const d=(event as CustomEvent).detail;if(d?.route===window.location.hash&&typeof d.title==='string')setContextTitle(d.title.slice(0,120));};window.addEventListener('zuri-screen-title',changed);return()=>window.removeEventListener('zuri-screen-title',changed);},[]);
  const [prefs,setPrefs]=useState<AppPreferences>(loadPreferences);
  const [systemDay,setSystemDay]=useState(()=>window.matchMedia('(prefers-color-scheme: light)').matches);
  const changePreferences=(next:AppPreferences)=>{const saved=storePreferences(next);setPrefs(saved);};
  useEffect(()=>{const media=window.matchMedia('(prefers-color-scheme: light)');const changed=()=>setSystemDay(media.matches);media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);},[]);
  const [deviceMode,setDeviceMode]=useState(false);
  const [route, setRoute] = useState<Route>(home);
  const [introductionOpen,setIntroductionOpen]=useState(()=>import.meta.env.MODE==='website'&&new URLSearchParams(window.location.search).get('tour')==='welcome');
  const [data, setData] = useState<LocalData>(initialData);
  const [,refreshNotificationClock]=useState(0);
  useEffect(()=>{const timer=setInterval(()=>refreshNotificationClock(n=>n+1),60000);return()=>clearInterval(timer);},[]);
  const [navHidden,setNavHidden]=useState(false);
  const navMotion=useRef(initialScrollNav());
  const dockInteraction=useRef(0);
  const userScroll=useRef(0);
  const holdDock=()=>{dockInteraction.current=Date.now()+600;navMotion.current=initialScrollNav();setNavHidden(false);};
  useEffect(()=>{navMotion.current=initialScrollNav();setNavHidden(false);},[route]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [globalSearch,setGlobalSearch]=useState('');
  const [filter, setFilter] = useState('All');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [viola, setViola] = useState(()=>new URLSearchParams(window.location.search).get('viola')==='preview');
  const [widgets, setWidgets] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const aiEpoch=useRef(0);
  const [violaSession,setViolaSession]=useState(0);
  function startViola(text=''){resetViola();setAiInput(text);setViolaSession(session=>session+1);setViola(true);}
  function closeViola(){setViola(false);resetViola();setViolaSession(session=>session+1);}
  function resetViola(){aiEpoch.current++;setAiMessages([]);setAIIntent(null);setAiError('');setAiBusy(false);setAiInput('');}
  const [aiError, setAiError] = useState('');
  const [aiIntent,setAIIntent]=useState<ConversationIntent|null>(null);
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'assistant'; content: string;sources?:KnowledgeSource[];events?:ViolaEventResult[];pings?:ViolaPingResult[];pingDraft?:ViolaPingDraft|null}[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [photoError, setPhotoError] = useState('');
  const [importError, setImportError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const main = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useFormMemory(main,routeHash(route),ready&&pj(data).preferences.rememberDrafts===true&&!!route.kind&&['new-ping','event-create','checkout','new-space','new-society','new-channel','manage-channel','offer-editor','new-moment','chapter','space','society','event','ping','offer','person'].includes(route.kind));
  const views = useRef<Record<string, ViewState>>({});
  const lastTabs = useRef<Partial<Record<World, string>>>({});
  const restore = useRef<ViewState | null>(null);
  const storageSafe = useRef(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const current = useRef({ route, query, filter });
  current.current = { route, query, filter };
  const spaces=getSpaces(data),societies=getSocieties(data);
  const theme = worlds[route.world];
  const locationHeader=contextHeader(data,route);
  const draftKey = route.kind ? `${route.kind}-${route.id}` : `${route.world}-${route.tab}`;
  const draft = drafts[draftKey] || '';
  const setDraft = (value: string) => setDrafts(prev => ({ ...prev, [draftKey]: value }));
  const update = (fn: (previous: LocalData) => LocalData) => setData(previous=>captureNotifications(previous,fn(previous)));
  const notify = (message: string) => setNotice(message);
  const isDayMode=prefs.mode==='day'||prefs.mode==='system'&&systemDay;
  const createAction=creationAction(route);
  const settingsRoute=route.kind==='settings'||route.kind?.startsWith('settings-')||route.kind==='appearance';

  useEffect(() => {
    try {
      const savedApp = localStorage.getItem(STORAGE);
      let next = savedApp ? readData(savedApp) : migrateLegacy(localStorage.getItem('zuri.prototype.v1'));
      // Legacy automations are preserved for review; never run old sample schedules automatically.
      setData(next);
      const savedViews = sessionStorage.getItem('zuri-v2-views');
      if (savedViews) { const parsed=JSON.parse(savedViews); if(parsed && typeof parsed==='object' && !Array.isArray(parsed)) views.current=parsed; }
    } catch { storageSafe.current = false; setStorageError('Saved data could not be read. Changes will stay in memory until you export or reset this workspace.'); }
    const initial = parseRoute(window.location.hash);
    const saved = views.current[routeHash(initial)];
    if (saved) { setQuery(saved.query || ''); setFilter(saved.filter || 'All'); restore.current = saved; }
    setRoute(initial); setReady(true);
  }, []);
  useEffect(()=>{
    if(!ready||!introductionOpen)return;
    const url=new URL(window.location.href);
    if(url.searchParams.has('tour')){
      url.searchParams.delete('tour');
      window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
    }
  },[ready,introductionOpen]);
  useEffect(() => {
    if (!ready || !storageSafe.current) return;
    try { localStorage.setItem(STORAGE, JSON.stringify(data)); setStorageError(''); }
    catch { setStorageError('This device could not save your latest changes. Export your workspace before leaving.'); }
  }, [data, ready]);
  useEffect(() => {
    const save = () => {
      const {route: r, query: q, filter: f} = current.current;
      views.current[routeHash(r)] = { scroll: main.current?.scrollTop || 0, query: q, filter: f, focus: (document.activeElement as HTMLElement)?.dataset.focus };
      try { sessionStorage.setItem('zuri-v2-views', JSON.stringify(views.current)); } catch { /* Navigation still works in memory. */ }
    };
    const pop = () => {setContextTitle(''); save(); const next = parseRoute(window.location.hash); const saved = window.history.state?.zuriView || views.current[routeHash(next)] || {scroll: 0, query: '', filter: 'All'}; restore.current = saved; setQuery(saved.query); setFilter(saved.filter); setRoute(next); };
    window.addEventListener('popstate', pop); window.addEventListener('hashchange', pop); window.addEventListener('pagehide', save);
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener('hashchange', pop); window.removeEventListener('pagehide', save); };
  }, []);
  useLayoutEffect(() => {
    if (!ready) return;
    const saved = restore.current;
    main.current?.scrollTo({ top: saved?.scroll || 0, behavior: 'instant' });
    const focus = saved?.focus ? Array.from(main.current?.querySelectorAll<HTMLElement>('[data-focus]') || []).find(el => el.dataset.focus === saved.focus) : null;
    const detailHeading=main.current?.querySelector<HTMLElement>('.zm-place-intro h2,.zm-event-cover h2,.zm-topic-detail>h2,.zm-chat header strong,.zm-broadcast header h2,.xf-chapter-cover h2,.xf-ping-cover h2,.xf-editor-intro h2') || (route.kind?document.querySelector<HTMLElement>('.xf-header-title'):null);
    if(detailHeading)detailHeading.tabIndex=-1;
    (focus || detailHeading || heading.current)?.focus({ preventScroll: true });
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
    getViolaStatus(controller.signal).then(d => {setAiEnabled(d.enabled === true);if(!d.enabled&&d.reason)setAiError(d.reason);}).catch(() => { if (!controller.signal.aborted) { setAiEnabled(false); setAiError('Could not check Viola’s connection. Close and reopen to retry.'); } });
    return () => controller.abort();
  }, [viola]);

  useEffect(() => { const changed=()=>setOnline(navigator.onLine); window.addEventListener('online',changed); window.addEventListener('offline',changed); return()=>{window.removeEventListener('online',changed);window.removeEventListener('offline',changed);}; }, []);

  async function importBackup(input: HTMLInputElement) {
    const file=input.files?.[0]; if(!file)return; setImportError('');
    try {if(file.size>25000000)throw new Error('Choose a ZURI backup below 25 MB.');const restored=readData(await file.text());update(d=>mergeBackup(d,restored));notify('Backup merged. Existing records and your current identity were kept.');}
    catch(error){setImportError(error instanceof Error?error.message:'This backup could not be read.');}finally{input.value='';}
  }

  function go(next: Route, replace = false) {
    replace = replace || replacesCreation(route,next);
    views.current[routeHash(route)] = { scroll: main.current?.scrollTop || 0, query, filter, focus: (document.activeElement as HTMLElement)?.dataset.focus };
    window.history.replaceState({...window.history.state, zuriView:views.current[routeHash(route)]}, '');
    lastTabs.current[route.world] = route.tab;
    const saved = views.current[routeHash(next)] || { scroll: 0, query: '', filter: 'All' };
    restore.current = saved;
    setContextTitle('');window.history[replace ? 'replaceState' : 'pushState']({ ...window.history.state, zuriExperience: true, zuriView:saved }, '', routeHash(next));
    setQuery(saved.query); setFilter(saved.filter); setRoute(next);
  }
  function launch(world: World) { go({ world, tab: lastTabs.current[world] || worlds[world].tabs[0] || '' }); }
  function open(kind: string, id: string) { go(objectRoute(kind,id)); }
  useEffect(()=>{
    const navigate=(event:Event)=>{
      const {kind,id}=(event as CustomEvent<{kind:string;id:string}>).detail;
      if(!kind||!id)return;
      event.preventDefault();
      const next=objectRoute(kind,id);
      if(routeHash(next)!==routeHash(route))go(next);
    };
    window.addEventListener('zuri-open-object',navigate);
    return()=>window.removeEventListener('zuri-open-object',navigate);
  },[route,query,filter]);
  function back() { if (window.history.state?.zuriExperience) window.history.back(); else go({ world: route.world, tab: route.tab }, true); }
  function save(id: string) { update(d => ({ ...d, saved: toggle(d.saved, id) })); }
  function addPlan(id: string) { update(d => ({...d, plan: toggle(d.plan, id)})); }
  function addTask(text: string) { if (!text.trim()) return; update(d => ({...d, tasks: [...d.tasks, { id: crypto.randomUUID(), text: text.trim(), date: today(), done: false }]})); }
  const matching = (name: string) => name.toLowerCase().includes(query.toLowerCase());
  const records = [ ...spaces.map(s => ({id: s.id, kind: 'space', title: s.name, sub: s.location, image: s.image})), ...societies.map(s => ({id: s.id, kind: 'society', title: s.name, sub: 'Society', image: s.image})), ...events.map(s => ({id: s.id, kind: 'event', title: s.name, sub: `${s.date} · ${s.time}`, image: s.image})), ...allPings(data).map(s => ({id:s.id, kind:'ping', title:s.title, sub:'An invitation to join in', image:s.image})), ...trips.filter(s=>data.attendance?.includes(s.eventId)).map(s => ({id:s.id, kind:'trip', title:s.departure + ' → ' + s.destination, sub:s.time + ' · ' + s.type + ' ride', image:events.find(e => e.id === s.eventId)?.image || ''})) ];
  function card(record: typeof records[number]) { return <article className="zx-card" key={`${record.kind}-${record.id}`}><button data-focus={`${record.kind}-${record.id}`} className="zx-card-open" onClick={() => open(record.kind, record.id)}><Picture src={record.image}/><div className="zx-card-body"><small>{record.sub}</small><h3>{record.title}</h3><span>Explore {record.kind} <b aria-hidden="true">↗</b></span></div></button><button className="zx-save" aria-label={`${data.saved.includes(record.id) ? 'Unsave' : 'Save'} ${record.title}`} aria-pressed={data.saved.includes(record.id)} onClick={() => save(record.id)}>{data.saved.includes(record.id) ? '♥' : '♡'}</button></article>; }
  function grid(items: typeof records) { return items.length ? <div className="zx-grid">{items.map(card)}</div> : <Empty title="Nothing here yet">Try a different search, or explore another destination.</Empty>; }
  function search() { return <label className="zx-search"><span aria-hidden="true">⌕</span><input aria-label={`Search ${route.tab}`} placeholder={`Search ${route.tab.toLowerCase()}…`} value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}>×</button>}</label>; }
  function tasks() { return <>{route.world==='motion'&&<button className="zx-text" onClick={()=>open('extensions','personal')}>Tools for your plans ↗</button>}<form className="zx-inline" onSubmit={e => { e.preventDefault(); addTask(draft); setDraft(''); }}><input aria-label="New focus task" value={draft} maxLength={180} onChange={e => setDraft(e.target.value)} placeholder="Make space for one thing…" required/><button className="zx-primary" type="submit">Add</button></form>{data.tasks.length ? <ul className="zx-tasks">{data.tasks.map(t => <li key={t.id}><label><input type="checkbox" checked={t.done} onChange={() => update(d => ({...d, tasks: d.tasks.map(x => x.id === t.id ? toggleTask(x) : x)}))}/><span className={t.done ? 'zx-done' : ''}>{t.text}<small>{t.dueDate?'Due '+t.dueDate:'Added '+t.date}{t.assignee?' · '+t.assignee:''}</small></span></label>{t.sourceRef&&<button className="zx-text" onClick={()=>open(t.sourceRef!.kind,t.sourceRef!.id)}>Source {t.sourceRef.kind} ↗</button>}{t.sourceMomentId&&data.posts.some(p=>p.id===t.sourceMomentId)&&<button className="zx-text" onClick={()=>open('moment',t.sourceMomentId!)}>Original moment ↗</button>}{route.world==='motion'&&<TaskPlanning task={t} data={data} update={update}/>}<button aria-label={`Remove ${t.text}`} onClick={() => update(d => ({...d, tasks: d.tasks.filter(x => x.id !== t.id)}))}>×</button></li>)}</ul> : <p className="zx-muted">A clear page. Add something you want to make time for.</p>}</>; }
  function automations() { return <>{data.automations.map(a => <div className="zx-automation" key={a.id}><div><h3>{a.name}</h3><p>Once each day when you open ZURI. Runs on this device.</p><small>{a.lastRun ? `Last run: ${a.lastRun}` : 'No runs yet'}</small></div><button role="switch" aria-checked={a.enabled} aria-label={a.name} className={a.enabled ? 'zx-switch on' : 'zx-switch'} onClick={() => update(d => ({...d, automations: d.automations.map(x => x.id === a.id ? {...x, enabled: !x.enabled} : x)}))}><span/></button><button className="zx-text" onClick={() => { update(d => runFocus(d)); notify('Daily focus added to Planner. Repeated runs do not duplicate it.'); }}>Run now ↗</button></div>)}</>; }
  function profile() { return <div className="zx-profile zx-panel"><IdentityAvatar data={data} large/><small>YOUR PROFILE &amp; SETTINGS</small><h2>{data.name}</h2><p>{data.bio}</p><button className="zx-primary" onClick={()=>open('cloud-account','home')}>Your ZURI account ↗</button><IdentityEditor data={data} update={update} notify={notify}/><PresenceEditor data={data} update={update} open={open} notify={notify}/><label className="pj-field">Appearance<select aria-label="Appearance mode" value={pj(data).preferences.mode||'night'} onChange={e=>update(d=>({...d,pamoja:{...pj(d),preferences:{...pj(d).preferences,mode:e.target.value as 'day'|'night'}}}))}><option value="day">Day mode</option><option value="night">Night mode</option></select></label><SpecLinks open={open} items={[["◉","Notifications","notifications"],["✦","Your world","world-guide"],["▧","Requests & enquiries","orders"],["◇","Members & Wallet","members"],["⌖","Your Spaces","my-spaces"],["◒","Experience & trust","reputation"],["◉","Privacy & safety","privacy"],["◉","Data & privacy","privacy-core"],["◐","Appearance & widgets","appearance"]]}/><p className="zx-muted">This workspace is saved on this device. Open Your ZURI account to sign in, save selected work online and use your private conversations. Device drafts are shared only when you choose.</p><button className="zx-text" onClick={exportData}>Export unencrypted backup ↓</button><label className="zx-backup-label">Merge an app backup<input type="file" accept="application/json,.json" onChange={e=>void importBackup(e.currentTarget)}/></label><p className="zx-muted">Merging keeps your current identity and existing records. Export first to keep a separate snapshot.</p>{importError && <p className="zx-alert" role="alert">{importError}</p>}</div>; }
  function exportData() { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = 'zuri-workspace.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  async function submitAI() {
    if (!aiInput.trim() || aiBusy || !aiEnabled) return;
    const displayMessages = [...aiMessages, {role:'user' as const, content:aiInput.trim()}].slice(-12);
    let next:ReturnType<typeof reviewedAIMessages>;
    try{next=reviewedAIMessages(displayMessages);}catch(error){setAiError(error instanceof Error?error.message:'Check your message.');return;}
    const epoch=++aiEpoch.current;
    const previousEvents=[...displayMessages].reverse().find(message=>message.role==='assistant'&&message.events?.length)?.events??[];
    const previousPings=[...displayMessages].reverse().find(message=>message.role==='assistant'&&message.pings?.length)?.pings??[];
    const eventReferences=[...new Map(previousEvents.map(event=>[event.reference.source+':'+event.reference.id,event.reference])).values()].slice(0,6);
    const pingReferences=[...new Set(previousPings.map(ping=>ping.reference.id))].slice(0,6);
    setAIIntent(null);setAiMessages(displayMessages); setAiInput(''); setAiBusy(true); setAiError('');
    try { const result = await askViola(next,JSON.stringify(next),eventReferences,pingReferences); if(epoch!==aiEpoch.current)return;setAiMessages([...displayMessages, {role:'assistant', content:result.reply,sources:result.sources,events:result.events,pings:result.pings,pingDraft:result.pingDraft}]);setAIIntent(result.intent); }
    catch (error) { if(epoch!==aiEpoch.current)return;setAiError(error instanceof Error ? error.message : 'Connection failed. Please retry.'); setAiInput(next.at(-1)?.content || ''); setAiMessages(displayMessages.slice(0,-1)); } finally {if(epoch===aiEpoch.current)setAiBusy(false);}
  }
  function detail() {
    const {kind, id} = route;
    if (kind === 'chat') {
      const person = users.find(u => u.id === id);
      if (!person) return <Empty title="Conversation not found">Choose someone from Chats.</Empty>;
      return <div className="zx-panel zx-conversation"><div className="zx-person"><Picture src={person.avatar}/><div><h2>{person.name}</h2><p>Local draft conversation · no delivery service connected</p></div></div><div className="zx-messages" aria-live="polite">{data.messages.filter(m => m.personId === id).map(m => <div className="zx-message" key={m.id}><p>{m.text}</p><small>Stored on this device · {new Date(m.created).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</small></div>)}</div>{!data.messages.some(m => m.personId === id) && <Empty title="Start with a hello">Messages you write here are saved locally. They are not sent to {person.name.split(' ')[0]}.</Empty>}<form className="zx-inline" onSubmit={e => {e.preventDefault(); if (!draft.trim()) return; update(d => ({...d, messages:[...d.messages,{id:crypto.randomUUID(),text:draft.trim(),personId:id!,created:new Date().toISOString()}]}));setDraft('');}}><input aria-label="Message draft" placeholder="Write a local message…" maxLength={2000} value={draft} onChange={e => setDraft(e.target.value)} required/><button className="zx-primary">Save message</button></form></div>;
    }
    if (kind === 'person'&&pj(data).blocked.includes(id||''))return <Empty title="This person is blocked locally"><button className="zx-text" onClick={()=>open('relationships','home')}>Manage blocks</button></Empty>;
    if (kind === 'person')return <PersonProfile id={id||''} data={data} update={update} open={open} go={go}/>;
    if (kind === 'moment') { const post = data.posts.find(p => p.id === id); const item = content.find(p => p.id === id); if (!post && !item) return <Empty title="Moment not found">It may have been removed from this device.</Empty>; return <article className="zx-panel"><Picture className="zx-detail-photo" src={post?.image || item?.media}/><h2>{post?.text || item?.caption}</h2><button className="zx-text" onClick={() => post ? go({world:'lore',tab:'Profile'}) : open('person', item?.creatorId || 'u1')}>{post ? data.name : userMap[item!.creatorId]?.name} ↗</button></article>; }
    if (kind === 'chapter') { const chapter = data.chapters.find(p => p.id === id); if (!chapter) return <Empty title="Chapter not found">Return to Chapters.</Empty>; const moments = data.posts.filter(p => p.image && chapter.momentIds.includes(p.id)); return <div><div className="zx-panel"><small>YOUR PHOTO COLLECTION · ZURI APP</small><h2>{chapter.title}</h2><p>Select the moments that belong in this chapter.</p>{data.posts.filter(p => p.image).map(p => <label className="zx-chapter-choice" key={p.id}><input type="checkbox" checked={chapter.momentIds.includes(p.id)} onChange={() => update(d => ({...d,chapters:d.chapters.map(c => c.id === id ? {...c,momentIds:toggle(c.momentIds,p.id)} : c)}))}/>{p.text}</label>)}<button className="zx-text" onClick={() => {update(d => ({...d,chapters:d.chapters.filter(c => c.id !== id)}));go({world:'lore',tab:'Chapters'});}}>Delete collection (keep moments)</button></div>{grid(moments.map(p => ({id:p.id,kind:'moment',title:p.text,sub:'Your moment',image:p.image || ''})))}</div>; }
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
    const all = [...data.posts.filter(p=>!p.chapterOnly).map(p => ({...p, author:data.name, userId:'self', spaceIds:p.tags?.filter(t=>t.kind==='space').map(t=>t.id)|| (p.spaceId ? [p.spaceId] : [])})), ...content.filter(c => c.mediaType !== 'reel').map(c => ({id:c.id,text:c.caption,video:undefined,image:c.mediaType === 'photo' ? c.media : undefined,created:c.createdAt,author:userMap[c.creatorId]?.name || 'ZURI creator',userId:c.creatorId,spaceIds:c.taggedSpaceIds,tags:[...c.taggedSpaceIds.map(id=>({kind:'space' as const,id})),...c.taggedSocietyIds.map(id=>({kind:'society' as const,id}))]}))];
    return <div className="zx-feed"><button className="zx-text" onClick={()=>open('feed-controls','home')}>Your feed preferences ↗</button>{all.filter(p => visiblePost(data,p.id,p.userId==='self'?'me':p.userId,p.tags?.filter(t=>t.kind==='society').map(t=>t.id))&&matching(p.text + p.author) && (!spaceId || p.spaceIds.includes(spaceId))).map(p => <article className="zx-panel zx-post" key={p.id}><button className="zx-author" onClick={() => p.userId === 'self' ? go({world:'lore',tab:'Profile'}) : open('person',p.userId)}>{p.userId==='self'?<IdentityAvatar data={data}/>:<span className="zx-avatar">{p.author[0]}</span>}<span><b>{p.author}</b><small>{p.userId === 'self' ? 'Your local post' : 'ZURI sample story'}</small></span><span aria-hidden="true">↗</span></button>{p.video&&<video className="xf-media" src={p.video} controls playsInline preload="metadata"/>}{p.image && <button className="zx-post-image" aria-label={`Open moment: ${p.text}`} onClick={() => open('moment',p.id)}><Picture src={p.image}/></button>}<PostMeta text={p.text} count={(p.tags||p.spaceIds).length} contexts={<>{(p.tags||p.spaceIds.map(id=>({kind:'space' as const,id}))).map(t=><button key={t.kind+t.id} className="zx-context" onClick={()=>open(t.kind,t.id)}>⌘ {tagLabel(data,t)} ↗</button>)}</>}/><div className="zx-actions"><button aria-pressed={data.liked.includes(p.id)} className="zx-text" onClick={() => update(d => ({...d,liked:toggle(d.liked,p.id)}))}>{data.liked.includes(p.id) ? '♥ Liked' : '♡ Appreciate'}</button><button className="zx-text" onClick={() => p.userId === 'self' ? go({world:'rizz',tab:'Chats'}) : open('chat',p.userId)}>Message</button>{p.userId === 'self' && <button className="zx-text" onClick={() => update(d => ({...d,posts:d.posts.filter(x => x.id !== p.id)}))}>Delete local post</button>}</div></article>)}</div>;
  }
  function renderPage() {
    if(settingsRoute)return <SettingsScreen key={route.kind} section={route.kind||'settings'} prefs={prefs} onChange={changePreferences} onOpen={open} onProfile={()=>go({world:'lore',tab:'Profile'})}/>;
    if(!deviceMode&&route.kind!=='privacy-core'&&route.kind!=='assistant-settings'&&route.kind!=='appearance'&&route.kind!=='notification-preview')return <CloudWorld route={route} data={data} go={go} open={open} onDevice={()=>setDeviceMode(true)} onViola={startViola} input={aiInput} setInput={setAiInput} preferences={prefs}/>;

    if(route.kind==='intent')return <IntentWorkspace key={route.id} recordId={route.id} initialText={route.id==='new'?aiInput:''} data={data} update={update} open={open} go={go}/>;
    if(route.kind==='notification-preview')return <NotificationPreview/>;
    if(route.kind==='notifications')return <NotificationCenter data={data} update={update} go={go}/>;
    const screenProps={route,data,update,open,go,notify,query,setQuery,draft,setDraft,filter,setFilter};
    if(['extensions','tool','tool-access','tool-run'].includes(route.kind||'')&&!(route.id||'').startsWith('memory'))return <ToolsHub key={routeHash(route)} {...screenProps}/>;
    if(route.kind==='cloud-account')return <CloudAccount deviceTasks={data.tasks}/>;
    if(route.kind==='privacy-core')return <PrivacyCore {...screenProps}/>;
    if(handlesPamoja(screenProps))return <PamojaScreens key={routeHash(route)} {...screenProps}/>;
    if(route.world==='lounge') return <HomeDashboard data={data} update={update} open={open} go={go} notify={notify} planner={tasks()} automations={automations()} input={aiInput} setInput={setAiInput} onViola={()=>startViola()} onIntent={()=>startViola()}/>;
    if(route.kind==='opportunities')return <OpportunityDiscovery endpoint={opportunityEndpoint()} onSpace={id=>open('space',id)} onSave={o=>update(d=>({...d,tasks:d.tasks.some(t=>t.id==='opportunity:'+o.id)?d.tasks:[...d.tasks,{id:'opportunity:'+o.id,text:'Follow up: '+o.title+' · '+o.source_url,done:false,date:today()}]}))}/>;
    const flowDetail=['new-moment','ping','new-ping','ping-chat','new-topic','topic','attend','travel','trip','new-channel','manage-channel','channel','chapter','moment'].includes(route.kind||'');
    const flowList=!route.kind&&(route.world==='aura'&&route.tab==='Feed'||route.world==='motion'&&route.tab==='Pings'||route.world==='rizz'&&['Create','Channels'].includes(route.tab)||route.world==='lore'&&route.tab==='Chapters');
    if(flowDetail||flowList)return <ExperienceFlows key={routeHash(route)} route={route} data={data} update={update} open={open} go={go} notify={notify} query={query} setQuery={setQuery} draft={draft} setDraft={setDraft} filter={filter} setFilter={setFilter}/>;
    const mobileDetail=['space-preview','space','society','topic','event','channel','chat'].includes(route.kind||'');
    const mobileList=!route.kind&&(route.world==='aura'&&['Home','Spaces','Societies'].includes(route.tab)||route.world==='motion'&&route.tab==='Events'||route.world==='rizz'&&['Chats','Channels'].includes(route.tab));
    if(mobileDetail||mobileList)return <MobileDestination key={routeHash(route)} route={route} data={data} update={update} open={open} go={go} notify={notify} query={query} setQuery={setQuery} draft={draft} setDraft={setDraft} filter={filter} setFilter={setFilter}/>;
    if (route.kind) return detail();

    if (route.world === 'aura') {
      if (route.tab === 'Home') return <><div className="zx-banner"><small>ROOTED IN REAL PLACES</small><h2>You belong somewhere.<br/>Start close to home.</h2><p>Explore the communities and places in the original Jinja collection.</p><button className="zx-primary" onClick={() => go({world:'aura',tab:'Spaces'})}>Discover Spaces ↗</button></div><div className="zx-section-title"><h2>Around your world</h2><button className="zx-text" onClick={() => go({world:'aura',tab:'Societies'})}>Meet the Societies ↗</button></div>{grid(records.filter(r => r.kind === 'space').slice(0,3))}</>;
      const kind = route.tab === 'Spaces' ? 'space' : route.tab === 'Societies' ? 'society' : '';
      return <><button className="zx-text" onClick={()=>open('opportunities','discover')}>Discover opportunities ↗</button>{search()}{!kind && <div className="zx-filters" aria-label="Filter results">{['All','Saved','Spaces','Societies','Events'].map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}</div>}{grid(records.filter(r => matching(r.title + r.sub) && (!kind || r.kind === kind) && (kind || filter === 'All' || filter === 'Saved' && data.saved.includes(r.id) || ({Spaces:'space',Societies:'society',Events:'event'} as Record<string,string>)[filter] === r.kind)))}</>;
    }
    if (route.world === 'motion') {
      if (route.tab === 'Planner') return <><button className="zx-text" onClick={()=>open('opportunities','discover')}>Find opportunities for your next step ↗</button><section className="zx-panel"><small>{today()} · AFRICA / KAMPALA</small><h2>Your day, with intention.</h2>{tasks()}</section><div className="zx-section-title"><h2>On your horizon</h2><button className="zx-text" onClick={() => go({world:'motion',tab:'Events'})}>Explore events ↗</button></div>{data.plan.length ? grid(records.filter(r => data.plan.includes(r.id))) : <Empty title="Something to look forward to">Add an event, trip or Ping to keep it here. You can plan without making a booking.</Empty>}</>;
      return <>{search()}{grid(records.filter(r => r.kind === ({Events:'event',Trips:'trip',Pings:'ping'} as Record<string,string>)[route.tab] && matching(r.title + r.sub)))}</>;
    }
    if (route.world === 'rizz') {
      if (route.tab === 'Feed') return <>{search()}{feed()}</>;
      if (route.tab === 'Create') return <form className="zx-panel zx-composer" onSubmit={e => {e.preventDefault(); if (!draft.trim()) return; const form = new FormData(e.currentTarget); update(d => ({...d,posts:[{id:crypto.randomUUID(),text:draft.trim(),created:new Date().toISOString(),image:photo,spaceId:String(form.get('space') || '')},...d.posts]}));setDraft('');setPhoto(undefined);if(fileRef.current)fileRef.current.value='';notify('Post saved locally. It is also in Lore when it includes a photo.');go({world:'rizz',tab:'Feed'});}}><div className="zx-person"><IdentityAvatar data={data}/><div><h3>{data.name}</h3><p>Sharing to your local Feed</p></div></div><label>Your story<textarea required value={draft} maxLength={2000} onChange={e => setDraft(e.target.value)} placeholder="What’s worth remembering?"/></label><label>Add a photograph<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => {const f=e.target.files?.[0];setPhotoError('');if(!f){setPhoto(undefined);return;}if(f.size > 900000 || !['image/jpeg','image/png','image/webp'].includes(f.type)){setPhotoError('Choose a JPG, PNG or WebP photograph under 900 KB for device storage.');setPhoto(undefined);return;}const reader=new FileReader();reader.onload=()=>setPhoto(String(reader.result));reader.onerror=()=>setPhotoError('The photograph could not be read. Please choose it again.');reader.readAsDataURL(f);}}/></label>{photoError && <p role="alert">{photoError}</p>}{photo && <Picture className="zx-upload-preview" src={photo}/>}<label>Connect a Space<select name="space"><option value="">No Space</option>{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><p className="zx-muted">Posts and photographs stay on this device. Cloud publishing and video uploads require the app’s authenticated storage service.</p><button className="zx-primary">Save local post ↗</button></form>;
      if (route.tab === 'Channels') return <>{search()}<div className="zx-grid">{channels.filter(c => matching(c.name)).map(c => <button className="zx-panel zx-channel" key={c.id} onClick={() => open('channel',c.id)}><span>◈</span><small>CURATED SAMPLE CHANNEL</small><h2>{c.name}</h2><p>{c.description}</p><b>Open channel ↗</b></button>)}</div></>;
      return <>{search()}<div className="zx-panel"><p className="zx-muted">Your single messaging home. Preview conversations are stored locally and are never delivered.</p>{users.filter(u => u.id !== 'me' && visiblePerson(data,u.id) && matching(u.name)).map(u => <button data-focus={`chat-${u.id}`} className="zx-chat-row" key={u.id} onClick={() => open('chat',u.id)}><Picture src={u.avatar}/><span><b>{u.name}</b><small>{data.messages.filter(m => m.personId === u.id).at(-1)?.text || 'Start a local conversation'}</small></span><span>↗</span></button>)}</div></>;
    }
    if (route.tab === 'Profile') return profile();
    if (route.tab === 'Moments') return <MomentsLibrary data={data} open={open}/>;
    if (route.tab === 'Discover') return <>{search()}<div className="zx-grid">{users.filter(u => u.id !== 'me' && matching(u.name + u.bio)).map(u => <button className="zx-panel zx-discover-person" key={u.id} onClick={() => open('person',u.id)}><Picture src={u.avatar}/><small>@{u.handle}</small><h3>{u.name}</h3><p>{u.bio}</p><span>See their world ↗</span></button>)}</div></>;
    return <><form className="zx-inline" onSubmit={e => {e.preventDefault();if(!draft.trim())return;const id=crypto.randomUUID();update(d=>({...d,chapters:[...d.chapters,{id,title:draft.trim(),momentIds:[]}]}));setDraft('');open('chapter',id);}}><input aria-label="Chapter title" placeholder="A chapter worth keeping…" required maxLength={80} value={draft} onChange={e=>setDraft(e.target.value)}/><button className="zx-primary">Create chapter</button></form>{data.chapters.length ? grid(data.chapters.map(p => ({id:p.id,kind:'chapter',title:p.title,sub:`${p.momentIds.filter(id => data.posts.some(post => post.id === id)).length} moments`,image:data.posts.find(post=>p.momentIds.includes(post.id))?.image || ''}))) : <Empty title="A home for your memories">Create a chapter, then choose the photographs that belong together.</Empty>}</>;
  }
  useEffect(()=>{
    if(ready&&import.meta.env.MODE==='website'&&window.parent!==window)
      window.parent.postMessage({type:'zuri-app-route',hash:routeHash(route)},window.location.origin);
  },[route,ready]);
  if (!ready) return <div className="zuri-exp zx-opening" role="status">✦ Opening your world…</div>;
  return <div className="zuri-exp" data-nav-hidden={navHidden} onWheelCapture={()=>{userScroll.current=Date.now()+1200;}} onTouchMoveCapture={()=>{userScroll.current=Date.now()+1200;}} onScrollCapture={e=>{const el=e.target;if(route.kind||!(el instanceof HTMLElement)||el!==main.current||Date.now()<dockInteraction.current||Date.now()>userScroll.current)return;navMotion.current=nextScrollNav(navMotion.current,el.scrollTop);setNavHidden(navMotion.current.hidden);}} data-mode={isDayMode?'day':'night'} data-palette={prefs.palette} data-font={prefs.font} data-density={prefs.density} data-world={route.world} data-tab={route.tab} data-detail={route.kind||''} data-chat-theme={route.kind==='chat'?(data.chatWallpapers?.[route.id||'']||'default'):undefined} data-wallpaper={prefs.customWallpaper?'custom':prefs.wallpaper} style={{'--zx-accent':theme.color,'--zuri-text-scale':textScale[prefs.size],'--zs-wallpaper-image':prefs.customWallpaper?`url("${prefs.customWallpaper}")`:undefined} as CSSProperties}>
    <a href="#zx-main" className="zx-skip" onClick={e=>{e.preventDefault();main.current?.focus({preventScroll:true});}}>Skip to workspace</a>
    {import.meta.env.MODE==='website'&&<DesktopWorkspace local={deviceMode} route={route} data={deviceMode?data:initialData} launch={launch} go={go} open={open} onViola={()=>startViola()} onIntroduction={()=>setIntroductionOpen(true)}/>}
    <div className="zx-body">
      <header className="zx-topbar zs-topbar">
        <div className="zs-header-context">
          {route.kind&&<button className="zs-icon-button zs-back" aria-label="Back" onClick={back}><AppGlyph name="back" size={21}/></button>}
          {route.world==='lounge'&&!route.kind?<span className="zs-lounge-logo"><img src={import.meta.env.BASE_URL+(isDayMode?'brand/zuri.png':'brand/zuri-dark.png')} alt="ZURI"/></span>:<>
          <button className="zs-world-home" aria-label="Return to Lounge" onClick={()=>launch('lounge')}><AppGlyph name={route.world} size={32}/></button>
          <strong className="zs-screen-title">{contextTitle||screenTitle(route)}</strong></>}
        </div>
        <div className="zs-header-actions">
          {route.world==='lounge'&&!route.kind&&<button className="zs-icon-button" aria-label="Notifications" onClick={()=>open('notifications','home')}><AppGlyph name="bell" size={21}/></button>}
          {!settingsRoute&&<button className="zs-icon-button" aria-label="Settings" onClick={()=>open('settings','home')}><AppGlyph name="settings" size={21}/></button>}
          {createAction&&<button className="zs-icon-button zs-create-button" aria-label={createAction.label} onClick={()=>open(createAction.kind,'new')}><AppGlyph name="plus" size={24}/></button>}
        </div>
      </header>

      <main id="zx-main" ref={main} tabIndex={-1} className="zx-main"><div className="zx-content">{!online && <div className="zx-offline" role="status">You’re offline. Account operations need a connection. Existing device drafts remain available separately.</div>}{storageError && <div className="zx-alert" role="alert"><p>{storageError}</p><button onClick={exportData}>Export current data</button><button onClick={() => {localStorage.removeItem(STORAGE);storageSafe.current=true;setStorageError('');setData(structuredClone(initialData));}}>Reset local workspace</button></div>}<h1 className="zs-sr-only" ref={heading} tabIndex={-1}>{screenTitle(route)}</h1>{import.meta.env.MODE==='website'&&route.world==='lounge'&&!route.kind&&<DesktopLaunchpad launch={launch}/>}{deviceMode&&<div className="cw-device-banner"><strong>On this device · not your live account</strong><p>Existing drafts are preserved. Old examples may need review. Nothing here is automatically uploaded or delivered.</p><button onClick={()=>setDeviceMode(false)}>Return to your ZURI account</button></div>}{renderPage()}{deviceMode&&route.kind&&['space','society','event','ping','offer','chapter','person','order','enquiry-draft'].includes(route.kind)&&route.id&&<ConnectedActions key={'connections-'+routeHash(route)} source={{kind:route.kind as ObjectRef['kind'],id:route.id}} data={data} update={update} open={open} go={go} notify={notify}/>}</div></main>
    </div>{!route.kind&&theme.tabs.length>0&&<nav className="zx-tabs zn-app-dock" onPointerDownCapture={holdDock} onFocusCapture={holdDock} aria-label={`${theme.name} sections`}>{theme.tabs.map(t=><button key={t} aria-current={route.tab===t?'page':undefined} onClick={()=>go({world:route.world,tab:t})}><SectionGlyph name={t} active={route.tab===t}/><span>{t}</span></button>)}</nav>}{route.world==='lounge'&&!route.kind&&<nav className="zx-mobile-nav" onPointerDownCapture={holdDock} onFocusCapture={holdDock} aria-label="ZURI mobile destinations">{(Object.keys(worlds) as World[]).filter(w=>w!=='lounge').map(w => <button key={w} aria-current={route.world === w ? 'page' : undefined} onClick={() => launch(w)}><span style={{color:worlds[w].color}}><AppGlyph name={w}/><span className="zp-sr">{worlds[w].mark}</span></span>{worlds[w].name}</button>)}</nav>}<button className="zm-viola-orb" hidden={route.world==='lounge'||!!route.kind} onClick={()=>startViola()} aria-label="Open Viola" aria-haspopup="dialog">✦</button>
    <div className="zx-toast" role="status">{notice}</div>
    <ViolaWorkbox key={violaSession} notify={notify} visible={viola} canPublish={!deviceMode} onClose={closeViola} data={{...data,name:data.name==='Alex Kato'?'there':data.name}} update={update} open={open} go={go} input={aiInput} setInput={setAiInput} messages={aiMessages} intent={aiIntent} currentSpace={route.kind==='space'?route.id:undefined} onReset={resetViola} enabled={aiEnabled} busy={aiBusy} error={aiError} onAsk={()=>void submitAI()}/>
    {import.meta.env.MODE==='website'&&introductionOpen&&<AppIntroduction onClose={()=>setIntroductionOpen(false)} launch={launch}/>}
  </div>;
}
