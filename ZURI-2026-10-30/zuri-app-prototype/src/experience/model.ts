import {validateNotifications,type NotificationState} from './notifications';
import {validDueDate} from './taskPlanning';
import {validateIntentRecords,type IntentRecord} from '../core/intents';
import {validateChannelDetails} from './channelModel';
import {validatePamoja,type PamojaData} from './pamojaModel';
import {pamojaRoutes} from './pamojaRoutes';
import type {Ping} from '../data/catalog';
export const worlds = {
  lounge: { name: 'Lounge', mark: '✦', color: '#b7a2ff', description: 'A little space. A lot of possibility.', tabs: [] },
  aura: { name: 'Aura', mark: '◎', color: '#00D4FF', description: 'Find your people. Feel your place.', tabs: ['Feed', 'Spaces', 'Societies', 'Find'] },
  motion: { name: 'Motion', mark: '↗', color: '#FF6B1A', description: 'Make room for what moves you.', tabs: ['Planner', 'Events', 'Pings'] },
  rizz: { name: 'Rizz', mark: '◈', color: '#FF2878', description: 'Put a little of yourself out there.', tabs: ['Feed', 'Create', 'Channels', 'Chats'] },
  lore: { name: 'Lore', mark: '◒', color: '#4B8CF7', description: 'Your life, beautifully collected.', tabs: ['Moments', 'Discover', 'Chapters', 'Profile'] },
} as const;
export type World = keyof typeof worlds;
export type Route = { world: World; tab: string; kind?: string; id?: string };
export const home: Route = { world: 'lounge', tab: '' };
const objectRoutes: Record<string,{world:World;tab:string}> = {
  'cloud-account':{world:'lore',tab:'Profile'},
  opportunities:{world:'motion',tab:'Events'},
  intent:{world:'lounge',tab:''},
 ...Object.fromEntries(Object.entries(pamojaRoutes).map(([kind,[world,tab]])=>[kind,{world:world as World,tab}])),
  space:{world:'aura',tab:'Spaces'},society:{world:'aura',tab:'Societies'},
  event:{world:'motion',tab:'Events'},trip:{world:'motion',tab:'Events'},ping:{world:'motion',tab:'Pings'},
  chat:{world:'rizz',tab:'Chats'},channel:{world:'rizz',tab:'Channels'},
  topic:{world:'aura',tab:'Societies'},
  'new-moment':{world:'lore',tab:'Moments'},'new-topic':{world:'aura',tab:'Societies'},'new-ping':{world:'motion',tab:'Pings'},
  'ping-chat':{world:'motion',tab:'Pings'},attend:{world:'motion',tab:'Events'},travel:{world:'motion',tab:'Events'},
  'new-channel':{world:'rizz',tab:'Channels'},'manage-channel':{world:'rizz',tab:'Channels'},
  person:{world:'lore',tab:'Profile'},moment:{world:'lore',tab:'Moments'},chapter:{world:'lore',tab:'Chapters'},
};
export function routeHash(route: Route) {
  const query = new URLSearchParams();
  if (route.kind && route.id) { query.set('kind', route.kind); query.set('id', route.id); }
  return `#/${route.world}${route.tab ? '/' + route.tab.toLowerCase() : ''}${query.size ? '?' + query : ''}`;
}
export function objectRoute(kind:string,id:string):Route{
 if(!Object.prototype.hasOwnProperty.call(objectRoutes,kind))return home;
 return {...objectRoutes[kind],...(kind==='travel'&&id.startsWith('ping:')?{tab:'Pings'}:{}),kind,id};
}
export function parseRoute(hash: string): Route {
  try {
    const url = new URL(hash.replace(/^#/, '') || '/', 'https://zuri.local');
    let [name, segment] = url.pathname.split('/').filter(Boolean);
    if(name==='xp')name='lore';
    if (!Object.prototype.hasOwnProperty.call(worlds, name)) return home;
    const world = name as World;
    const tabs: readonly string[] = worlds[world].tabs;
    const aliases:Record<string,string>={home:tabs[0]?.toLowerCase()||'',music:'channels',reels:'create',chat:world==='rizz'?'chats':tabs[0]?.toLowerCase()||'',events_list:'events',pings_list:world==='motion'?'pings':tabs[0]?.toLowerCase()||'',search:world==='aura'?'find':tabs[0]?.toLowerCase()||''};
    segment=aliases[segment]||segment;
    const tab = tabs.find(t => t.toLowerCase() === segment) || tabs[0] || '';
    const kind = url.searchParams.get('kind') || undefined;
    const id = url.searchParams.get('id') || undefined;
    if(kind&&id&&Object.prototype.hasOwnProperty.call(objectRoutes,kind))return objectRoute(kind,id);
    const legacy:Record<string,[string,string]>={space_detail:['space','spaceId'],society_detail:['society','societyId'],event_detail:['event','eventId'],ping_detail:['ping','pingId'],creator:['person','userId'],creator_detail:['person','userId']};
    if(Object.prototype.hasOwnProperty.call(legacy,segment)){const [type,key]=legacy[segment];const legacyId=url.searchParams.get(key);if(legacyId)return {...objectRoutes[type],kind:type,id:legacyId};}
    if(segment==='topic_chat')return url.searchParams.get('topicId')?objectRoute('topic',url.searchParams.get('topicId')!):{world:'aura',tab:'Societies'};
    return { world, tab };
  } catch { return home; }
}
export type ContextTag={kind:'space'|'society'|'event'|'ping'|'chapter';id:string};
export type Post = { chapterOnly?:boolean; id: string; text: string; created: string; image?: string;video?:string; spaceId?: string;tags?:ContextTag[] };
export type ObjectRef={kind:'space'|'society'|'event'|'ping'|'offer'|'chapter'|'person'|'order'|'enquiry-draft';id:string};
export type Task = { sourceRef?:ObjectRef; sourceMomentId?:string; id: string; text: string; done: boolean; date: string;chapterId?:string;dueDate?:string;assignee?:string;status?:'todo'|'doing'|'done' };
export type ChapterBlock={id:string;kind:'text'|'task'|'event';text?:string;taskId?:string;eventId?:string;created:string};
export type ChannelPost={sourceRef?:ObjectRef;video?:string;sourceMomentId?:string;id:string;text:string;image?:string;created:string;title?:string;sectionId?:string;pinned?:boolean;kind?:'update'|'progress'|'invitation'|'resource';tags?:ContextTag[]};
export type Channel={id:string;name:string;description:string;image?:string;spaceId?:string;ownerId:string;archived?:boolean;headline?:string;rhythm?:string;sections?:{id:string;name:string}[];links?:ContextTag[];posts:ChannelPost[]};
export type CommunityTopic={id:string;societyId:string;title:string;creatorId:string;participantIds:string[];replies:number;engaged:number;timestamp:string;isPinned:boolean;messages:{userId:string;text:string;time:string;image?:string}[];mode?:'topic'|'chat'};
export type AppPing=Ping&{endAt?:string;invitedIds?:string[];capacity?:number;locationLabel?:string;recurrence?:{frequency:'weekly';timeZone:'Africa/Kampala';exceptions:string[]}};
export type Message = { id: string; text: string; personId: string; created: string };
export type Automation = { id: string; name: string; enabled: boolean; lastRun?: string };
export type Presence={headline?:string;location?:string;capabilities?:string[];availability?:string;links?:{title:string;url:string}[];spaceIds?:string[]};
export type LocalData = {
  notifications?:NotificationState;
  intents?:IntentRecord[];
  chatWallpapers?:Record<string,'default'|'midnight'|'ocean'|'rose'|'forest'|'lake-photo'|'forest-photo'|'mountain-photo'>;
  presence?:Presence;
  avatar?:string;
  pamoja?:PamojaData;
  version: 2; name: string; bio: string; saved: string[]; joined: string[]; plan: string[];
  posts: Post[]; tasks: Task[]; messages: Message[]; liked: string[];
  automations: Automation[]; widgets: string[]; chapters: {id:string; title:string; momentIds:string[];links?:ObjectRef[];coverImage?:string;description?:string;blocks?:ChapterBlock[]}[];
  layoutVersion?: number;
  discussions?: {id:string;topicId:string;text:string;author:string;created:string;parentId?:string;image?:string}[];
  customPings?:AppPing[];pingJoins?:string[];customTopics?:CommunityTopic[];customChannels?:Channel[];attendance?:string[];
};
export const initialData: LocalData = { intents: [], version: 2, name: 'Your workspace', bio: '', saved: [], joined: [], plan: [], posts: [], tasks: [], messages: [], liked: [], automations: [], widgets: ['planner', 'friends', 'pings', 'lore', 'saved', 'automations'], chapters: [],layoutVersion:4,discussions:[],customPings:[],pingJoins:[],customTopics:[],customChannels:[],attendance:[] };
export function readData(raw: string | null): LocalData {
  if (!raw) return structuredClone(initialData);
  const value = JSON.parse(raw);
  if(value&&typeof value==='object')value.intents=validateIntentRecords(value.intents);
  if (value?.version !== 2 || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 60 || typeof value.bio !== 'string' || value.bio.length>300) throw new Error('Saved workspace has an unsupported format.');
  if(value.avatar!==undefined&&(typeof value.avatar!=='string'||value.avatar.length>800_000||value.avatar!==''&&!/^https:\/\/|^data:image\/(?:jpeg|png|webp);base64,/i.test(value.avatar)))throw new Error('Saved profile photo is invalid.');
  for (const key of ['saved', 'joined', 'plan', 'liked', 'widgets']) if (!Array.isArray(value[key]) || !value[key].every((x: unknown) => typeof x === 'string')) throw new Error('Saved workspace is incomplete.');
  for (const key of ['posts', 'tasks', 'messages', 'automations']) if (!Array.isArray(value[key]) || !value[key].every((x: unknown) => x && typeof x === 'object' && typeof (x as {id?: unknown}).id === 'string')) throw new Error('Saved records are incomplete.');
  if (!value.posts.every((x: Post) => typeof x.text === 'string' && typeof x.created === 'string') || !value.tasks.every((x: Task) => typeof x.text === 'string' && typeof x.done === 'boolean' && typeof x.date === 'string') || !value.messages.every((x: Message) => typeof x.text === 'string' && typeof x.personId === 'string' && typeof x.created === 'string') || !value.automations.every((x: Automation) => typeof x.name === 'string' && typeof x.enabled === 'boolean')) throw new Error('Saved record content is invalid.');
  for(const t of value.tasks)if(t.dueDate!==undefined&&(typeof t.dueDate!=='string'||!validDueDate(t.dueDate))||t.assignee!==undefined&&typeof t.assignee!=='string'||t.status!==undefined&&!['todo','doing','done'].includes(t.status))throw new Error('Invalid task planning fields.');
  for(const key of ['customPings','pingJoins','customTopics','customChannels','attendance'])value[key]??=[];
  for(const key of ['pingJoins','attendance'])if(!Array.isArray(value[key])||!value[key].every((id:unknown)=>typeof id==='string'))throw new Error('Saved participation is invalid.');
  if(!Array.isArray(value.customPings)||!value.customPings.every((p:AppPing)=>p&&['id','title','image','creatorId','spaceId','timestamp','description'].every(k=>typeof (p as unknown as Record<string,unknown>)[k]==='string')&&Array.isArray(p.participantIds)&&p.participantIds.every(id=>typeof id==='string')&&(p.invitedIds===undefined||Array.isArray(p.invitedIds)&&p.invitedIds.every(id=>typeof id==='string'))&&(p.capacity===undefined||Number.isSafeInteger(p.capacity)&&p.capacity>0)))throw new Error('Saved Pings are invalid.');
  if(!Array.isArray(value.customTopics)||!value.customTopics.every((t:CommunityTopic)=>t&&typeof t.id==='string'&&typeof t.title==='string'&&typeof t.societyId==='string'&&Array.isArray(t.messages)&&Array.isArray(t.participantIds)&&t.messages.every(m=>typeof m.userId==='string'&&typeof m.text==='string'&&typeof m.time==='string')))throw new Error('Saved topics are invalid.');
  if(!Array.isArray(value.customChannels)||!value.customChannels.every((c:Channel)=>c&&typeof c.id==='string'&&typeof c.name==='string'&&typeof c.description==='string'&&typeof c.ownerId==='string'&&Array.isArray(c.posts)&&c.posts.every(p=>typeof p.id==='string'&&typeof p.text==='string'&&typeof p.created==='string')))throw new Error('Saved channels are invalid.');
  const goodRef=(r:any)=>r&&['space','society','event','ping','offer','chapter','person','order','enquiry-draft'].includes(r.kind)&&typeof r.id==='string';
  if((value.chapters||[]).some((c:any)=>c.links!==undefined&&(!Array.isArray(c.links)||!c.links.every(goodRef)))||(value.tasks||[]).some((t:any)=>t.sourceRef!==undefined&&!goodRef(t.sourceRef))||(value.customChannels||[]).some((c:any)=>c.posts.some((p:any)=>p.sourceRef!==undefined&&!goodRef(p.sourceRef))))throw new Error('Saved source connections are invalid.');
  if(value.chatWallpapers!==undefined&&(!value.chatWallpapers||typeof value.chatWallpapers!=='object'||Array.isArray(value.chatWallpapers)||!Object.values(value.chatWallpapers).every(v=>['default','midnight','ocean','rose','forest','lake-photo','forest-photo','mountain-photo'].includes(v as string))))throw new Error('Saved chat wallpaper is invalid.');
  if(value.presence!==undefined){const p=value.presence;if(!p||typeof p!=='object'||[p.headline,p.location,p.availability].some(v=>v!==undefined&&typeof v!=='string')||[p.capabilities,p.spaceIds].some(v=>v!==undefined&&(!Array.isArray(v)||!v.every(x=>typeof x==='string')))||p.links!==undefined&&(!Array.isArray(p.links)||!p.links.every((l:{title:string;url:string})=>l&&typeof l.title==='string'&&typeof l.url==='string'&&/^https:\/\//i.test(l.url))))throw new Error('Saved public presence is invalid.');}
  for(const m of [...(value.discussions||[]),...value.customTopics.flatMap((t:CommunityTopic)=>t.messages)])if(m.image!==undefined&&(typeof m.image!=='string'||m.image.length>800000||!/^https:\/\/|^data:image\/(?:jpeg|png|webp);base64,/i.test(m.image)))throw new Error('Saved conversation photo is invalid.');
  value.chapters ??= [];
  value.discussions ??= [];
  if(!Array.isArray(value.discussions)||!value.discussions.every((d:Record<string,unknown>)=>d&&['id','topicId','text','author','created'].every(key=>typeof d[key]==='string')))throw new Error('Saved discussion replies are invalid.');
  if(value.discussions.some((d:{parentId?:unknown})=>d.parentId!==undefined&&typeof d.parentId!=='string'))throw new Error('Saved reply parent is invalid.');
  if(value.layoutVersion!==3&&value.layoutVersion!==4){value.widgets=[...new Set([...value.widgets,'pings','lore'])];value.layoutVersion=3;}
  if (!Array.isArray(value.chapters) || !value.chapters.every((c: {id:string;title:string;momentIds:string[]}) => c && typeof c.id === 'string' && typeof c.title === 'string' && Array.isArray(c.momentIds) && c.momentIds.every(id => typeof id === 'string'))) throw new Error('Saved chapters are invalid.');
  if(value.layoutVersion!==4){if(!value.widgets.includes('friends'))value.widgets.splice(value.widgets.includes('planner')?value.widgets.indexOf('planner')+1:0,0,'friends');value.layoutVersion=4;}
  for(const key of ['posts','tasks','messages','automations','chapters'])if(new Set(value[key].map((item:{id:string})=>item.id)).size!==value[key].length)throw new Error('A backup contains duplicate records.');
  for(const post of value.posts)if(post.image!==undefined&&(typeof post.image!=='string'||!/^https:\/\/|^data:image\/(?:jpeg|png|webp);base64,/i.test(post.image)))throw new Error('A saved photograph has an unsupported source.');
  for(const post of value.posts)if(post.chapterOnly!==undefined&&typeof post.chapterOnly!=='boolean')throw new Error('Invalid chapter media visibility.');
  for(const post of value.posts)if(post.spaceId!==undefined&&typeof post.spaceId!=='string')throw new Error('A saved Space reference is invalid.');
  for(const post of value.posts)if(post.video!==undefined&&(typeof post.video!=='string'||!/^data:video\/(?:mp4|webm);base64,/i.test(post.video)))throw new Error('Saved video is invalid.');
  for(const post of value.posts)if(post.tags!==undefined&&(!Array.isArray(post.tags)||!post.tags.every((t:ContextTag)=>t&&['space','society','event','ping','chapter'].includes(t.kind)&&typeof t.id==='string')))throw new Error('Saved context tags are invalid.');
  for(const chapter of value.chapters)if(chapter.coverImage!==undefined&&(typeof chapter.coverImage!=='string'||!/^https:\/\/|^data:image\/(?:jpeg|png|webp);base64,/i.test(chapter.coverImage)))throw new Error('Invalid chapter cover photo.');
  for(const chapter of value.chapters)if(chapter.blocks!==undefined&&(!Array.isArray(chapter.blocks)||!chapter.blocks.every((b:ChapterBlock)=>b&&typeof b.id==='string'&&typeof b.created==='string'&&(b.kind==='text'&&typeof b.text==='string'||b.kind==='task'&&typeof b.taskId==='string'||b.kind==='event'&&typeof b.eventId==='string'))))throw new Error('Saved chapter entries are invalid.');
  for(const ping of value.customPings)if(ping.recurrence!==undefined&&(ping.recurrence?.frequency!=='weekly'||ping.recurrence?.timeZone!=='Africa/Kampala'||!Array.isArray(ping.recurrence.exceptions)||!ping.recurrence.exceptions.every((day:unknown)=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day))))throw new Error('Invalid Ping recurrence.');
  for(const chapter of value.chapters)if(chapter.description!==undefined&&typeof chapter.description!=='string')throw new Error('Saved chapter description is invalid.');
  for(const ping of value.customPings)for(const key of ['locationLabel','societyId','eventId'])if(ping[key]!==undefined&&typeof ping[key]!=='string')throw new Error('Saved Ping context is invalid.');
  for(const channel of value.customChannels)validateChannelDetails(channel);
  for(const channel of value.customChannels)if(channel.archived!==undefined&&typeof channel.archived!=='boolean')throw new Error('Saved channel status is invalid.');
  for(const key of ['customPings','customTopics','customChannels'])if(new Set(value[key].map((item:{id:string})=>item.id)).size!==value[key].length)throw new Error('Saved records contain duplicate identifiers.');
  if(value.pamoja!==undefined)value.pamoja=validatePamoja(value.pamoja);
  if(value.notifications!==undefined)value.notifications=validateNotifications(value.notifications);
  return value as LocalData;
}
export function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export function runFocus(data: LocalData, date = today()): LocalData {
  const id = `focus-${date}`;
  return { ...data, tasks: data.tasks.some(t => t.id === id) ? data.tasks : [...data.tasks, { id, text: 'Choose one meaningful thing for today', date, done: false }], automations: data.automations.map(a => a.id === 'daily' ? { ...a, lastRun: date } : a) };
}
export function addMomentsToChapter(data:LocalData,id:string,title:string,momentIds:string[]):LocalData{
  const valid=[...new Set(momentIds)].filter(id=>data.posts.some(post=>post.id===id&&!!(post.image||post.video)));
  if(!valid.length)throw new Error('Choose at least one of your photo or video moments.');
  const existing=data.chapters.find(c=>c.id===id);
  if(!existing&&!title.trim())throw new Error('Give your chapter a name.');
  return {...data,chapters:existing?data.chapters.map(c=>c.id===id?{...c,momentIds:[...new Set([...c.momentIds,...valid])]}:c):[...data.chapters,{id,title:title.trim().slice(0,80),momentIds:valid}]};
}
