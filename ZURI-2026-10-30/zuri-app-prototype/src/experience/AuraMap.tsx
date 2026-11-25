import L from 'leaflet';
import {useEffect,useMemo,useRef,useState} from 'react';
import {AppGlyph} from './AppGlyph';
import './aura-map.css';
import {resolvePamojaMapPoints,type PamojaMapPoint} from './auraMapData';
import type {CloudEntity} from './cloudClient';

type Position={latitude:number;longitude:number};
type Filter='all'|PamojaMapPoint['kind'];

const typeLabel:Record<PamojaMapPoint['kind'],string>={space:'Space',society:'Society',event:'Event',ping:'Ping'};
const kindIcon:Record<PamojaMapPoint['kind'],string>={space:'Spaces',society:'Societies',event:'Events',ping:'Pings'};

function mapMarker(kind:PamojaMapPoint['kind']){
 return L.divIcon({
  className:'am-marker-wrap',
  html:`<span class="am-marker am-marker-${kind}" aria-hidden="true"><i></i></span>`,
  iconSize:[34,34],
  iconAnchor:[17,31],
 });
}

function youMarker(){
 return L.divIcon({className:'am-marker-wrap',html:'<span class="am-marker am-marker-you" aria-hidden="true"></span>',iconSize:[20,20],iconAnchor:[10,10]});
}
const markers={space:mapMarker('space'),society:mapMarker('society'),event:mapMarker('event'),ping:mapMarker('ping')};
const myMarker=youMarker();

