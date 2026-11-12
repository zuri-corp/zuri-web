import {PlanAttendance} from './ObjectPanels';
import {occurrenceTime,safeEventUrl} from '../lib/motion-event-dates';
import type {ImportedMotionEvent} from '../lib/motion-events';

export function eventCategory(value:string|null){return (value||'Event').split('-').map(word=>word[0]?.toUpperCase()+word.slice(1)).join(' & ');}
export function eventDate(event:ImportedMotionEvent){const date=event.next_occurrence_at||event.starts_at;if(!date)return 'Date to be confirmed';return new Date(occurrenceTime(date)).toLocaleString('en-UG',{dateStyle:'medium',...(event.source_payload?.time_known===false?{}:{timeStyle:'short' as const}),timeZone:'Africa/Kampala'});}
export function eventLocation(event:ImportedMotionEvent){return [...new Set([event.location?.venue,event.location?.city].filter(Boolean))].join(', ')||'See organiser for location';}
export function eventSource(event:ImportedMotionEvent){return event.source==='x'?'X announcement':'Quicket';}

export function EventCard({event,onOpen}:{event:ImportedMotionEvent;onOpen:()=>void}){
 return <button type="button" className="cw-event-card" onClick={onOpen} aria-label={'View event: '+event.title}>
  {safeEventUrl(event.image?.original_url)?<img src={event.image!.original_url!} alt="" loading="lazy"/>:<span className="cw-event-art" aria-hidden="true">↗</span>}
  <span className="cw-event-summary"><span className="cw-event-tags"><span>{eventCategory(event.category)}</span><span>{eventSource(event)}</span></span><strong>{event.title}</strong><time>{eventDate(event)}</time><span className="cw-event-location">{eventLocation(event)}</span></span><span className="cw-event-arrow" aria-hidden="true">↗</span>
 </button>;
}

export function EventDetails({event,onSignIn,onPlanner}:{event:ImportedMotionEvent;onSignIn?:()=>void;onPlanner?:()=>void}){
 const source=safeEventUrl(event.source_payload?.source_url),booking=safeEventUrl(event.registration_url);
 return <article className="cw-event-detail oc-external-event"><div className="cw-event-tags"><span>{eventCategory(event.category)}</span><span>{eventSource(event)} · External event</span></div><h2>{event.title}</h2>{safeEventUrl(event.image?.original_url)&&<img className="cw-event-poster" src={event.image!.original_url!} alt={event.image?.alt||event.title}/>}
 {onSignIn&&onPlanner&&<PlanAttendance source="imported" id={event.id} onSignIn={onSignIn} onPlanner={onPlanner}/>}<dl className="cw-event-facts"><div><dt>When</dt><dd>{eventDate(event)} · EAT{event.source_payload?.time_known===false&&<small>Start time not announced</small>}</dd></div><div><dt>Where</dt><dd>{eventLocation(event)}</dd></div></dl>
 <section><h3>About this event</h3><p className="cw-event-description">{event.description||'Read the original listing for the organiser’s full details.'}</p></section>
 {Array.isArray(event.sessions)&&event.sessions.length>1&&<details><summary>Event sessions</summary><ul>{event.sessions.filter(s=>s.starts_at).map((s,i)=><li key={i}>{new Date(occurrenceTime(s.starts_at!)).toLocaleString('en-UG',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Kampala'})}</li>)}</ul></details>}
 <div className="cw-event-actions">{booking&&<a className="cw-primary" href={booking} target="_blank" rel="noopener noreferrer">{event.source==='x'?'Registration details ↗':'View tickets on Quicket ↗'}</a>}{source&&source!==booking&&<a className="cw-link" href={source} target="_blank" rel="noopener noreferrer">Original announcement ↗</a>}</div></article>;
}
