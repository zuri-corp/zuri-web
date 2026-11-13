import {AppGlyph} from './AppGlyph';
import {useEffect,useState} from 'react';
import {ContextAvatar} from './ObjectLayout';
import {cloudRequest,type CloudRecord} from './cloudClient';
type Channel={id:string;title:string;description:string;visibility:string;collections:{id:string;title:string}[]};
export default function ProfileChannels({id,onOpen,own=false}:{id?:string;onOpen?:(kind:string,id:string)=>void;own?:boolean}){
 const [channels,setChannels]=useState<Channel[]>([]),[chapters,setChapters]=useState<CloudRecord[]>([]),[error,setError]=useState('');
 useEffect(()=>{if(!id)return;let active=true;cloudRequest<Channel[]>('profile.channels',{id}).then(value=>{if(active)setChannels(value);}).catch(e=>{if(active)setError(e.message);});if(own)cloudRequest<CloudRecord[]>('records.list',{kind:'chapter'}).then(value=>{if(active)setChapters(value);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id,own]);
 return <>{channels.length>0&&<section className="sr-profile-channels"><h3>Channels & collections</h3>{channels.map(channel=><article key={channel.id}><button className="sr-channel-title" onClick={()=>onOpen?.('channel',channel.id)}><ContextAvatar id={channel.id} name={channel.title}/><strong>{channel.title}</strong><span> <AppGlyph name="next" size={16}/></span></button><p>{channel.description}</p><div>{channel.collections.map(collection=><button className="sr-context-chip" key={collection.id} onClick={()=>onOpen?.('channel-collection',channel.id+':'+collection.id)}>▤ {collection.title}</button>)}</div></article>)}</section>}{own&&chapters.length>0&&<section><h3>Your private Chapters</h3>{chapters.map(chapter=><button className="zs-object-card" key={chapter.id} onClick={()=>onOpen?.('chapter',chapter.id)}>{String(chapter.content.title||'Chapter')} <AppGlyph name="next" size={16}/></button>)}</section>}{error&&<p role="alert">{error}</p>}</>;
}
