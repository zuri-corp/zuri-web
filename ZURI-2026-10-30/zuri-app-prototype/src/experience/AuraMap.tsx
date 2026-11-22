import {AppGlyph} from './AppGlyph';
import type {CSSProperties} from 'react';
import type {CloudEntity} from './cloudClient';

export default function AuraMap({entities,onOpen,onFind}:{entities:CloudEntity[];onOpen:(kind:string,id:string)=>void;onFind:()=>void}){
 const places=entities.filter(entity=>entity.kind==='space'||entity.kind==='society').slice(0,10);
 return <section className="am-map" aria-label="Aura map">
  <header><div><small>AURA MAP</small><h2>Your world, in context.</h2><p>Spaces and societies you can return to, without a public feed in the way.</p></div><button className="zs-primary" onClick={onFind}><AppGlyph name="Find" size={18}/>Search places</button></header>
  <div className="am-canvas" aria-label="Nearby places map">
   <span className="am-orbit am-orbit-one"/><span className="am-orbit am-orbit-two"/><span className="am-you"><AppGlyph name="aura" size={28}/></span>
   {places.map((place,index)=><button key={place.id} className="am-pin" style={{'--pin-x':`${18+(index*23)%68}%`,'--pin-y':`${18+(index*31)%62}%`} as CSSProperties} onClick={()=>onOpen(place.kind,place.id)}><AppGlyph name={place.kind==='space'?'Spaces':'Societies'} size={18}/><span>{place.title}</span></button>)}
   {!places.length&&<div className="am-empty"><AppGlyph name="Map" size={30}/><strong>No saved places yet.</strong><span>Search Aura to place your first Space or Society here.</span></div>}
  </div>
  <div className="am-legend"><span><i/>Your position</span><span><AppGlyph name="Spaces" size={16}/>Space</span><span><AppGlyph name="Societies" size={16}/>Society</span></div>
 </section>;
}
