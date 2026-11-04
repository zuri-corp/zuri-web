export type DirectoryItem={id:string;name:string;kind:string;description?:string;location?:string;handle?:string;links?:{title:string;url:string}[]};
function publicLinks(value:unknown){
 if(!Array.isArray(value))return [];
 return value.flatMap((item:unknown)=>{
  if(typeof item!=='object'||item===null||!('title' in item)||!('url' in item))return [];
  const {title,url}=item;
  if(typeof title!=='string'||typeof url!=='string'||!/^https:\/\/[^/@\s]+(?:[/?#].*)?$/.test(url))return [];
  return [{title,url}];
 }).slice(0,12);
}
export function normalizeDirectory(value:unknown):DirectoryItem[]{
 if(!Array.isArray(value))throw Error('Discovery returned an invalid result.');
 return value.flatMap(r=>{if(!r||typeof r!=='object'||typeof r.id!=='string'||typeof r.name!=='string')return [];const kind=r.kind==='entity'?r.entity_kind:r.kind;if(!['space','society','channel','event','ping','person'].includes(kind))return [];const links=publicLinks(r.links);return [{id:r.id,name:r.name,kind,...(typeof r.description==='string'?{description:r.description}:{}),...(typeof r.location==='string'?{location:r.location}:{}),...(typeof r.handle==='string'?{handle:r.handle}:{}),...(links.length?{links}:{})}];});
}
export function activeMembership(value:{plan:string;status:string;valid_until?:string}|undefined,now=Date.now()){return !!value&&value.status==='active'&&(!value.valid_until||Number.isFinite(Date.parse(value.valid_until))&&Date.parse(value.valid_until)>now);}
