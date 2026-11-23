import {placeSuggestions} from '../lib/geoapify-places';
import type {CloudEntity} from './cloudClient';

export type PamojaMapPoint={id:string;kind:'space'|'event'|'ping';title:string;location:string;latitude:number;longitude:number;visibility:string};
const number=(value:unknown)=>typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;
const locationOf=(entity:CloudEntity)=>String(entity.details.location||entity.details.address||'').trim().slice(0,180);

/** Resolves only locations a creator chose to publish; descriptions, media and chats never leave ZURI. */
export async function resolvePamojaMapPoints(entities:CloudEntity[],signal?:AbortSignal):Promise<PamojaMapPoint[]>{
 const candidates=entities.filter((entity):entity is CloudEntity&{kind:'space'|'event'|'ping'}=>['space','event','ping'].includes(entity.kind)).slice(0,16),points:PamojaMapPoint[]=[];
 for(const entity of candidates){
  signal?.throwIfAborted();const location=locationOf(entity),latitude=number(entity.details.latitude),longitude=number(entity.details.longitude);
  if(location&&Number.isFinite(latitude)&&Number.isFinite(longitude)){points.push({id:entity.id,kind:entity.kind,title:entity.title,location,latitude,longitude,visibility:entity.visibility});continue;}
  if(!location)continue;
  try{const match=(await placeSuggestions(location,signal))[0];if(match)points.push({id:entity.id,kind:entity.kind,title:entity.title,location,latitude:match.latitude,longitude:match.longitude,visibility:entity.visibility});}catch(error){if((error as DOMException).name==='AbortError')throw error;}
 }
 return points;
}
