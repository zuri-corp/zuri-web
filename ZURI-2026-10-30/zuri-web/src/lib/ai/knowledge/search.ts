import {safeKnowledgeHref,type KnowledgeDocument,type KnowledgeResult} from './types';
const stop=new Set('a an the to for my your our me i we us is are be do does can could would should please tell about what how it this that of and or in on with zuri'.split(' '));
function tokens(text:string){return text.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N} -]/gu,' ').split(/[\s-]+/).filter(t=>t.length>1&&!stop.has(t));}
export function eligibleKnowledge(doc:KnowledgeDocument,surface:'website'|'app',now=Date.now()){
 return doc.state==='included'&&doc.approvedRevision===doc.revision&&safeKnowledgeHref(doc.href)&&(doc.surface==='both'||doc.surface===surface)&&(!doc.validUntil||(Number.isFinite(Date.parse(doc.validUntil))&&Date.parse(doc.validUntil)>now));
}
export function searchKnowledge(query:string,documents:readonly KnowledgeDocument[],version:string,surface:'website'|'app'='website',now=Date.now()):KnowledgeResult{
 if(typeof query!=='string'||query.trim().length<2||query.length>1500)throw Error('Use a question between 2 and 1,500 characters.');
 const q=query.toLowerCase(),terms=[...new Set(tokens(query))],missingPolicies:string[]=[];
 if(/\b(?:refund|cancell?ation|cancel (?:my|a|the) (?:order|project|service))\b/.test(q))missingPolicies.push('refunds');
 if(/\b(?:deposit|down payment|payment percentage|payment milestones)\b/.test(q))missingPolicies.push('deposits');
 if(/\b(?:response time|respond|reply|business hours|office hours|opening hours|support hours|how soon|how long.{0,15}(?:reply|respond))\b/.test(q))missingPolicies.push('response-time');
 const price=/\b(?:price|pricing|cost|how much|charge|fee|ugx)\b/.test(q);
 const scored=documents.filter(d=>eligibleKnowledge(d,surface,now)).map(doc=>{
  const title=tokens(doc.title),topics=tokens(doc.topics.join(' ')),body=tokens(doc.body),id=doc.id;
  let score=terms.reduce((sum,t)=>sum+(title.includes(t)?7:0)+(topics.includes(t)?5:0)+(body.includes(t)?1:0),0);
  if(/\b(?:website|web site)\b/.test(q)&&id==='offer.business-website')score+=price?25:6;
  if(/\b(?:invites|wedding|invitation|rsvp)\b/.test(q)&&id.startsWith('offer.invites-'))score+=price?18:0;
  if(/\b(?:individual|personal|for me)\b/.test(q)&&id==='offer.zuri-individual')score+=price?22:4;
  if(/\b(?:business|businesses)\b/.test(q)&&/\b(?:membership|subscription|plan|monthly)\b/.test(q)&&id==='offer.zuri-business')score+=price?25:10;
  if(/\b(?:what is zuri|about zuri|three worlds|corporate)\b/.test(q)&&id==='zuri.overview')score+=30;
  if(id.startsWith('offer.')&&price&&!/\b(?:website|web site|invites|wedding|invitation|rsvp|individual|personal|business|team|presence|space|care|tool|setup|automation|training|session)\b/.test(q))score=0;
  if(price&&id==='pricing.terms')score+=14;
  if(missingPolicies.length&&id==='pricing.terms')score+=35;
  return {doc,score};
 }).filter(item=>item.score>=5).sort((a,b)=>b.score-a.score||a.doc.id.localeCompare(b.doc.id));
 const selected:KnowledgeDocument[]=[];let bytes=0;
 for(const {doc}of scored){const size=new TextEncoder().encode(doc.body).length;if(selected.length>=5)break;if(bytes+size>7800)continue;selected.push(doc);bytes+=size;}
 return {status:selected.length?'matched':'not-found',documents:selected,missingPolicies,version,scope:'public-zuri'};
}
