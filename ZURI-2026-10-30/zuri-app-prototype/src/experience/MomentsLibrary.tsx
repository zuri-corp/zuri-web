import {ContextBrowser} from './ContextBrowser';
import {Photo,type MobileProps} from './MobileWorlds';
import {chapterMomentIds} from './pamojaModel';
import type {ContextTag,Post} from './model';
export function MomentsLibrary({data,open}:Pick<MobileProps,'data'|'open'>){
 const moments=data.posts.filter(p=>p.image||p.video);
 const tags=(p:Post):ContextTag[]=>[...(p.tags||[]),...(p.spaceId?[{kind:'space' as const,id:p.spaceId}]:[]),...data.chapters.filter(c=>chapterMomentIds(data,c.id).includes(p.id)).map(c=>({kind:'chapter' as const,id:c.id}))];
 return <div><button className="zx-primary" onClick={()=>open('new-moment','library')}>＋ Add moment</button><ContextBrowser data={data} items={moments} tags={tags} text={p=>p.text} storageKey="zuri-moments-context" render={items=><div className="cx-moments">{items.map(p=><button key={p.id} aria-label={'Open moment: '+(p.text||'Untitled moment')} onClick={()=>open('moment',p.id)}>{p.video?<video src={p.video} preload="metadata" muted playsInline/>:<Photo src={p.image}/>}<span>{p.video?'▷ ':''}{p.text||'A moment'}</span></button>)}</div>}/></div>;
}
