import ProfileWelcome from './ProfileWelcome';
import {AttachmentPreview,CropPhotoInput} from './SpaceUI';
import {VoiceButton} from './MobileWorlds';
import {zuriGreeting} from './ZuriGreeting';
import EntityEditor,{type EntityKind} from './EntityScreens';
import EntityCollection from './EntityCollection';
import CloudPlanner from './CloudPlanner';
import LoungeWidgets from './LoungeWidgets';
import type {AppPreferences} from './appPreferences';
import ObjectWorkspace from './ObjectWorkspace';
import CloudCreate from './CloudCreate';
import Conversation,{ChatInbox} from './Conversation';
import {WorldLoader} from './UsabilityUI';
import CloudPost from './CloudPost';
import CloudPublicProfile from './CloudPublicProfile';
import CloudFind from './CloudFind';
import CloudDiscovery from './CloudDiscovery';
import CloudLore from './CloudLore';
import CloudProfileView from './CloudProfileView';
import ExternalEventDetail from './ExternalEventDetail';
import {activeMembership} from './cloudModel';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {AppGlyph} from './AppGlyph';
import type {LocalData,Route} from './model';
import {backendEndpoint,opportunityEndpoint,websiteLoginUrl} from './services';
import OpportunityDiscovery from './OpportunityDiscovery';
import ExternalMotionEvents from './ExternalMotionEvents';
import GeoapifyBusinesses from './GeoapifyBusinesses'
import CloudEmailLogin from './CloudEmailLogin';
import {CloudError,cloudRequest,discoverCloud,cloudConfigured,requestSignIn,verifySignIn,signOutCloud,uploadCloud,downloadCloud,validRows,type CloudAccountState,type CloudRecord,type CloudEntity,type DirectoryItem} from './cloudClient';
type Props={preferences:AppPreferences;route:Route;data:LocalData;go:(r:Route)=>void;open:(kind:string,id:string)=>void;onDevice:()=>void;onViola:(text?:string)=>void;input:string;setInput:(s:string)=>void};
type Chat={id:string;state:string;members:{user_id:string;state:string}[]};
type Message={id:string;sender_id:string;body:string;created_at:string};
type CloudNotice={id:string;kind:string;reference_id:string|null;read_at:string|null;created_at:string};
const label=(r:CloudRecord)=>String(r.content.title||r.content.text||'Untitled');
function Empty({icon='lounge',title,children}:{icon?:string;title:string;children:React.ReactNode}){return <div className="cw-empty"><AppGlyph name={icon} size={36}/><h3>{title}</h3><p>{children}</p></div>;}
export default function CloudWorld(p:Props){
 const {route,go,open}=p;const [editingProfile,setEditingProfile]=useState(false);const [account,setAccount]=useState<CloudAccountState|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[records,setRecords]=useState<CloudRecord[]>([]),[entities,setEntities]=useState<CloudEntity[]>([]),[chats,setChats]=useState<Chat[]>([]),[messages,setMessages]=useState<Message[]>([]),[notifications,setNotifications]=useState<CloudNotice[]>([]),[files,setFiles]=useState<{id:string;mime:string;state:string;size_bytes:number}[]>([]),[query,setQuery]=useState(''),[results,setResults]=useState<DirectoryItem[]>([]),[searched,setSearched]=useState(false),[text,setText]=useState(''),[title,setTitle]=useState(''),[date,setDate]=useState(''),[selected,setSelected]=useState<CloudRecord|null>(null),[file,setFile]=useState<File|null>(null),[profilePhoto,setProfilePhoto]=useState<File|null>(null),[photoUrl,setPhotoUrl]=useState(''),[photoError,setPhotoError]=useState(''),[mediaId,setMediaId]=useState(''),[generation,setGeneration]=useState(0),[profile,setProfile]=useState({display_name:'',bio:'',handle:null as string|null,location:'',avatar_media_id:null as string|null,avatar_public:false,is_public:false,receive_invites:false,links:[] as {title:string;url:string}[]});
 const busyGate=useRef(false),alive=useRef(true),requestVersion=useRef(0),stableCreate=useRef({key:'',id:''}),pendingMessage=useRef({key:'',id:''});
 const entityKinds=['space','society','event','ping','channel'];
 const entityKind=route.kind?.startsWith('edit-')&&entityKinds.includes(route.kind.slice(5))?route.kind.slice(5):route.kind&&entityKinds.includes(route.kind)?route.kind:route.kind==='new-ping'?'ping':route.kind==='event-create'?'event':route.kind==='new-space'?'space':route.kind==='new-society'?'society':route.kind==='new-channel'?'channel':route.tab==='Spaces'?'space':route.tab==='Societies'?'society':route.tab==='Events'?'event':route.tab==='Pings'?'ping':route.tab==='Channels'?'channel':null;
 const recordKind=route.kind==='chapter'||route.world==='lore'&&route.tab==='Chapters'?'chapter':route.kind==='moment'||route.kind==='new-moment'||route.world==='lore'&&route.tab==='Moments'?'moment':route.world==='rizz'&&route.tab==='Create'?'draft':'task';
 const isCreate=['new-ping','event-create','new-space','new-society','new-channel','edit-space','edit-society','edit-event','edit-ping','edit-channel'].includes(route.kind||'');
 function resetPrivate(){setAccount(null);setRecords([]);setEntities([]);setChats([]);setMessages([]);setNotifications([]);setFiles([]);setSelected(null);setText('');setTitle('');setDate('');setMediaId('');setFile(null);setProfilePhoto(null);setPhotoUrl('');setPhotoError('');setProfile({display_name:'',bio:'',handle:null,location:'',avatar_media_id:null,avatar_public:false,is_public:false,receive_invites:false,links:[]});stableCreate.current={key:'',id:''};pendingMessage.current={key:'',id:''};}
 useEffect(()=>{alive.current=true;const changed=()=>{requestVersion.current++;resetPrivate();setGeneration(n=>n+1);};window.addEventListener('zuri-account-changed',changed);return()=>{alive.current=false;requestVersion.current++;window.removeEventListener('zuri-account-changed',changed);};},[]);
 useEffect(()=>{let cancelled=false;setLoading(true);setError('');cloudRequest<CloudAccountState>('account.get').then(async a=>{if(cancelled)return;if(!a||typeof a.user_id!=='string')throw Error('Your identity could not be verified.');setAccount(a);if(a.profile){setProfile({...a.profile,avatar_public:a.profile.avatar_public===true,location:a.profile.location??'',avatar_media_id:a.profile.avatar_media_id??null});if(a.profile.avatar_media_id){try{const url=await downloadCloud(a.profile.avatar_media_id);if(!cancelled)setPhotoUrl(url);}catch{if(!cancelled)setPhotoError('Your private profile photo could not be loaded.');}}}}).catch(e=>{if(!cancelled){resetPrivate();if(!(e instanceof CloudError&&e.status===401))setError(e.message);}}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[generation]);
 useEffect(()=>{setEditingProfile(false);requestVersion.current++;setRecords([]);setEntities([]);setChats([]);setMessages([]);setNotifications([]);setSelected(null);setText('');setTitle('');setNotice('');setError('');setFile(null);setMediaId('');busyGate.current=false;setBusy(false);if(account)void run(refresh);},[route.world,route.tab,route.kind,route.id,account?.user_id]);
 async function refresh(){if(!account)return;const v=requestVersion.current;const checks:Promise<void>[]=[];
 const collect=<T,>(action:string,payload:unknown,setter:(rows:T[])=>void)=>checks.push(cloudRequest(action,payload).then(rows=>{if(v===requestVersion.current&&alive.current)setter(validRows<T>(rows));}));
 if(!['chapter','moment','edit-task'].includes(route.kind||'')&&(route.world==='lounge'&&!route.kind||route.world==='motion'&&route.tab==='Planner'||route.world==='lore'&&['Moments','Chapters'].includes(route.tab)||route.world==='rizz'&&route.tab==='Create'))collect<CloudRecord>('records.list',{kind:recordKind},setRecords);
 if(route.kind&&['chapter','moment','edit-task'].includes(route.kind))checks.push(cloudRequest<CloudRecord>('records.get',{id:route.id}).then(row=>{if(v===requestVersion.current&&alive.current)setRecords(previous=>[row,...previous.filter(item=>item.id!==row.id)]);}));
 if(entityKind||route.world==='lounge'&&!route.kind)collect<CloudEntity>('entities.list',{},setEntities);
 
 
 if(route.kind==='notifications'||route.world==='lounge'&&!route.kind)collect<CloudNotice>('notifications.list',{},setNotifications);
 if(route.kind==='cloud-files')collect('media.list',{},setFiles);
 await Promise.all(checks);
 }
 async function run(work:()=>Promise<void>){if(busyGate.current)return;busyGate.current=true;const v=requestVersion.current;setBusy(true);setError('');setNotice('');try{await work();}catch(e){if(v===requestVersion.current&&alive.current){setError(e instanceof Error?e.message:'The operation was not confirmed.');if(e instanceof CloudError&&e.status===401){resetPrivate();setGeneration(n=>n+1);}}}finally{busyGate.current=false;if(alive.current)setBusy(false);}}
 const submit=(work:()=>Promise<void>)=>(e:FormEvent)=>{e.preventDefault();void run(work);};
 function idFor(key:string){const scoped=account?.user_id+':'+key;if(stableCreate.current.key!==scoped)stableCreate.current={key:scoped,id:crypto.randomUUID()};return stableCreate.current.id;}
 async function putRecord(){let attachment=mediaId;if(file&&!attachment){const uploaded=await uploadCloud(file);if(typeof uploaded.id!=='string')throw Error('Upload confirmation was incomplete.');attachment=uploaded.id;setMediaId(attachment);}const content={...(selected?.content||{}),...(recordKind==='task'?{text:text.trim(),done:selected?.content.done===true,date:selected?.content.date||new Date().toISOString().slice(0,10),...(date?{dueDate:date}:{})}:{title:title.trim(),text:text.trim(),...(attachment?{mediaId:attachment}:{})})};if(recordKind==='task'&&!text.trim()||recordKind!=='task'&&!title.trim())throw Error('Add a title or next step.');const id=selected?.id||idFor(JSON.stringify({kind:recordKind,content}));await cloudRequest('records.put',{id,kind:recordKind,revision:selected?.revision||0,content});stableCreate.current={key:'',id:''};setSelected(null);setText('');setTitle('');setDate('');setMediaId('');setNotice('Saved to your private ZURI workspace.');await refresh();}
 async function find(){setResults([]);setSearched(false);const rows=await discoverCloud(query);setResults(route.world==='lore'&&route.tab==='Discover'?rows.filter(r=>r.kind==='person'):rows);setSearched(true);}
 const signIn=<section className="cw-card"><AppGlyph name="Profile" size={32}/><h3>Join ZURI or sign in</h3><p>Find people and places, make plans together, and get a hand from Viola.</p>{backendEndpoint()?<a className="cw-primary" href={websiteLoginUrl('/app'+window.location.hash)} target="_top">Sign in or create an account <AppGlyph name="next" size={16}/></a>:cloudConfigured()?<CloudEmailLogin onRequest={requestSignIn} onVerify={verifySignIn}/>:<p>Account services are not configured for this build.</p>}</section>;

const search = (
  <section className="cw-search">
    <form onSubmit={submit(find)}>
      <label>
        {route.world==='lore'&&route.tab==='Discover'?'Find people by name or capability':'Find public people and communities'}
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          minLength={2}
          maxLength={100}
          required
          placeholder={route.world==='lore'?'A name, skill or capability':'A name, place or interest…'}
        />
      </label>

      <button className="cw-primary" disabled={busy}>
        {busy ? 'Searching…' : 'Search ZURI'}
        <AppGlyph name="Find" size={18} />
      </button>
    </form>

    {results
      .filter(r => !entityKind || r.kind === entityKind)
      .map(r => (
        <button
          className="cw-result"
          key={r.kind + r.id}
          onClick={() => open(r.kind==='person'?'person':r.kind,r.id)}
        >
          <span className="cw-result-icon">
            <AppGlyph
              name={
                r.kind === 'person' ? 'Profile' :
                r.kind === 'space' ? 'Spaces' :
                r.kind === 'society' ? 'Societies' :
                r.kind === 'ping' ? 'Pings' :
                r.kind === 'event' ? 'Events' :
                'Channels'
              }
            />
          </span>

          <span>
            <small>{r.kind}</small>
            <strong>{r.name}</strong>
            <p>
              {r.description || r.location || r.handle ||
                'Open introduction'}
            </p>
          </span>

          <AppGlyph name="next" size={18} />
        </button>
      ))}

    {searched &&
      !results.filter(r => !entityKind || r.kind === entityKind).length && (
        <Empty icon="Find" title="No ZURI listings found">
          Try a different name or fewer terms.
        </Empty>
      )}



  </section>
)

 const [welcomeDismissed,setWelcomeDismissed]=useState('');
 let body:React.ReactNode;
 if(route.kind==='opportunities')body=<OpportunityDiscovery endpoint={opportunityEndpoint()}/>;
 else if(route.kind==='external-event')body=<ExternalEventDetail id={route.id||''} onBack={()=>go({world:'motion',tab:'Events'})} onSignIn={()=>open('plan-event',route.id||'')} onPlanner={()=>go({world:'motion',tab:'Planner'})}/>;
 else if(route.kind==='device-review')body=<section className="cw-card"><h2>Keep what’s yours.</h2><p>Your existing device work has not been deleted or uploaded. Some older entries may be examples; ZURI cannot safely infer authorship from an ID or name.</p><p>Review and export the device workspace before selectively copying tasks through Your ZURI account. Existing images and text stay intact.</p><button className="cw-primary" onClick={p.onDevice}>Review device drafts</button></section>;
 else if(route.kind==='cloud-public')body=route.id?.startsWith('person:')?<CloudPublicProfile key={route.id} id={route.id.slice(7)} userId={account?.user_id} onOpen={open}/>:<ObjectWorkspace loadingWorld={route.world} id={route.id?.split(':')[1]||''} onOpen={open} onPlanner={()=>go({world:'motion',tab:'Planner'})}/>;
 else if(account&&(!account.profile?.display_name?.trim()||account.profile.display_name==='ZURI member')&&welcomeDismissed!==account.user_id)body=<ProfileWelcome key={account.user_id} account={account} onDone={saved=>{
  setWelcomeDismissed(account.user_id);
  if(saved){setAccount({...account,profile:saved});setProfile({...saved,avatar_public:saved.avatar_public===true});}
 }}/>;
 else if(route.world==='lounge'&&!route.kind)body=<><section className="zs-lounge-greeting"><small>{new Date().toLocaleDateString('en-UG',{weekday:'long',day:'numeric',month:'long',timeZone:'Africa/Kampala'})}</small><h2>{zuriGreeting(account?.profile?.display_name)}</h2><div className="zs-viola-compose"><form onSubmit={e=>{e.preventDefault();p.onViola(p.input);}}><input aria-label="Message Viola" value={p.input} onChange={e=>p.setInput(e.target.value)} placeholder="Message Viola…"/><VoiceButton onText={p.onViola} notify={setNotice}/><button aria-label="Open Viola"> <AppGlyph name="next" size={16}/></button></form></div></section>{!account&&!loading&&signIn}<LoungeWidgets signedIn={!!account} prefs={p.preferences} records={records} entities={entities} onOpen={open} go={go}/></>;

 else if(!account&&(route.scope==='owned'||!(!route.kind&&(route.world==='aura'||route.world==='lore'&&route.tab==='Discover'||route.world==='motion'&&route.tab==='Events'))))body=signIn;
 else if(route.kind==='plan-event')body=<ExternalEventDetail id={route.id||''} onBack={()=>go({world:'motion',tab:'Events'})} onSignIn={()=>{}} onPlanner={()=>go({world:'motion',tab:'Planner'})}/>;
 else if(route.kind==='post')body=<CloudPost id={route.id||''} onOpen={open}/>;
 else if(route.kind==='person')body=<CloudPublicProfile key={route.id} id={route.id||''} userId={account?.user_id} onOpen={open}/>;
 else if(route.kind==='channel-collection')body=<ObjectWorkspace loadingWorld={route.world} key={route.id} id={route.id?.split(':')[0]||''} initialCollection={route.id?.split(':')[1]} onOpen={open} onPlanner={()=>go({world:'motion',tab:'Planner'})}/>;
 else if(route.kind==='channel')body=<ObjectWorkspace loadingWorld={route.world} key={route.id} id={route.id||''} onOpen={open} onPlanner={()=>go({world:'motion',tab:'Planner'})}/>;
 else if(route.kind==='cloud-chat')body=<Conversation key={route.id} id={route.id||''} userId={account!.user_id}/>;
 else if(route.kind==='notifications')body=<><h2>Close to what matters.</h2><div className="cw-list">{notifications.map(n=><article className="cw-card" key={n.id}><small>{n.read_at?'Read':'Unread'} · {new Date(n.created_at).toLocaleDateString()}</small><h3>{n.kind==='message'?'A conversation has an update':n.kind==='conversation-invitation'?'A conversation invitation':n.kind.replace(/-/g,' ')}</h3><p>Private content stays in its source.</p><button className="cw-link" disabled={busy} onClick={()=>void run(async()=>{await cloudRequest('notifications.read',{id:n.id});await refresh();})}>Mark read</button>{n.reference_id&&<button className="cw-primary" onClick={()=>open(n.kind==='entity-invitation'?'entity':'cloud-chat',n.reference_id!)}>{n.kind==='entity-invitation'?'View invitation':'Open conversation'}</button>}</article>)}</div>{!notifications.length&&<Empty icon="bell" title="A quieter inbox.">Real account activity will appear here. Device reminders are kept separately.</Empty>}</>;
 else if(route.kind==='cloud-files')body=<section className="cw-card"><h2>Your private media</h2><p>Uploads stay private. Images, MP4 and PDF · up to 10 MB.</p><form onSubmit={submit(async()=>{if(!file)return;await uploadCloud(file);setFile(null);await refresh();setNotice('Upload confirmed.');})}><label>Choose a file<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button className="cw-primary" disabled={busy||!file}>Upload privately</button></form>{files.map(f=><article className="cw-result" key={f.id}><span><strong>{f.mime}</strong><small>{Math.ceil(f.size_bytes/1024)} KB · {f.state}</small></span>{f.state==='ready'&&<button className="cw-link" onClick={()=>void run(async()=>{const url=await downloadCloud(f.id);window.open(url,'_blank','noopener,noreferrer');})}>Open privately</button>}</article>)}</section>;
 else if(route.world==='rizz'&&route.tab==='Chats')body=<ChatInbox onOpen={open}/>;
 else if(route.kind==='cloud-account'||route.world==='lore'&&route.tab==='Profile')body=<><section className={editingProfile?'cw-card':'oc-profile-shell'}>{!editingProfile?<CloudProfileView userId={account?.user_id} onOpen={open} profile={account?.profile||profile} photoUrl={photoUrl} onEdit={()=>setEditingProfile(true)}/>:<><div className="cw-heading"><h2>Edit your profile</h2><button className="cw-link" onClick={()=>{setEditingProfile(false);setProfilePhoto(null);if(account?.profile)setProfile({...account.profile,avatar_public:account.profile.avatar_public===true,location:account.profile.location??'',avatar_media_id:account.profile.avatar_media_id??null});}}>Cancel</button></div><form onSubmit={submit(async()=>{setPhotoError('');let avatar_media_id=profile.avatar_media_id;if(profilePhoto)avatar_media_id=(await uploadCloud(profilePhoto)).id;const v=await cloudRequest<NonNullable<CloudAccountState['profile']>>('profile.save',{...profile,avatar_media_id});setProfile({...v,avatar_public:v.avatar_public===true,location:v.location??'',avatar_media_id:v.avatar_media_id??null});setProfilePhoto(null);if(v.avatar_media_id){try{setPhotoUrl(await downloadCloud(v.avatar_media_id));}catch{setPhotoError('Your profile was saved, but its private photo preview could not be loaded.');}}else setPhotoUrl('');setAccount(a=>a?{...a,profile:v}:a);setEditingProfile(false);setNotice('Your profile is saved.');})}><label>Name<input value={profile.display_name} required maxLength={80} onChange={e=>setProfile({...profile,display_name:e.target.value})}/></label><label>About you<textarea value={profile.bio} maxLength={600} onChange={e=>setProfile({...profile,bio:e.target.value})}/></label><label>Handle<input pattern="[a-z0-9][a-z0-9_\-]{2,39}" value={profile.handle||''} onChange={e=>setProfile({...profile,handle:e.target.value||null})}/></label><label>Location<input value={profile.location} maxLength={100} onChange={e=>setProfile({...profile,location:e.target.value})}/></label><fieldset><legend>Links</legend>{profile.links.map((item,index)=><div key={index}><label>Title<input maxLength={80} value={item.title} onChange={e=>setProfile({...profile,links:profile.links.map((link,i)=>i===index?{...link,title:e.target.value}:link)})}/></label><label>HTTPS URL<input type="url" pattern="https://.*" maxLength={500} value={item.url} onChange={e=>setProfile({...profile,links:profile.links.map((link,i)=>i===index?{...link,url:e.target.value}:link)})}/></label><button className="cw-link" type="button" onClick={()=>setProfile({...profile,links:profile.links.filter((_,i)=>i!==index)})}>Remove link</button></div>)}{profile.links.length<12&&<button className="cw-link" type="button" onClick={()=>setProfile({...profile,links:[...profile.links,{title:'',url:''}]})}>Add a link</button>}</fieldset><label>Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setProfilePhoto(e.target.files?.[0]??null)}/></label>{photoUrl&&!profilePhoto&&<img src={photoUrl} alt="Your private profile photo" width="96" height="96"/>}{profilePhoto&&<p>{profilePhoto.name} uploads privately when you save.</p>}{profile.avatar_media_id&&<button className="cw-link" type="button" onClick={()=>{setProfile({...profile,avatar_media_id:null});setProfilePhoto(null);setPhotoUrl('');}}>Remove profile photo</button>}<label className="cw-check"><input type="checkbox" checked={profile.avatar_public===true} onChange={e=>setProfile({...profile,avatar_public:e.target.checked})}/>Show my profile photo when I host a Ping</label><label className="cw-check"><input type="checkbox" checked={profile.is_public} onChange={e=>setProfile({...profile,is_public:e.target.checked,receive_invites:e.target.checked?profile.receive_invites:false})}/>Make my profile public</label><label className="cw-check"><input type="checkbox" checked={profile.receive_invites} disabled={!profile.is_public} onChange={e=>setProfile({...profile,receive_invites:e.target.checked})}/>Allow conversation requests</label><button disabled={busy} className="cw-primary">Save profile choices</button></form></>}{photoError&&<p className="zx-alert" role="alert">{photoError}</p>}<p>Membership: {activeMembership(account?.membership)?account!.membership!.plan:'No active paid entitlement'}</p></section><button className="cw-result" onClick={()=>open('cloud-files','home')}><AppGlyph name="Moments"/>Your private files<AppGlyph name="next"/></button><button className="cw-result" onClick={()=>open('device-review','home')}><AppGlyph name="Chapters"/>Review device work<AppGlyph name="next"/></button><button className="cw-link" onClick={()=>void run(async()=>{try{await signOutCloud();}finally{requestVersion.current++;resetPrivate();setGeneration(n=>n+1);}})}>Sign out</button></>;
 else if(isCreate&&entityKind)body=<EntityEditor key={route.kind+':'+route.id} kind={entityKind as EntityKind} id={route.kind?.startsWith('edit-')?route.id:undefined} parent={route.id?.startsWith('parent:')?{id:route.id.split(':')[1],visibility:route.id.split(':')[2]}:undefined} onCancel={()=>go({world:route.world,tab:route.tab})} onCreated={created=>open(created.kind,created.id)}/>;
 else if(route.kind&&['space','society','event','ping','entity'].includes(route.kind))body=<ObjectWorkspace loadingWorld={route.world} key={route.id} id={route.id||''} onOpen={open} onPlanner={()=>go({world:'motion',tab:'Planner'})}/>;
 else if(entityKind)body=<EntityCollection key={entityKind+':'+(route.scope||'all')+':'+(route.searchTerm||'')+':'+(route.searchArea||'')} initialQuery={route.searchTerm} initialArea={route.searchArea} kind={entityKind as EntityKind} entities={entities} ownerId={route.scope==='owned'?account?.user_id:undefined} onBrowseAll={route.scope==='owned'?()=>go({world:'aura',tab:route.tab}):undefined} onOpen={open}>{entityKind==='event'?<ExternalMotionEvents onOpen={id=>open('external-event',id)}/>:undefined}</EntityCollection>;

 else if(route.world==='lore'&&['Moments','Chapters'].includes(route.tab))body=<CloudLore key={route.kind+':'+route.id} route={route} records={records} busy={busy} onOpen={open} onRun={run} onBack={()=>go({world:'lore',tab:route.tab})} onDelete={async record=>{await cloudRequest('records.delete',{id:record.id,revision:record.revision});await refresh();if(route.kind==='moment')go({world:'lore',tab:'Moments'});}} onSave={async(record,content,attachment)=>{if(!String(content.title||'').trim())throw Error('Give your '+recordKind+' a title.');let attached=mediaId;if(attachment&&!attached){attached=(await uploadCloud(attachment)).id;setMediaId(attached);}const next={...content,...(attached?{mediaId:attached,...(attachment?{mime:attachment.type}:{})}:{})};const saved=await cloudRequest<CloudRecord>('records.put',{id:record?.id||idFor(JSON.stringify({kind:recordKind,content:next})),kind:recordKind,revision:record?.revision||0,content:next});stableCreate.current={key:'',id:''};setMediaId('');setNotice('Saved privately.');if(!record)open(recordKind,saved.id);else await refresh();}}/>;
 else if(route.kind==='people-find')body=<><p className="zs-lead">Find people by what they can do.</p>{search}</>;
 else if(route.world==='lore'&&route.tab==='Discover')body=<><header><p className="zs-lead">Find people by what they can do.</p></header>{search}</>;
 else if(route.world==='motion'&&route.tab==='Planner')body=<CloudPlanner onOpen={open} key={route.kind+':'+route.id} id={route.kind==='edit-task'?route.id:undefined} creating={route.kind==='new-task'} records={records} busy={busy} onCancel={()=>go({world:'motion',tab:'Planner'})} onEdit={id=>open('edit-task',id)} onRun={run} onSave={async(record,content)=>{await cloudRequest('records.put',{id:record?.id||idFor(JSON.stringify(content)),kind:'task',revision:record?.revision||0,content});stableCreate.current={key:'',id:''};go({world:'motion',tab:'Planner'});}} onToggle={async record=>{await cloudRequest('records.put',{id:record.id,kind:'task',revision:record.revision,content:{...record.content,done:!record.content.done}});await refresh();}}/>;
 else if(route.world==='rizz'&&route.tab==='Create')body=<CloudCreate userId={account!.user_id} drafts={records} onOpen={open}/>;
 else if((route.world==='rizz'&&route.tab==='Feed')||(route.world==='aura'&&route.tab==='Feed'&&account))body=<CloudDiscovery world={route.world} onOpen={open}/>;
 else if(route.world==='motion'&&route.tab==='Planner'||route.world==='lore'&&['Moments','Chapters'].includes(route.tab)||route.world==='rizz'&&route.tab==='Create')body=<><h2>{recordKind==='task'?'Make space for what matters.':recordKind==='chapter'?'A chapter of your own.':recordKind==='moment'?'Keep a moment.':'Prepare something worth sharing.'}</h2><section className="cw-card"><form onSubmit={submit(putRecord)}>{recordKind!=='task'&&<label>Title<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label>}<label>{recordKind==='task'?'Your next step':'Text'}<textarea required={recordKind==='task'} maxLength={4000} value={text} onChange={e=>setText(e.target.value)}/></label>{recordKind==='task'&&<label>Due date · optional<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>}{recordKind!=='task'&&<div><CropPhotoInput label="Add media · optional" video ratio={4/3} onChange={attachment=>{setFile(attachment);setMediaId('');}}/>{file&&<AttachmentPreview file={file} disabled={busy} onRemove={()=>{setFile(null);setMediaId('');}}/>}{mediaId&&<small>A private attachment is connected.</small>}<button type="button" className="cw-link" onClick={()=>open('cloud-files','home')}>Manage private media</button></div>}<small>Private</small><button disabled={busy} className="cw-primary">{selected?'Save revision':'Save privately'}</button>{selected&&<button type="button" className="cw-link" onClick={()=>{setSelected(null);setText('');setTitle('');setDate('');}}>Cancel editing</button>}</form></section>{records.map(r=><article className="cw-card" key={r.id}><small>Private · revision {r.revision}</small><h3>{label(r)}</h3>{r.kind==='task'?<label className="cw-check"><input type="checkbox" checked={r.content.done===true} disabled={busy} onChange={()=>void run(async()=>{await cloudRequest('records.put',{id:r.id,revision:r.revision,kind:r.kind,content:{...r.content,done:!r.content.done}});await refresh();})}/>Completed</label>:<p>{String(r.content.text||'')}</p>}{Boolean(r.content.mediaId)&&<button className="cw-link" onClick={()=>void run(async()=>{const url=await downloadCloud(String(r.content.mediaId));window.open(url,'_blank','noopener,noreferrer');})}>Open private attachment</button>}<button className="cw-link" onClick={()=>{setSelected(r);setTitle(String(r.content.title||''));setText(String(r.content.text||''));setDate(String(r.content.dueDate||''));setMediaId(String(r.content.mediaId||''));}}>Edit</button></article>)}{!records.length&&<Empty icon={route.tab} title="A fresh page.">Your own work will appear here when you save it.</Empty>}</>;else if (
  route.world === 'aura' &&
  route.tab === 'Find'
) {
  body = (
    <>
      <CloudFind key={(route.searchTerm||'')+':'+(route.searchArea||'')} initialQuery={route.searchTerm} area={route.searchArea} category={route.placeCategory} onOpen={open}/>
    </>
  )
}
 else body=<><Empty icon={route.world==='aura'?'aura':route.world} title={route.world==='aura'?'From your real world.':'Nothing published here yet.'}>Public feeds only show content whose author chose to publish it. No sample posts fill this space.</Empty>{search}<button className="cw-link" onClick={()=>open('opportunities','home')}>Explore external opportunities</button></>;
 return <div className="cw-world" aria-busy={loading||busy}>{error&&<div className="cw-error" role="alert"><strong>{error}</strong><p>{error.includes('revision')||error.includes('changed')?'Refresh the current version before trying again. Your edits have not overwritten it.':'Your changes are still here. Try again when connected.'}</p><button disabled={busy} onClick={()=>account?void run(refresh):setGeneration(n=>n+1)}>Retry / refresh</button></div>}{notice&&<p className="cw-notice" role="status">{notice}</p>}{loading?<WorldLoader world={route.world} label="Opening your workspace…"/>:body}</div>;
}
function PublicIntroduction({id,initial,account,busy,run,onNotice,go}:{id:string;initial?:DirectoryItem;account:CloudAccountState|null;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;onNotice:(s:string)=>void;go:Props['go']}){
 const [item,setItem]=useState<DirectoryItem|null>(null),[error,setError]=useState('');
 const [kind,key]=id.split(':');
 useEffect(()=>{let current=true;if(initial)discoverCloud(initial.name).then(rows=>{if(current)setItem(rows.find(r=>r.id===key&&r.kind===kind)||null);}).catch(e=>{if(current)setError(e.message);});return()=>{current=false;};},[id,initial?.name]);
 return <section className="cw-card">
  <small>PUBLIC INTRODUCTION</small>
  <h2>{item?.name||'Open a verified introduction'}</h2>
  <p>{item?.description||'Search the current public directory to refresh this listing before connecting.'}</p>
  {(item?.handle||item?.location)&&<p>{item.handle&&`@${item.handle}`}{item.handle&&item.location?' · ':''}{item.location}</p>}
  {item?.links?.map((link,index)=><p key={`${link.url}-${index}`}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.title||link.url}</a></p>)}
  <form onSubmit={e=>{e.preventDefault();const query=String(new FormData(e.currentTarget).get('query')||'');void run(async()=>{const rows=await discoverCloud(query),found=rows.find(r=>r.id===key&&r.kind===kind);setItem(found||null);setError(found?'':'This listing is unavailable.');});}}>
   <label>Confirm the public name<input name="query" required minLength={2} maxLength={100}/></label>
   <button className="cw-primary" disabled={busy}>Refresh introduction</button>
  </form>
  {error&&<p role="alert">{error}</p>}
  {item&&account&&kind==='channel'&&<button className="cw-primary" onClick={()=>go({world:'rizz',tab:'Channels',kind:'channel',id:key})}>Open channel</button>}
  {item&&account&&<button className="cw-primary" disabled={busy||key===account.user_id} onClick={()=>void run(async()=>{if(kind==='person'){await cloudRequest('chats.invite',{user_id:key});onNotice('Conversation invitation saved. The person chooses whether to accept.');}else{const result=await cloudRequest('entities.join',{id:key});onNotice(result.state==='active'?'You are in.':'Your request has been sent.');}})}>{kind==='person'?'Request a conversation':'Request to join'}</button>}
  {!account&&<button className="cw-link" onClick={()=>go({world:'lore',tab:'Profile'})}>Sign in to connect</button>}
 </section>;
}
