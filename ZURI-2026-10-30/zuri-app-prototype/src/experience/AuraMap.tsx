import {AppGlyph} from './AppGlyph';
import './aura-map.css';
import {resolvePamojaMapPoints,type PamojaMapPoint} from './auraMapData';
import type {CloudEntity} from './cloudClient';
import {useEffect,useMemo,useState} from 'react';

type Position={latitude:number;longitude:number};
const typeLabel:Record<PamojaMapPoint['kind'],string>={space:'Space',society:'Society',event:'Event',ping:'Ping'};
const kindIcon:Record<PamojaMapPoint['kind'],string>={space:'Spaces',society:'Societies',event:'Events',ping:'Pings'};
function project(point:Position,points:Position[]){const lats=points.map(item=>item.latitude),lngs=points.map(item=>item.longitude),minLat=Math.min(...lats)-.012,maxLat=Math.max(...lats)+.012,minLng=Math.min(...lngs)-.012,maxLng=Math.max(...lngs)+.012;return {x:10+80*(point.longitude-minLng)/(maxLng-minLng||.024),y:90-80*(point.latitude-minLat)/(maxLat-minLat||.024)};}

export default function AuraMap({entities,onOpen,onFind}:{entities:CloudEntity[];onOpen:(kind:string,id:string)=>void;onFind:()=>void}){
 const [points,setPoints]=useState<PamojaMapPoint[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[position,setPosition]=useState<Position|null>(null),[kind,setKind]=useState<'all'|PamojaMapPoint['kind']>('all'),[selected,setSelected]=useState<PamojaMapPoint|null>(null);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');void resolvePamojaMapPoints(entities,controller.signal).then(setPoints).catch(error=>{if(error?.name!=='AbortError')setError('Locations could not refresh right now.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[entities]);
 const visible=useMemo(()=>points.filter(point=>kind==='all'||point.kind===kind),[points,kind]);
 const allPositions=useMemo(()=>[...visible,...(position?[position]:[])],[visible,position]);
 function locate(){if(!navigator.geolocation){setError('This browser cannot share a current location.');return;}setError('');navigator.geolocation.getCurrentPosition(value=>setPosition({latitude:value.coords.latitude,longitude:value.coords.longitude}),()=>setError('Location was not shared. Your position stays private.'),{enableHighAccuracy:false,maximumAge:60000,timeout:8000});}
 return <section className="am-map" aria-label="Aura map">
  <div className="am-canvas" aria-label="Pamoja locations map"><div className="am-tiles" aria-hidden="true">{[-1,0,1].flatMap(y=>[-1,0,1].map(x=><img key={x+':'+y} src={`https://tile.openstreetmap.org/13/${4837+x}/${4088+y}.png`} alt=""/>))}</div><div className="am-shade"/><header className="am-map-header"><span className="am-brand"><AppGlyph name="aura" size={25}/>Aura</span><label><AppGlyph name="Find" size={18}/><input placeholder="Find a place, event or people" onFocus={onFind} readOnly/></label><button type="button" aria-label="Locate me" className="am-locate" onClick={locate}><AppGlyph name="Map" size={19}/></button></header>
   {position&&(()=>{const p=project(position,allPositions);return <span className="am-you" style={{left:`${p.x}%`,top:`${p.y}%`}} title="Your approximate position"><AppGlyph name="aura" size={23}/></span>})()}
   {visible.map(point=>{const p=project(point,allPositions);return <button key={point.id} className={'am-pin am-pin-'+point.kind} style={{left:`${p.x}%`,top:`${p.y}%`}} onClick={()=>setSelected(point)}><AppGlyph name={kindIcon[point.kind]} size={17}/><span><b>{point.title}</b><small>{typeLabel[point.kind]}</small></span></button>;})}
   {!loading&&!points.length&&<div className="am-empty"><AppGlyph name="Map" size={30}/><strong>No published locations yet.</strong><span>Spaces, Societies, Events and Pings appear here when their owners add a public location.</span></div>}{loading&&<div className="am-loading">Connecting places…</div>}
  </div>
  {selected&&<button className="am-place-card" onClick={()=>onOpen(selected.kind,selected.id)}><span><AppGlyph name={kindIcon[selected.kind]} size={22}/></span><div><small>{typeLabel[selected.kind]} · {selected.visibility}</small><strong>{selected.title}</strong><p>{selected.location}</p></div><AppGlyph name="next" size={18}/></button>}
  <div className="am-sheet"><div className="am-sheet-handle"/><div className="am-filter-row">{(['all','space','society','event','ping'] as const).map(value=><button key={value} aria-pressed={kind===value} onClick={()=>{setKind(value);setSelected(null);}}>{value==='all'?'All':<AppGlyph name={kindIcon[value]} size={17}/>}<span>{value==='all'?'All':typeLabel[value]}</span></button>)}</div><p>{loading?'Connecting to Pamoja…':`${visible.length} places in Aura`} · <button onClick={onFind}>Explore nearby</button></p>{error&&<small role="status">{error}</small>}<small className="am-attribution">© OpenStreetMap contributors</small></div>
 </section>;
}
