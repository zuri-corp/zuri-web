import type {CloudEntity} from './cloudClient';
import {placeSuggestions,placeLocation,type PlaceCategory} from '../lib/geoapify-places';

export type AuraSearch={mode:'places'|'spaces';term:string;area:string;category:PlaceCategory};
const categories:Record<string,PlaceCategory>={restaurant:'restaurants',restaurants:'restaurants',cafe:'cafes',cafes:'cafes','coffee shops':'cafes',hotel:'hotels',hotels:'hotels',shops:'shops',hospital:'hospitals',hospitals:'hospitals',banks:'banks',gyms:'sports'};
export function auraSearch(text:string):AuraSearch|null {
 const natural=text.trim().toLowerCase();
 // Questions such as “is there a church near me on ZURI?” should search the
 // ZURI Space directory before falling back to a generic conversational reply.
 if(/\b(?:church|mosque|temple|fellowship|ministry)\b/.test(natural)&&/\b(?:zuri|near me|nearby|join)\b/.test(natural)){
  const area=(text.match(/\b(?:in|around|near)\s+([^?.!]+)/i)?.[1]||'').trim().slice(0,80);
  return {mode:'spaces',term:text.match(/\b(church|mosque|temple|fellowship|ministry)\b/i)?.[1]||'church',area,category:'all'};
 }
 const match=text.trim().match(/^(?:(?:can|could) you\s+)?(?:find|search(?: for)?|look for|show(?: me)?|browse)\s+(.+?)[?.!]*$/i);
 if(!match)return null;
 const parts=match[1].split(/\s+(?:in|around|near)\s+/i);
 const area=parts.slice(1).join(' ').trim().slice(0,80);
 const subject=parts[0].replace(/^(?:me\s+)?(?:a |an |some |the )?/i,'').trim();
 const spaces=/\bspaces?\b/i.test(subject);
 const term=subject.replace(/\b(?:zuri\s+)?spaces?\b/ig,'').trim().slice(0,100);
 const category=categories[term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')]||'all';
 if(!spaces&&category==='all'&&!area)return null;
 if(!spaces&&/\b(?:people|developers?|devs|societ(?:y|ies)|events?|pings?|jobs?|mentors?|designers?|workshops?|concerts?)\b/i.test(subject))return null;
 return {mode:spaces?'spaces':'places',term,area:area==='me'?'':area,category};
}
export function matchesArea(entity:CloudEntity,area:string){
 return !area||String(entity.details.location||'').toLowerCase().includes(area.toLowerCase());
}
export async function resolvePlaceArea(area:string,signal:AbortSignal){
 if(!area||area.toLowerCase()===placeLocation.name.toLowerCase())return placeLocation;
 const results=await placeSuggestions(area,signal);
 if(!results.length)throw Error('I couldn’t find that area. Try its town or district name.');
 return results.find(row=>row.name.toLowerCase()===area.toLowerCase())||results[0];
}
