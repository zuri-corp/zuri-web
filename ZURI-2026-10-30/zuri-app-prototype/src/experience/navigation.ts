export type ScrollNav={top:number;direction:number;distance:number;hidden:boolean};
export const initialScrollNav=():ScrollNav=>({top:0,direction:0,distance:0,hidden:false});
/** Ignore tiny jitter; reveal at the top and after an intentional upward scroll. */
export function nextScrollNav(state:ScrollNav,top:number):ScrollNav{
 const current=Math.max(0,top),delta=current-state.top;
 if(current<24)return {...initialScrollNav(),top:current};
 if(Math.abs(delta)<2)return {...state,top:current};
 const direction=Math.sign(delta),distance=direction===state.direction?state.distance+Math.abs(delta):Math.abs(delta);
 return {top:current,direction,distance,hidden:distance>=16?direction>0:state.hidden};
}

import type {Route} from './model';
export function isCreationRoute(r:Route){return r.world==='rizz'&&r.tab==='Create'&&!r.kind||!!r.kind&&(r.kind.startsWith('new-')||['event-create','offer-editor','space-settings','manage-channel','checkout','enquiry','echo-compose'].includes(r.kind));}
export function replacesCreation(current:Route,next:Route){return isCreationRoute(current)&&(!isCreationRoute(next)||current.kind===next.kind);}
