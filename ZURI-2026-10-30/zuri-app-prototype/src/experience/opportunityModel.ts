export const opportunityKinds = ['event','job','scholarship','grant','offer','service','collaboration','community'] as const;
export type OpportunityKind = typeof opportunityKinds[number];
export type Opportunity = {
  id:string; kind:OpportunityKind; title:string; summary:string; tags:string[];
  location:string|null; eligibility:string|null; expires_at:string|null;
  status:'review'|'published'|'withdrawn'; confidence:number;
  source_url:string; official_url:string|null; official_verified_at:string|null;
  discovered_at:string; refreshed_at:string; fresh_until:string;
  space_id:string|null; venue_place_id:string|null;
};
export type Source = {id:string; provider:'x'|'google_maps'|'quicket'; label:string;
  mode:'account'|'search'|'venue'|'events'; query:string; enabled:boolean; approved:boolean;
  permission_reference:string|null; since_id:string|null; cursor:string|null; pending_since_id:string|null;
  interval_minutes:number; next_run_at:string; failures:number; lease_token?:string;
};
export function safeLink(value:unknown):string|null {
  if(typeof value!=='string'||value.length>2048)return null;
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
export function currentOpportunity(o:Opportunity,now=Date.now()) {
  return o.status==='published'&&Date.parse(o.fresh_until)>now&&(!o.expires_at||Date.parse(o.expires_at)>now);
}
export function isOpportunity(value:unknown):value is Opportunity {
 if(!value||typeof value!=='object')return false;
 const o=value as Opportunity;
 return typeof o.id==='string'&&o.id.length<=100&&typeof o.title==='string'&&o.title.length<=180&&typeof o.summary==='string'&&o.summary.length<=1200&&opportunityKinds.includes(o.kind)&&Array.isArray(o.tags)&&o.tags.every(t=>typeof t==='string')&&typeof o.confidence==='number'&&o.confidence>=0&&o.confidence<=1&&!!safeLink(o.source_url)&&[o.discovered_at,o.refreshed_at,o.fresh_until].every(d=>typeof d==='string'&&Number.isFinite(Date.parse(d)))&&[o.eligibility,o.location,o.official_url,o.official_verified_at,o.expires_at,o.space_id,o.venue_place_id].every(x=>x===null||typeof x==='string');
}
export function matchOpportunities(items:Opportunity[],preferences:{interests:string[];location:string},now=Date.now()) {
  // Explicit preferences only. No Lore, messages, contacts, GPS or provider call.
  const terms=preferences.interests.slice(0,12).map(x=>x.toLowerCase().trim()).filter(Boolean);
  const place=preferences.location.toLowerCase().trim();
  return items.filter(o=>currentOpportunity(o,now)).map(o=>{
    const hay=[o.kind,...o.tags,o.title,o.summary].join(' ').toLowerCase();
    const interests=terms.filter(t=>hay.includes(t));
    const nearby=!!place&&!!o.location&&o.location.toLowerCase().includes(place);
    return {opportunity:o,score:interests.length*2+Number(nearby),reasons:[...interests.map(t=>`Interest: ${t}`),...(nearby?['Matches your chosen location']:[])]};
  }).filter(x=>(!terms.length||x.reasons.some(r=>r.startsWith('Interest:')))&&(!place||x.opportunity.location?.toLowerCase().includes(place)))
    .sort((a,b)=>b.score-a.score||b.opportunity.refreshed_at.localeCompare(a.opportunity.refreshed_at));
}
export function classify(text:string):OpportunityKind|null {
  const rules:[OpportunityKind,RegExp][]=[['scholarship',/\bscholarship|bursary\b/i],['grant',/\bgrant|funding call\b/i],['job',/\bjob|hiring|vacancy|internship\b/i],['collaboration',/\bcollaborat|call for partners/i],['event',/\bevent|workshop|conference|concert|meetup\b/i],['offer',/\bdiscount|special offer\b/i],['service',/\bservice available|consultation\b/i],['community',/\bvolunteer|community opportunity\b/i]];
  return rules.find(([,pattern])=>pattern.test(text))?.[0]??null;
}
export function eligibleCandidate(text:string) {
  return text.length>=30&&text.length<=12000&&!!classify(text)&&/\bUganda|Kampala|Jinja|Entebbe|remote\b/i.test(text)&&!/\bseed phrase|guaranteed returns|pay to apply\b/i.test(text);
}
export function verifiedXScopes(granted:string[],verified:boolean) {
  // Reserved contract for future OAuth onboarding; never infers home-timeline access.
  return verified&&granted.includes('tweet.read')&&granted.includes('users.read')&&granted.every(s=>['tweet.read','users.read','offline.access'].includes(s));
}
