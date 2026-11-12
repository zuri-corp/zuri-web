import {useEffect,useState} from 'react';
import {getMotionEvent,type ImportedMotionEvent} from '../lib/motion-events';
import {WorldLoader} from './UsabilityUI';
import {EventDetails} from './EventPresentation';
export default function ExternalEventDetail({id,onBack,onSignIn,onPlanner}:{id:string;onBack:()=>void;onSignIn:()=>void;onPlanner:()=>void}){
 const [event,setEvent]=useState<ImportedMotionEvent|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');setEvent(null);getMotionEvent(id).then(row=>{if(active)setEvent(row);}).catch(()=>{if(active)setError('This event could not be loaded. Please try again.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[id,retry]);
 return <>{loading?<WorldLoader world="motion" label="Opening event…"/>:error?<div role="alert"><p>{error}</p><button className="cw-primary" onClick={()=>setRetry(retry+1)}>Try again</button></div>:event?<EventDetails event={event} onSignIn={onSignIn} onPlanner={onPlanner}/>:<section className="cw-empty"><h2>This event is unavailable.</h2><p>The listing may have been removed or unpublished by its organiser.</p></section>}</>;
}
