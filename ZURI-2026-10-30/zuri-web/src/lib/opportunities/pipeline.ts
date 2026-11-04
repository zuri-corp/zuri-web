import {createHash} from 'node:crypto';
import {eligibleCandidate,classify,type Source} from './model';
import {fetchX,type Page} from './connectors';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function preparePage(page:Page) {
  const seen=new Set<string>();
  return page.items.filter(p=>eligibleCandidate(p.text)).filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;}).map(p=>({
    external_id:p.id,content_hash:hash(p.text),fingerprint:hash(p.text.toLowerCase().replace(/https:\/\/\S+/g,'').replace(/\s+/g,' ').trim()),
    kind:classify(p.text),title:p.text.split('\n').find(x=>x.trim())!.slice(0,180),summary:p.text.slice(0,1200),
    location:p.text.match(/\b(Kampala|Jinja|Entebbe|Uganda|remote)\b/i)?.[0]??null,source_url:p.url,
    // Dates, money, eligibility and official verification stay unknown until evidence review.
  }));
}
type Store={claim:()=>Promise<{source:Source;run_id:string}|null>;knownFingerprints?:(fingerprints:string[])=>Promise<string[]>;finish:(source:Source,run:string,payload:Record<string,unknown>)=>Promise<void>};
export async function runDiscovery(store:Store,token:string,fetchPage=fetchX,extract?:(text:string)=>Promise<unknown>) {
  const claim=await store.claim();if(!claim)return {status:'idle',reason:'No approved source due, or budget/policy is disabled.'};
  const {source,run_id}=claim;
  try{
    const page=await fetchPage(source,token),items=preparePage(page);
    // At most one metered extraction per shared tick, after deterministic filtering.
    const enriched:Record<string,unknown>[]=items;
    const known=new Set(store.knownFingerprints?await store.knownFingerprints(items.map(i=>i.fingerprint)):[]);
    const index=items.findIndex(i=>!known.has(i.fingerprint));
    if(extract&&index>=0)enriched[index]={...items[index],extracted:await extract(items[index].summary)};
    await store.finish(source,run_id,{status:page.retryAt?'backoff':'complete',items:enriched,fetched:page.items.length,filtered:page.items.length-items.length,cursor:page.cursor,newest_id:source.pending_since_id??page.newestId,retry_at:page.retryAt??null});
    return {status:page.retryAt?'backoff':'complete',fetched:page.items.length,candidates:items.length};
  }catch{
    // No provider response body, credential or private data in logs or admin errors.
    await store.finish(source,run_id,{status:'failed',items:[],error:'Provider or ingestion failed; review configuration and access.',retry_at:new Date(Date.now()+Math.min(3600000,60000*2**Math.min(source.failures,6))).toISOString()});
    return {status:'failed'};
  }
}
