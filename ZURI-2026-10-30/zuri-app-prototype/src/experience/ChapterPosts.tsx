import {useEffect,useState} from 'react';
import {cloudRequest} from './cloudClient';
import {ActivityCard,type Activity} from './ObjectActivity';
export default function ChapterPosts({id}:{id:string}){const [rows,setRows]=useState<Activity[]>([]),[error,setError]=useState('');useEffect(()=>{let active=true;cloudRequest<Activity[]>('chapters.posts',{id}).then(value=>{if(active)setRows(value);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id]);return <>{rows.map(post=><ActivityCard key={post.id} post={post}/>)}{error&&<p role="alert">{error}</p>}</>;}
