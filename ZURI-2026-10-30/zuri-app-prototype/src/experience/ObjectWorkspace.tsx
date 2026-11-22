import {AppGlyph} from './AppGlyph';
import SocietyChatRooms,{type SocietyRoom} from './SocietyChatRooms';
import SpaceReviewPanel from './SpaceReviewPanel';
import SpaceTeamManager from './SpaceTeamManager';
import SpaceTeamAccess from './SpaceTeamAccess';
import {visibleSpaceSections} from './spaceSections';
import {eventPriceLabel} from './eventPricing';
import {useEffect,useState} from 'react';
import {cloudRequest,type CloudEntity} from './cloudClient';
import {ObjectHero,ObjectTabs,ObjectFacts,InlineAction} from './ObjectLayout';
import {WorldLoader,PersonAvatar,PersonName} from './UsabilityUI';
import Conversation from './Conversation';
import ContextLinks from './ContextLinks';
import ChannelCollections from './ChannelCollections';
import {ContextAvatar} from './ObjectLayout';
import ObjectActivity from './ObjectActivity';
import {ObjectPeople,ObjectInvites,SpaceOfferings,ObjectPlans,SaveMotionPlan} from './ObjectPanels';
import EntityEditor from './EntityScreens';
import {SpaceConnections} from './SpaceUI';
import {safeEventUrl} from '../lib/motion-event-dates';
export const objectSections:Record<string,string[]>={space:['Overview','Offerings','Media','Events','Societies','Channels','Echoes'],society:['Topics','Chats','Media','Members','Plans'],ping:['Overview'],event:['Overview','Media','People'],channel:['Updates','Collections','Media','People']};
export type ObjectSummary={viewer_id?:string;entity:CloudEntity;owner:boolean;joined:boolean;readable:boolean;can_post:boolean;member_count:number|null};
function EventManagement({entity,summary,onRefresh}:{entity:CloudEntity;summary:ObjectSummary;onRefresh:()=>void}){
 return <><section className="oc-management"><h3>Event statistics</h3><ObjectFacts facts={[{label:'People',value:summary.member_count??0},{label:'Capacity',value:entity.capacity||'Not set'},{label:'Status',value:entity.status}]}/></section><EntityEditor kind="event" id={entity.id} inline onCreated={()=>onRefresh()} onCancel={()=>{}}/></>;
}
function EntityDeletion({entity,onDeleted}:{entity:CloudEntity;onDeleted:(kind:string)=>void}){
 const [armed,setArmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function remove(){if(busy)return;setBusy(true);setError('');try{const result=await cloudRequest<{deleted?:boolean}>('entities.delete',{id:entity.id});if(result.deleted!==true)throw Error('Deletion could not be confirmed.');onDeleted(entity.kind);}catch(e){setError(e instanceof Error?e.message:'Deletion could not be confirmed.');}finally{setBusy(false);}}
 return <section className="oc-management"><h3>Remove {entity.kind}</h3>{error&&<p role="alert">{error}</p>}{armed?<p className="oc-danger-confirm">Remove this {entity.kind} from ZURI? It will no longer be visible or usable. <button className="zs-text-button" disabled={busy} onClick={()=>void remove()}>{busy?'Removing…':'Remove'}</button><button className="zs-text-button" disabled={busy} onClick={()=>setArmed(false)}>Keep it</button></p>:<button className="zs-text-button" onClick={()=>setArmed(true)}>Remove {entity.kind}</button>}</section>;
}
export default function ObjectWorkspace({id,onOpen,onPlanner,onDeleted,initialCollection,loadingWorld='aura'}:{loadingWorld?:string;initialCollection?:string;id:string;onOpen:(kind:string,id:string)=>void;onPlanner:()=>void;onDeleted?:(kind:string)=>void}){
 const [summary,setSummary]=useState<ObjectSummary|null>(null),[version,setVersion]=useState(0),[error,setError]=useState('');
 useEffect(()=>{let active=true;cloudRequest<ObjectSummary>('objects.summary',{id}).then(value=>{if(active){setSummary(value);setError('');}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id,version]);
 if(!summary)return <section>{error?<p role="alert">{error}</p>:<WorldLoader world={loadingWorld} label="Opening…"/>}<button className="zs-text-button" onClick={()=>setVersion(v=>v+1)}>Refresh</button></section>;
 return <ObjectScreen initialCollection={initialCollection} summary={summary} onOpen={onOpen} onPlanner={onPlanner} onDeleted={onDeleted||(()=>setVersion(v=>v+1))} onRefresh={()=>setVersion(v=>v+1)}/>;
}
export function ObjectScreen({summary,onOpen,onPlanner,onRefresh,onDeleted,initialCollection}:{initialCollection?:string;summary:ObjectSummary;onOpen:(kind:string,id:string)=>void;onPlanner:()=>void;onRefresh:()=>void;onDeleted:(kind:string)=>void}){
 const historyRoom=window.history.state?.zuriSocietyRoom as {societyId:string;viewerId?:string;room:SocietyRoom}|undefined;
 const restored=historyRoom?.societyId===summary.entity.id&&historyRoom.viewerId===summary.viewer_id?historyRoom.room:null;
 const [chatRoom,setChatRoom]=useState<SocietyRoom|null>(restored);
 function selectRoom(room:SocietyRoom|null){
  setChatRoom(room);
  window.history.replaceState({...window.history.state,zuriSocietyRoom:room?{societyId:summary.entity.id,viewerId:summary.viewer_id,room}:null},'');
 }
 const [tab,setTab]=useState(restored?'Chats':initialCollection?'Collections':''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');const id=summary.entity.id;
 const {entity,owner,joined,readable,can_post}=summary,kind=entity.kind,name=kind[0].toUpperCase()+kind.slice(1),shown=visibleSpaceSections(entity.details.homeSections),sections=kind==='space'?(objectSections.space.concat('Tools').filter(section=>section==='Overview'?['About','Location','Category','Products and services','Website'].some(item=>shown.includes(item)):shown.includes(section))):objectSections[kind]||['Overview'],items=readable?[...sections,...(owner?['Manage']:[])]:['Overview'],selected=items.includes(tab)?tab:items[0],website=safeEventUrl(String(entity.details.website||'')),participating=owner||joined;
 async function join(){if(busy)return;setBusy(true);setError('');try{const result=await cloudRequest<{state:string}>('entities.join',{id});setNotice(result.state==='active'?'You are in.':'Your request is with the host.');onRefresh();}catch(e){setError(e instanceof Error?e.message:'Joining could not be confirmed.');}finally{setBusy(false);}}
 const joinButton=kind!=='space'&&!participating&&<button className="zs-primary" disabled={busy} onClick={()=>void join()}>{entity.invitation_pending?'Accept invitation':entity.join_policy==='open'?kind==='event'?'Attend Event':'Join '+name:'Request to join'}</button>;
 return <article className={'oc-workspace oc-'+kind}><ObjectHero title={entity.title} kind={name} visibility={entity.visibility} avatarId={kind==='channel'?entity.id:undefined} profileCoverId={kind==='space'||kind==='society'?entity.id:undefined} coverId={entity.details.mediaId?entity.id:undefined}><div className="oc-hero-meta">{kind!=='space'&&summary.member_count!==null&&<span>{summary.member_count} {kind==='channel'?(summary.member_count===1?'follower':'followers'):(summary.member_count===1?'person':'people')}</span>}{(kind!=='space'||shown.includes('Location'))&&Boolean(entity.details.location)&&<span>{String(entity.details.location)}</span>}</div></ObjectHero><ContextLinks id={id}/><ObjectTabs items={items} value={selected} onChange={value=>{selectRoom(null);setTab(value);}}/><div className="oc-body">{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {selected==='Overview'&&kind==='space'&&<><section className="oc-space-about">{shown.includes('About')&&<><h3>About</h3><p>{entity.description}</p></>}<ObjectFacts facts={[{label:'Location',value:shown.includes('Location')?String(entity.details.location||''):null},{label:'Category',value:shown.includes('Category')?String(entity.details.category||''):null},{label:'Products and services',value:shown.includes('Products and services')?String(entity.details.offeringSummary||''):null}]}/>{shown.includes('Website')&&website&&<a className="zs-text-button" href={website} target="_blank" rel="noopener noreferrer">Visit website <AppGlyph name="next" size={16}/></a>}</section><SpaceTeamAccess id={id} onAccepted={onRefresh}/></>}
 {selected==='Overview'&&kind!=='space'&&<><p className="oc-description">{entity.description}</p>{kind==='ping'&&<div className="sr-host-details"><PersonAvatar id={entity.owner_id} name={entity.host_name||'Host'}/><span><small>Your host</small><PersonName id={entity.owner_id} name={entity.host_name||'Host'}/></span></div>}<ObjectFacts facts={[{label:'When',value:entity.starts_at?new Date(entity.starts_at).toLocaleString('en-UG',{dateStyle:'full',timeStyle:'short',timeZone:'Africa/Kampala'})+' EAT':null},{label:'Where',value:String(entity.details.location||'')},{label:'Capacity',value:entity.capacity?entity.capacity+' people':null},{label:'Admission',value:kind==='event'?eventPriceLabel(entity.details):null}]}/><div className="oc-overview-actions">{['ping','event'].includes(kind)&&readable&&<SaveMotionPlan source="zuri" id={id} onSignIn={()=>{}} onPlanner={onPlanner} onChanged={()=>onRefresh()}/>} {joinButton}{website&&kind!=='ping'&&<a className="zs-text-button" href={website} target="_blank" rel="noopener noreferrer">{kind==='event'?'Registration details':'Visit website'} <AppGlyph name="next" size={16}/></a>}</div>{readable&&kind!=='ping'&&<><div className="oc-quick-links">{sections.slice(1).map(section=><button key={section} onClick={()=>setTab(section)}><strong>{section}</strong><span> <AppGlyph name="next" size={16}/></span></button>)}</div>{kind==='space'?<><h3>What is on offer</h3><SpaceOfferings entityId={id} owner={owner}/></>:<><h3>Life here</h3><ObjectActivity entityId={id} channel={kind==='channel'} canPost={can_post} world={kind}/></>}</>}</>}
 {selected==='Updates'&&<>{!participating&&joinButton}<ObjectActivity entityId={id} channel={kind==='channel'} canPost={can_post} world={kind}/></>}
 {selected==='Collections'&&<ChannelCollections entityId={id} owner={owner} initialId={initialCollection}/>}
 {selected==='Offerings'&&<SpaceOfferings entityId={id} owner={owner} viewerId={summary.viewer_id}/>}
 {selected==='Societies'&&<SpaceConnections space={entity} kind="society" owner={owner} onOpen={onOpen}/>}
 {selected==='Channels'&&<SpaceConnections space={entity} kind="channel" owner={owner} onOpen={onOpen}/>}
 {selected==='Echoes'&&<ObjectActivity entityId={id} canPost={can_post} world={kind}/>}
 {selected==='Media'&&<ObjectActivity entityId={id} view="media" canPost={can_post} world={kind}/>}
 {(selected==='Events'||selected==='Plans')&&<ObjectPlans entity={entity} owner={owner} onOpen={onOpen}/>}
 {(selected==='People'||selected==='Members')&&<ObjectPeople entityId={id} owner={owner}/>}
 {selected==='Tools'&&<section className="oc-space-about"><h3>Tools</h3>{safeEventUrl(String(entity.details.toolsUrl||''))?<a className="zs-text-button" href={safeEventUrl(String(entity.details.toolsUrl||''))} target="_blank" rel="noopener noreferrer">Open Space tools <AppGlyph name="next" size={16}/></a>:<p>No tools have been added.</p>}</section>}
 {selected==='Topics'&&<>{!participating&&joinButton}<ObjectActivity entityId={id} topic canPost={can_post} world={kind}/></>}
 {(selected==='Chat'||selected==='Chats'&&chatRoom)&&(participating?<Conversation key={chatRoom?.id||'general'} id={id} roomId={chatRoom?.id||undefined} userId={summary.viewer_id||''} group world={kind} title={chatRoom?.title||entity.title} canSend={can_post}/>:<section className="oc-feature"><h3>Be part of the conversation</h3>{joinButton}</section>)}
 {selected==='Chats'&&!chatRoom&&(participating?<SocietyChatRooms id={id} owner={owner} onOpen={selectRoom}/>:joinButton)}
 {selected==='Chats'&&chatRoom&&<button type="button" className="zs-text-button oc-chat-back" onClick={()=>selectRoom(null)}>← All chats</button>}
 {selected==='Manage'&&owner&&kind==='space'&&<><SpaceTeamManager key={'team-'+id} id={id}/><SpaceReviewPanel key={id} id={id}/><EntityEditor kind="space" id={id} inline onCreated={()=>{onRefresh();setNotice('Space saved.');}} onCancel={()=>setTab('Overview')}/></>}
 {selected==='Manage'&&owner&&kind==='event'&&<EventManagement entity={entity} summary={summary} onRefresh={()=>{onRefresh();setNotice('Event saved.');}}/>}
 {selected==='Manage'&&owner&&kind!=='space'&&kind!=='event'&&<><InlineAction label={'Edit '+name} onClick={()=>onOpen('edit-'+kind,id)}/><ObjectInvites entityId={id}/><h3>Members & requests</h3><ObjectPeople entityId={id} owner/></>}
 {selected==='Manage'&&owner&&<EntityDeletion entity={entity} onDeleted={onDeleted}/>}
 </div></article>;
}
