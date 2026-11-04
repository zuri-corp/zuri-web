import {type Source,safeLink} from './model';
export type Candidate={id:string;text:string;url:string;officialLinks:string[]};
export type Page={items:Candidate[];cursor:string|null;newestId:string|null;retryAt?:string};
export const connectorRegistry=Object.freeze({
  x:{role:'discovery',oauth:false,reason:'Server credentials, approved sources and explicit cost policy required.'},
  google_maps:{role:'venue',reason:'On-demand venue matching only; persist Place IDs, never geocoding payloads.'},
  quicket:{role:'discovery',disabled:true,reason:'Awaiting confirmation of permitted discovery API use, credentials and geographic coverage.'},
});
export function xQuery(source:Source) {
  if(source.mode==='account'){
    if(!/^[A-Za-z0-9_]{1,15}$/.test(source.query))throw Error('Invalid trusted account.');
    return `from:${source.query} -is:retweet -is:reply`;
  }
  if(source.mode!=='search'||source.query.length>320||!/^\((?:Uganda|Kampala|Jinja|Entebbe)(?: OR (?:Uganda|Kampala|Jinja|Entebbe))*\) \((?:jobs|hiring|vacancy|internship|scholarship|grants|workshop|conference|concert|meetup|collaboration|volunteer|services|offers)(?: OR (?:jobs|hiring|vacancy|internship|scholarship|grants|workshop|conference|concert|meetup|collaboration|volunteer|services|offers))*\)$/.test(source.query))throw Error('Use a scoped Uganda location and opportunity keyword query.');
  return `${source.query} -is:retweet -is:reply`;
}
export function retryTime(response:Response,failures:number,now:number) {
  const reset=Number(response.headers.get('x-rate-limit-reset'))*1000;
  const seconds=Number(response.headers.get('retry-after'))*1000;
  return new Date(Math.max(now+Math.min(3600000,60000*2**Math.min(failures,6)),Number.isFinite(reset)?reset:0,Number.isFinite(seconds)?now+seconds:0)).toISOString();
}
export async function fetchX(source:Source,token:string,fetcher:typeof fetch=fetch):Promise<Page> {
  const url=new URL('https://api.x.com/2/tweets/search/recent');
  url.searchParams.set('query',xQuery(source));url.searchParams.set('max_results','10');
  url.searchParams.set('tweet.fields','created_at,entities');
  if(source.since_id)url.searchParams.set('since_id',source.since_id);
  if(source.cursor)url.searchParams.set('next_token',source.cursor);
  const response=await fetcher(url,{headers:{Authorization:`Bearer ${token}`},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(response.status===429||response.status>=500)return {items:[],cursor:source.cursor,newestId:null,retryAt:retryTime(response,source.failures,Date.now())};
  if(!response.ok)throw Error(`X request rejected (${response.status}); review access in the provider console.`);
  const value=await response.json();
  if(value.errors?.length||value.data!==undefined&&!Array.isArray(value.data))throw Error('Incomplete X response.');
  return {items:(value.data??[]).slice(0,10).filter((p:{id?:unknown;text?:unknown})=>typeof p.id==='string'&&/^\d+$/.test(p.id)&&typeof p.text==='string').map((p:{id:string;text:string;entities?:{urls?:{expanded_url:string}[]}})=>({id:p.id,text:p.text,url:`https://x.com/i/web/status/${p.id}`,officialLinks:(p.entities?.urls??[]).map(u=>safeLink(u.expanded_url)).filter((s):s is string=>!!s)})),cursor:typeof value.meta?.next_token==='string'?value.meta.next_token:null,newestId:typeof value.meta?.newest_id==='string'?value.meta.newest_id:null};
}
export async function geocodeVenue(address:string,key:string,fetcher:typeof fetch=fetch) {
  if(!address.trim()||address.length>240)throw Error('A bounded venue address is required.');
  const url=new URL('https://maps.googleapis.com/maps/api/geocode/json');url.searchParams.set('address',address);url.searchParams.set('components','country:UG');url.searchParams.set('key',key);
  const response=await fetcher(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Venue lookup unavailable.');const data=await response.json();
  if(data.status==='ZERO_RESULTS')return null;
  if(data.status!=='OK')throw Error('Venue lookup unavailable.');
  const ids=(data.results??[]).filter((r:{partial_match?:boolean})=>!r.partial_match).map((r:{place_id?:string})=>r.place_id).filter((id:unknown)=>typeof id==='string');
  if(ids.length!==1)return null;
  // Do not return, persist, log, index or mix Google formatted addresses/coordinates into the opportunity graph.
  return {placeId:ids[0] as string,attribution:'Google Maps',verified:false};
}
export async function fetchQuicket():Promise<never>{throw Error(connectorRegistry.quicket.reason);}
