import {placeSuggestions} from '../lib/geoapify-places';
import type {CloudEntity} from './cloudClient';

export type PamojaMapPoint={id:string;kind:'space'|'society'|'event'|'ping';title:string;location:string;latitude:number;longitude:number;visibility:string};
type Coordinates={latitude:number;longitude:number};

const mapKinds=new Set<PamojaMapPoint['kind']>(['space','society','event','ping']);
const geocodeCache=new Map<string,Coordinates>();
const number=(value:unknown)=>typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;
const locationOf=(entity:CloudEntity)=>String(entity.details.location||entity.details.address||entity.details.venue||'').trim().slice(0,180);
const isMappable=(entity:CloudEntity):entity is CloudEntity&{kind:PamojaMapPoint['kind']}=>mapKinds.has(entity.kind as PamojaMapPoint['kind'])&&entity.visibility==='public'&&entity.status!=='deleted';

function fromEntity(entity:CloudEntity&{kind:PamojaMapPoint['kind']},location:string,coordinates:Coordinates):PamojaMapPoint{
 return {id:entity.id,kind:entity.kind,title:entity.title,location,latitude:coordinates.latitude,longitude:coordinates.longitude,visibility:entity.visibility};
}

async function resolveOne(entity:CloudEntity&{kind:PamojaMapPoint['kind']},signal?:AbortSignal):Promise<PamojaMapPoint|null>{
 signal?.throwIfAborted();
 const location=locationOf(entity),latitude=number(entity.details.latitude),longitude=number(entity.details.longitude);
 if(Number.isFinite(latitude)&&Number.isFinite(longitude))return fromEntity(entity,location||'Published location',{latitude,longitude});
 if(!location)return null;
 const cacheKey=`${entity.id}:${entity.updated_at}:${location.toLowerCase()}`;
 const cached=geocodeCache.get(cacheKey);
 if(cached)return fromEntity(entity,location,cached);
 const requestController=new AbortController();
 const abort=()=>requestController.abort();
 signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,8000);
 try{
  const match=(await placeSuggestions(location,requestController.signal))[0];
  if(!match)return null;
  const coordinates={latitude:match.latitude,longitude:match.longitude};
  if(geocodeCache.size>=80)geocodeCache.delete(geocodeCache.keys().next().value!);
  geocodeCache.set(cacheKey,coordinates);
  return fromEntity(entity,location,coordinates);
 }catch(error){
  if(signal?.aborted)throw error;
  return null;
 }finally{
  clearTimeout(timer);
  signal?.removeEventListener('abort',abort);
 }
}

async function resolveInSmallBatches<T>(items:T[],work:(item:T)=>Promise<PamojaMapPoint|null>,limit=4){
 const results:(PamojaMapPoint|null)[]=new Array(items.length).fill(null);let next=0;
 await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
  while(next<items.length){const index=next++;results[index]=await work(items[index]);}
 }));
 return results.filter((point):point is PamojaMapPoint=>point!==null);
}

/** Resolves only public locations a creator deliberately chose to publish. */
export async function resolvePamojaMapPoints(entities:CloudEntity[],signal?:AbortSignal,onImmediate?:(points:PamojaMapPoint[])=>void):Promise<PamojaMapPoint[]>{
 const candidates=entities.filter(isMappable).slice(0,24);
 const immediate=candidates.flatMap(entity=>{
  const location=locationOf(entity),latitude=number(entity.details.latitude),longitude=number(entity.details.longitude);
  const coordinates=Number.isFinite(latitude)&&Number.isFinite(longitude)?{latitude,longitude}:geocodeCache.get(`${entity.id}:${entity.updated_at}:${location.toLowerCase()}`);
  return coordinates?[fromEntity(entity,location||'Published location',coordinates)]:[];
 });
 onImmediate?.(immediate);
 return resolveInSmallBatches(candidates,entity=>resolveOne(entity,signal));
}
