import type {Channel,ChannelPost,ContextTag,LocalData} from './model';
const kinds=['update','progress','invitation','resource'];
function tagsValid(tags:unknown):boolean{return Array.isArray(tags)&&tags.every((t:ContextTag)=>t&&['space','society','event','ping','chapter'].includes(t.kind)&&typeof t.id==='string');}
export function validateChannelDetails(c:Channel){
 if([c.headline,c.rhythm].some(v=>v!==undefined&&typeof v!=='string'))throw new Error('Invalid channel introduction.');
 if(c.sections!==undefined&&(!Array.isArray(c.sections)||c.sections.length>12||!c.sections.every(s=>s&&typeof s.id==='string'&&typeof s.name==='string'&&s.name.trim())||new Set(c.sections.map(s=>s.id)).size!==c.sections.length))throw new Error('Invalid channel collections.');
 if(c.links!==undefined&&!tagsValid(c.links))throw new Error('Invalid channel links.');
 for(const p of c.posts){if([p.title,p.sectionId,p.sourceMomentId,p.video].some(v=>v!==undefined&&typeof v!=='string')||p.pinned!==undefined&&typeof p.pinned!=='boolean'||p.kind!==undefined&&!kinds.includes(p.kind)||p.tags!==undefined&&!tagsValid(p.tags)||p.sectionId&&!c.sections?.some(s=>s.id===p.sectionId))throw new Error('Invalid organised channel update.');}
}
export function editChannel(d:LocalData,id:string,fn:(c:Channel)=>Channel):LocalData{
 const c=d.customChannels?.find(c=>c.id===id);if(!c||c.ownerId!=='me')throw new Error('Only your own channel can be changed.');const next=fn(c);validateChannelDetails(next);return {...d,customChannels:d.customChannels!.map(c=>c.id===id?next:c)};
}
export function saveChannelPost(d:LocalData,id:string,post:ChannelPost){return editChannel(d,id,c=>{if(c.archived)throw new Error('Restore this channel before publishing.');if(!post.text.trim())throw new Error('Write an update first.');return {...c,posts:c.posts.some(p=>p.id===post.id)?c.posts.map(p=>p.id===post.id?post:p):[post,...c.posts]};});}
export function addCollection(d:LocalData,id:string,name:string){return editChannel(d,id,c=>{const clean=name.trim();if(!clean)throw new Error('Name the collection.');if(c.sections?.some(s=>s.name.toLowerCase()===clean.toLowerCase()))throw new Error('This collection already exists.');return {...c,sections:[...(c.sections||[]),{id:crypto.randomUUID(),name:clean.slice(0,40)}]};});}
