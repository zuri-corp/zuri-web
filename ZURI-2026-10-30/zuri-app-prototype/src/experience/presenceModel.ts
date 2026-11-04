import {users} from '../data/catalog';
import {allChannels} from './activity';
import {getSpaces,ownsSpace,pj} from './pamojaModel';
import {allOffers} from './spaceExperience';
import type {LocalData,Presence} from './model';
export function publicPresence(data:LocalData,id:string){
 const person=users.find(u=>u.id===id);if(!person)return undefined;const own=id==='me',presence:Presence=own?data.presence||{}:{};
 const spaces=own?getSpaces(data).filter(s=>presence.spaceIds?.includes(s.id)&&ownsSpace(data,s.id)&&pj(data).spaces.some(x=>x.id===s.id&&x.publication==='preview')):[];
 return {person:own?{...person,avatar:data.avatar||''}:person,name:own?data.name:person.name,bio:own?data.bio:person.bio,presence,channels:allChannels(data).filter(c=>c.ownerId===id&&!c.archived),spaces,offers:allOffers(data).filter(o=>spaces.some(s=>s.id===o.spaceId))};
}
