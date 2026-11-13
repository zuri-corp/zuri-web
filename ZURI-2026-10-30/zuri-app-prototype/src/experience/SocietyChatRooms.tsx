import {AppGlyph} from './AppGlyph';
import {useEffect,useState} from 'react';
import {cloudRequest} from './cloudClient';

export type SocietyRoom={id:string|null;title:string};
export default function SocietyChatRooms({id,owner,onOpen}:{id:string;owner:boolean;onOpen:(room:SocietyRoom)=>void}){
 const [rooms,setRooms]=useState<SocietyRoom[]>([]),[title,setTitle]=useState(''),[creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;cloudRequest<SocietyRoom[]>('societies.rooms.list',{id}).then(rows=>{if(active)setRooms(rows);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id]);
 async function add(){
  if(busy||!title.trim())return;setBusy(true);setError('');
  try{const room=await cloudRequest<SocietyRoom>('societies.rooms.create',{id,title});setRooms(current=>current.some(row=>row.id===room.id)?current:[...current,room]);setCreating(false);setTitle('');}
  catch(e){setError(e instanceof Error?e.message:'Could not create this chat.');}finally{setBusy(false);}
 }
 return <section className="oc-society-chats"><h3>Group chats</h3>{[{id:null,title:'General'},...rooms].map(room=><button type="button" key={room.id||'general'} className="zs-object-card" onClick={()=>onOpen(room)}><span><strong>{room.title}</strong><small>Members’ chat</small></span><span> <AppGlyph name="next" size={16}/></span></button>)}{owner&&(creating?<form onSubmit={e=>{e.preventDefault();void add();}}><label>Chat name<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} required/></label><button className="zs-primary" disabled={busy}>Create chat</button><button type="button" className="zs-text-button" onClick={()=>setCreating(false)}>Cancel</button></form>:<button type="button" className="zs-text-button" onClick={()=>setCreating(true)}>＋ New chat</button>)}{error&&<p role="alert">{error}</p>}</section>;
}
