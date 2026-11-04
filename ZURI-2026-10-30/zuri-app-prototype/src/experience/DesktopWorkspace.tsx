import {AppGlyph,SectionGlyph} from './AppGlyph';
import {IdentityAvatar} from './IdentityEditor';
import {worlds,type World,type Route,type LocalData} from './model';
import type {CSSProperties} from 'react';

type Props={local?:boolean;route:Route;data:LocalData;launch:(world:World)=>void;go:(route:Route)=>void;open:(kind:string,id:string)=>void;onViola:()=>void;onIntroduction:()=>void};
export default function DesktopWorkspace({route,data,launch,go,open,onViola,onIntroduction,local=true}:Props){
 return <aside className="zw-desktop-rail" aria-label="Desktop workspace">
  <a className="zw-desktop-brand" href="/" target="_top" aria-label="ZURI website">ZURI<span aria-hidden="true">✦</span></a>
  <p className="zw-rail-caption">YOUR WORLD, CONNECTED</p>
  <nav className="zw-world-nav" aria-label="ZURI desktop destinations">
   {(Object.keys(worlds) as World[]).map(world=><button key={world} aria-current={route.world===world?'page':undefined} onClick={()=>launch(world)} style={{'--rail-accent':worlds[world].color} as CSSProperties}>
    <AppGlyph name={world} size={26}/><span>{worlds[world].name}</span><i aria-hidden="true">↗</i>
   </button>)}
  </nav>
  <div className="zw-library"><p className="zw-rail-caption">YOUR WORKSPACE</p>
   <button onClick={()=>local?open('intent','new'):onViola()}><AppGlyph name="lounge" size={18}/><span>Goals & next steps</span>{local&&<b>{data.intents?.filter(i=>i.status==='active').length??0}</b>}</button>
   <button onClick={()=>go({world:'motion',tab:'Planner'})}><SectionGlyph name="Planner"/><span>Planner</span>{local&&<b>{data.tasks.filter(task=>!task.done).length}</b>}</button>
   <button onClick={()=>go({world:'lore',tab:'Chapters'})}><SectionGlyph name="Chapters"/><span>Chapters</span>{local&&<b>{data.chapters.length}</b>}</button>
   <button onClick={()=>go({world:'rizz',tab:'Channels'})}><SectionGlyph name="Channels"/><span>Channels</span></button>
  </div>
  {data.chapters.length>0&&<div className="zw-recent-chapters"><p className="zw-rail-caption">RECENT CHAPTERS</p>{data.chapters.slice(-3).reverse().map(chapter=><button key={chapter.id} onClick={()=>open('chapter',chapter.id)}><span aria-hidden="true">◒</span><span>{chapter.title}</span></button>)}</div>}
  <div className="zw-rail-bottom"><button className="zw-viola-entry" onClick={onViola}><span aria-hidden="true">✦</span><span>Ask Viola<small>A little help, right here</small></span><i aria-hidden="true">↗</i></button>
   <button className="zw-profile-entry" onClick={()=>go({world:'lore',tab:'Profile'})}><IdentityAvatar data={data}/><span>{data.name}<small>Your shared profile</small></span></button>
   <button className="zw-intro-link" onClick={onIntroduction}><span aria-hidden="true">?</span> Take the ZURI tour <span aria-hidden="true">↗</span></button>
   <a href="/pamoja" target="_top">About Pamoja <span aria-hidden="true">↗</span></a>
  </div>
 </aside>;
}
export function DesktopLaunchpad({launch}:{launch:(world:World)=>void}){
 const descriptions={aura:'Find where you belong',motion:'Make your next move',rizz:'Give your world a voice',lore:'Keep what matters'};
 return <section className="zw-desktop-launchpad" aria-label="Explore your ZURI worlds">{(['aura','motion','rizz','lore'] as const).map(world=><button key={world} onClick={()=>launch(world)} style={{'--tile-accent':worlds[world].color} as CSSProperties} className={`zw-launch-${world}`}><span className="zw-launch-icon"><AppGlyph name={world} size={42}/></span><span><strong>{worlds[world].name}</strong><small>{descriptions[world]}</small></span><i aria-hidden="true">↗</i></button>)}</section>;
}
