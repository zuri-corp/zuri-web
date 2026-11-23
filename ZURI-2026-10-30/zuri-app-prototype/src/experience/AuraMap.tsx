import {AppGlyph} from './AppGlyph';
import './aura-map.css';
import {resolvePamojaMapPoints,type PamojaMapPoint} from './auraMapData';
import type {CloudEntity} from './cloudClient';
import {useEffect,useMemo,useState} from 'react';

type Position={latitude:number;longitude:number};
const typeLabel:Record<PamojaMapPoint['kind'],string>={space:'Space',event:'Event',ping:'Ping'};
const kindIcon:Record<PamojaMapPoint['kind'],string>={space:'Spaces',event:'Events',ping:'Pings'};
function project(point:Position,points:Position[]){const lats=points.map(item=>item.latitude),lngs=points.map(item=>item.longitude),minLat=Math.min(...lats)-.012,maxLat=Math.max(...lats)+.012,minLng=Math.min(...lngs)-.012,maxLng=Math.max(...lngs)+.012;return {x:10+80*(point.longitude-minLng)/(maxLng-minLng||.024),y:90-80*(point.latitude-minLat)/(maxLat-minLat||.024)};}

export default function AuraMap({entities,onOpen,onFind}:{entities:CloudEntity[];onOpen:(kind:string,id:string)=>void;onFind:()=>void}){
 const [points,setPoints]=useState<PamojaMapPoint[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[position,setPosition]=useState<Position|null>(null);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');void resolvePamojaMapPoints(entities,controller.signal).then(setPoints).catch(error=>{if(error?.name!=='AbortError')setError('Locations could not refresh right now.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[entities]);
 const allPositions=useMemo(()=>[...points,...(position?[position]:[])],[points,position]);
 function locate(){if(!navigator.geolocation){setError('This browser cannot share a current location.');return;}setError('');navigator.geolocation.getCurrentPosition(value=>setPosition({latitude:value.coords.latitude,longitude:value.coords.longitude}),()=>setError('Location was not shared. Your position stays private.'),{enableHighAccuracy:false,maximumAge:60000,timeout:8000});}
 return <section className="am-map" aria-label="Aura map">
  <header className="am-map-header"><div><small>AURA MAP · LIVE PLACES</small><h2>What is happening around you.</h2><p>Spaces, Events and Pings with a published location appear here.</p></div><div className="am-map-actions"><button type="button" className="am-locate" onClick={locate}><AppGlyph name="Map" size={17}/>Locate me</button><button type="button" className="zs-primary" onClick={onFind}><AppGlyph name="Find" size={18}/>Find places</button></div></header>
  <div className="am-canvas" aria-label="Pamoja locations map"><div className="am-map-watermark" aria-hidden="true">AURA</div><svg className="am-roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M-5 80C18 71 22 25 53 36S81 79 105 21M12 -5C27 23 62 14 85 42S79 91 103 105M-5 42C17 48 37 68 62 59S76 19 102 12"/></svg>
   {position&&(()=>{const p=project(position,allPositions);return <span className="am-you" style={{left:`${p.x}%`,top:`${p.y}%`}} title="Your approximate position"><AppGlyph name="aura" size={23}/></span>})()}
   {points.map(point=>{const p=project(point,allPositions);return <button key={point.id} className={'am-pin am-pin-'+point.kind} style={{left:`${p.x}%`,top:`${p.y}%`}} onClick={()=>onOpen(point.kind,point.id)}><AppGlyph name={kindIcon[point.kind]} size={17}/><span><b>{point.title}</b><small>{typeLabel[point.kind]} · {point.location}</small></span></button>;})}
   {!loading&&!points.length&&<div className="am-empty"><AppGlyph name="Map" size={30}/><strong>No mappable Pamoja places yet.</strong><span>Create a Space, Event or Ping with a location to place it on Aura.</span></div>}{loading&&<div className="am-loading">Refreshing locations</div>}
  </div>
  {error&&<p className="am-status" role="status">{error}</p>}<div className="am-legend"><span><i/>Your approximate position</span><span><AppGlyph name="Spaces" size={16}/>Spaces</span><span><AppGlyph name="Events" size={16}/>Events</span><span><AppGlyph name="Pings" size={16}/>Pings</span><small>{points.length} mapped · refreshes when this view opens</small></div>
 </section>;
}
