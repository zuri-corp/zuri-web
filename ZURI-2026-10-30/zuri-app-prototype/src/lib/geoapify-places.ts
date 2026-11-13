import publicConfig from '../data/publicBackend.json' with {type:'json'};
import {resolvePublicConnection} from './publicConnection';
import type {PublicConnection} from './publicConnection';
export const placeCategories=[{value:'all',label:'All places'},{value:'restaurants',label:'Restaurants'},{value:'cafes',label:'Cafés'},{value:'hotels',label:'Hotels'},{value:'shops',label:'Shops'},{value:'hospitals',label:'Hospitals'},{value:'banks',label:'Banks'},{value:'sports',label:'Sports'}] as const;
export type PlaceCategory=typeof placeCategories[number]['value'];
export type Business={id:string;name:string;address:string;category:string;latitude:number;longitude:number;source:'Geoapify';claimed:false};
export const placeLocation={name:'Kampala',latitude:0.3476,longitude:32.5825} as const;
const text=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';
const coordinate=(value:unknown)=>typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;
export class PlacesError extends Error{constructor(message:string,public status=0){super(message);this.name='PlacesError';}}
export function normalizeBusinesses(payload:unknown,category:PlaceCategory):Business[]{
 if(!payload||typeof payload!=='object'||!Array.isArray((payload as {businesses?:unknown}).businesses))throw new PlacesError('The place service returned an unreadable list. Please try again.');
 const rows=(payload as {businesses:unknown[]}).businesses,seen=new Set<string>(),result:Business[]=[];
 for(const row of rows.slice(0,100)){
  if(!row||typeof row!=='object')continue;const value=row as Record<string,unknown>;
  const id=text(value.id,512),name=text(value.name,240),latitude=coordinate(value.latitude),longitude=coordinate(value.longitude);
  if(!id||!name||/^(?:unnamed(?: place)?|unknown)$/i.test(name)||!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180||seen.has(id))continue;
  seen.add(id);result.push({id,name,address:text(value.address,600),category:text(value.category,100)||category,latitude,longitude,source:'Geoapify',claimed:false});
 }
 return result;
}
export function directionsUrl(place:Pick<Business,'latitude'|'longitude'>){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.latitude+','+place.longitude)}`;}
export function createPlacesLookup(config:PublicConnection,fetcher:typeof fetch=fetch,clock=()=>Date.now()){
 const cache=new Map<PlaceCategory,{until:number;items:Business[]}>(),pending=new Map<PlaceCategory,Promise<Business[]>>();
 async function get(category:PlaceCategory,options:{signal?:AbortSignal;refresh?:boolean}={}){
  if(!placeCategories.some(item=>item.value===category))throw new PlacesError('Choose a supported place category.');
  options.signal?.throwIfAborted();
  const cached=cache.get(category);let result:Business[];
  if(cached&&cached.until>clock()&&!options.refresh)result=cached.items;
  else{
   let task=pending.get(category);
   if(!task){task=(async()=>{
    let response:Response;
    try{response=await fetcher(config.url+'/functions/v1/geoapify-places',{method:'POST',credentials:'omit',redirect:'error',headers:{apikey:config.publishableKey,Authorization:'Bearer '+config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({category,latitude:placeLocation.latitude,longitude:placeLocation.longitude}),signal:AbortSignal.timeout(15000)});}catch{throw new PlacesError('The places service could not be reached. Check your connection and try again.');}
    if(!response.ok){const status=response.status;throw new PlacesError(status===429?'Place lookup is busy or its usage limit has been reached. Please try later.':status===401||status===403?'The place service rejected this connection. Check the deployed function and allowed website origin.':status===404?'The geoapify-places function is not available in this project.':'Places are temporarily unavailable. Please try again.',status);}
    let payload:unknown;try{payload=await response.json();}catch{throw new PlacesError('The place service returned an unreadable response. Please try again.');}
    if(payload&&typeof payload==='object'&&'error'in payload)throw new PlacesError('The places provider could not complete this lookup. Please try later.');
    const items=normalizeBusinesses(payload,category);cache.set(category,{until:clock()+5*60*1000,items});return items;
   })();pending.set(category,task);void task.finally(()=>pending.delete(category)).catch(()=>{});}
   result=await task;
  }
  options.signal?.throwIfAborted();return result;
 }
 return get;
}

type PlaceSearch={query?:string;category?:PlaceCategory;latitude?:number;longitude?:number;radius?:number;offset?:number};
type PlacePage={businesses:Business[];next_offset:number|null};
const pageCache=new Map<string,{until:number;value:PlacePage}>();
async function publicPlaceRequest(body:unknown,signal?:AbortSignal){
 const config=resolvePublicConnection(import.meta.env,publicConfig);
 const response=await fetch(config.url+'/functions/v1/geoapify-places',{method:'POST',credentials:'omit',headers:{apikey:config.publishableKey,Authorization:'Bearer '+config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:signal||AbortSignal.timeout(15000)});
 if(!response.ok)throw new PlacesError(response.status===429?'Place search is busy. Try again shortly.':'Places could not load. Try again.',response.status);return response.json();
}
export async function getPlacesPage(search:PlaceSearch={},signal?:AbortSignal):Promise<PlacePage>{
 const input={category:'all' as PlaceCategory,latitude:placeLocation.latitude,longitude:placeLocation.longitude,radius:15000,offset:0,...search},key=JSON.stringify(input),cached=pageCache.get(key);signal?.throwIfAborted();if(cached&&cached.until>Date.now())return cached.value;
 const data=await publicPlaceRequest(input,signal);signal?.throwIfAborted();const value={businesses:normalizeBusinesses(data,input.category),next_offset:Number.isInteger(data.next_offset)&&data.next_offset>input.offset?data.next_offset:null};if(pageCache.size>100)pageCache.delete(pageCache.keys().next().value!);pageCache.set(key,{until:Date.now()+300000,value});return value;
}
export async function placeSuggestions(query:string,signal?:AbortSignal):Promise<Business[]>{if(query.trim().length<3)return [];const data=await publicPlaceRequest({mode:'autocomplete',query,latitude:placeLocation.latitude,longitude:placeLocation.longitude},signal);signal?.throwIfAborted();return normalizeBusinesses({businesses:data.suggestions},'all');}
