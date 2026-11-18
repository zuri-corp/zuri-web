import {useEffect,useState} from 'react';
import {AppGlyph} from './AppGlyph';
import {worlds,type World} from './model';

export default function WorldEntrance({world}:{world:World}){
 const [visible,setVisible]=useState(world!=='lounge');
 useEffect(()=>{
  if(world==='lounge'){setVisible(false);return;}
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setVisible(false);return;}
  setVisible(true);
  const timer=window.setTimeout(()=>setVisible(false),700);
  return()=>window.clearTimeout(timer);
 },[world]);
 if(!visible||world==='lounge')return null;
 const item=worlds[world];
 return <div className="zs-world-entrance" style={{'--entrance-color':item.color} as React.CSSProperties} aria-hidden="true">
  <AppGlyph name={world} size={82}/><strong>{item.name}</strong><span>{item.description}</span>
 </div>;
}