export default function AuraMap({entities,onOpen,onFind}:{entities:CloudEntity[];onOpen:(kind:string,id:string)=>void;onFind:()=>void}){
 const [points,setPoints]=useState<PamojaMapPoint[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [position,setPosition]=useState<Position|null>(null);
 const [kind,setKind]=useState<Filter>('all');
 const [selected,setSelected]=useState<PamojaMapPoint|null>(null);
 const [sheetExpanded,setSheetExpanded]=useState(true);
 const sheetDragStart=useRef<number|null>(null);
 const sheetDragConsumed=useRef(false);
 const canvas=useRef<HTMLDivElement>(null);
 const map=useRef<L.Map|null>(null);
 const layer=useRef<L.LayerGroup|null>(null);
 const positioned=useRef(false);
 const interacted=useRef(false);
 const visible=useMemo(()=>points.filter(point=>kind==='all'||point.kind===kind),[points,kind]);

 useEffect(()=>{
  const controller=new AbortController();
  setLoading(true);setError('');
  void resolvePamojaMapPoints(entities,controller.signal,immediate=>{if(!controller.signal.aborted)setPoints(immediate);}).then(result=>{if(!controller.signal.aborted)setPoints(result);}).catch(reason=>{
   if(reason?.name!=='AbortError')setError('Some published places could not refresh just now.');
  }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[entities]);

 useEffect(()=>{
  if(!canvas.current||map.current)return;
  const instance=L.map(canvas.current,{zoomControl:false,attributionControl:false,preferCanvas:true,zoomSnap:.25}).setView([0.3476,32.5825],13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(instance);
  map.current=instance;layer.current=L.layerGroup().addTo(instance);
  instance.on('dragstart',()=>{interacted.current=true;});
  instance.on('zoomstart',()=>{interacted.current=true;});
  const observer=new ResizeObserver(()=>instance.invalidateSize({animate:false}));
  observer.observe(canvas.current);
  requestAnimationFrame(()=>instance.invalidateSize({animate:false}));
  return()=>{observer.disconnect();instance.remove();map.current=null;layer.current=null;};
 },[]);

 useEffect(()=>{
  if(!map.current||!layer.current)return;
  layer.current.clearLayers();
  const coordinates:L.LatLngTuple[]=[];
  visible.forEach(point=>{
   L.marker([point.latitude,point.longitude],{icon:markers[point.kind],keyboard:true,title:point.title})
    .on('click',()=>setSelected(point)).addTo(layer.current!);
   coordinates.push([point.latitude,point.longitude]);
  });
  if(position){
   L.marker([position.latitude,position.longitude],{icon:myMarker,interactive:false}).addTo(layer.current);
   coordinates.push([position.latitude,position.longitude]);
  }
  if(!positioned.current&&!interacted.current&&!loading&&coordinates.length){
   positioned.current=true;
   if(coordinates.length>1)map.current.fitBounds(coordinates,{padding:[52,86],maxZoom:15,animate:false});
   else map.current.setView(coordinates[0],14,{animate:false});
  }
 },[visible,position,loading]);

 function locate(){
  if(!navigator.geolocation){setError('This browser cannot share a current location.');return;}
  setError('');
  navigator.geolocation.getCurrentPosition(value=>{
   const next={latitude:value.coords.latitude,longitude:value.coords.longitude};
   interacted.current=true;setPosition(next);map.current?.flyTo([next.latitude,next.longitude],15,{duration:.4});
  },()=>setError('Location was not shared. Your position stays private.'),{enableHighAccuracy:false,maximumAge:60000,timeout:8000});
 }

 return <section className="am-map" aria-label="Aura map">
  <div ref={canvas} className="am-leaflet" aria-label="Interactive Pamoja map"/>
  <header className="am-map-header">
   <span className="am-brand"><AppGlyph name="aura" size={25}/>Aura</span>
   <button className="am-search" type="button" onClick={onFind}><AppGlyph name="Find" size={18}/><span>Find a place, event or people</span></button>
   <button type="button" aria-label="Locate me" className="am-locate" onClick={locate}><AppGlyph name="Map" size={19}/></button>
  </header>
  {loading&&!points.length&&<div className="am-loading" role="status">Finding public places…</div>}
  {!loading&&!points.length&&<div className="am-empty"><AppGlyph name="Map" size={30}/><strong>No published locations yet.</strong><span>Spaces, Societies, Events and Pings appear here when their owners choose a public location.</span></div>}
  {selected&&<button className="am-place-card" onClick={()=>onOpen(selected.kind,selected.id)}>
   <span><AppGlyph name={kindIcon[selected.kind]} size={22}/></span>
   <div><small>{typeLabel[selected.kind]} · {selected.visibility}</small><strong>{selected.title}</strong><p>{selected.location}</p></div>
   <AppGlyph name="next" size={18}/>
  </button>}
  <div className="am-sheet" data-expanded={sheetExpanded}>
   <button type="button" className="am-sheet-handle" aria-label={sheetExpanded?'Collapse map filters':'Expand map filters'} aria-expanded={sheetExpanded} aria-controls="aura-map-filters"
    onPointerDown={event=>{sheetDragStart.current=event.clientY;sheetDragConsumed.current=false;event.currentTarget.setPointerCapture(event.pointerId);}}
    onPointerUp={event=>{if(sheetDragStart.current===null)return;const distance=event.clientY-sheetDragStart.current;sheetDragStart.current=null;if(Math.abs(distance)>24){sheetDragConsumed.current=true;setSheetExpanded(distance<0);}}}
    onPointerCancel={()=>{sheetDragStart.current=null;}}
    onClick={()=>{if(sheetDragConsumed.current){sheetDragConsumed.current=false;return;}setSheetExpanded(expanded=>!expanded);}}><span/></button>
   <div className="am-sheet-content" data-expanded={sheetExpanded}><div id="aura-map-filters" aria-hidden={!sheetExpanded} inert={!sheetExpanded}>
   <div className="am-filter-row">{(['all','space','society','event','ping'] as const).map(value=>{
    const entityKind=value==='all'?null:value;
    return <button key={value} type="button" aria-pressed={kind===value} onClick={()=>{setKind(value);setSelected(null);}}>{entityKind?<AppGlyph name={kindIcon[entityKind]} size={17}/>:null}<span>{entityKind?typeLabel[entityKind]:'All'}</span></button>;
   })}</div>
   <p>{loading?'Refreshing ZURI places…':`${visible.length} public place${visible.length===1?'':'s'} in Aura`} · <button type="button" onClick={onFind}>Explore nearby</button></p>
   {error&&<small role="status">{error}</small>}
   </div></div>
  </div>
  <a className="am-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>
 </section>;
}
