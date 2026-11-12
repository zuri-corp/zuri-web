import {useEffect,useState} from 'react';
import {cloudRequest} from './cloudClient';
import {WorldLoader} from './UsabilityUI';
import {ActivityCard,type Activity} from './ObjectActivity';
export default function CloudPost({id,onOpen}:{id:string;onOpen:(kind:string,id:string)=>void}){const [post,setPost]=useState<Activity|null>(null),[error,setError]=useState('');useEffect(()=>{let active=true;cloudRequest<Activity>('social.post',{id}).then(value=>{if(active)setPost(value);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id]);return post?<ActivityCard post={post} onContext={()=>onOpen(post.context_kind!,post.entity_id!)}/>:error?<p role="alert">{error}</p>:<WorldLoader world="rizz" label="Opening post…"/>;}
