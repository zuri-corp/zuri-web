import Link from 'next/link';
import {Suspense} from 'react';
import {connection} from 'next/server';
import {approvedKnowledge,knowledgeVersion,unconfirmedPolicies} from '@/lib/ai/knowledge/catalog';
import {eligibleKnowledge,searchKnowledge} from '@/lib/ai/knowledge/search';
export const metadata={title:'What ZURI AI knows'};
type PageProps={searchParams:Promise<{q?:string|string[]}>};
export default function Page(props:PageProps){
 return <Suspense fallback={<main id="main" className="intent-page"><section className="intent-explained"><p role="status">Loading ZURI’s public knowledge…</p></section></main>}><KnowledgeContent {...props}/></Suspense>;
}
async function KnowledgeContent({searchParams}:PageProps){
 // Source expiry is evaluated against the time of this request, not prerendering.
 await connection();
 const params=await searchParams,query=typeof params.q==='string'?params.q.trim().slice(0,1500):'';
 const result=query.length>=2?searchKnowledge(query,approvedKnowledge,knowledgeVersion):null;
 const docs=result?.documents??approvedKnowledge.filter(d=>eligibleKnowledge(d,'website'));
 return <main id="main" className="intent-page"><section className="intent-explained"><p className="eyebrow">ZURI AI / PUBLIC KNOWLEDGE</p><h1>Clear facts.<br/>Visible sources.</h1><p>See the public information available to ZURI AI: services, guide prices, product boundaries and how to reach us. Private accounts and business records are outside this catalogue.</p><p>This first edition is curated from the existing public website. Inclusion means the source is allowlisted; it does not claim a new policy approval or independent verification. Proposed features remain proposed.</p><form action="/ai-knowledge" method="get"><label htmlFor="knowledge-question">Test what the catalogue can find</label><div style={{display:'flex',gap:12,margin:'12px 0',flexWrap:'wrap'}}><input id="knowledge-question" name="q" defaultValue={query} maxLength={1500} minLength={2} placeholder="What does a business website cost?" style={{flex:'1 1 260px',padding:14,border:'1px solid #7c8c94',borderRadius:10,background:'#fff',color:'#142e38'}}/><button type="submit" style={{padding:'12px 20px',background:'#063e42',color:'#fff',borderRadius:10}}>Find sources ↗</button></div></form><p><small>Source matching only. This does not call an AI model, spend an allowance or send your question to OpenAI. Questions appear in the page URL; keep them public.</small></p>
 <h2>Not yet confirmed</h2><ul>{unconfirmedPolicies.map(p=><li key={p.id}>{p.label}</li>)}</ul><p>Ask the team to agree these in your written scope. AI must not invent them.</p>
 <h2>{result?`${docs.length} matching sources`:`${docs.length} catalogue sources`}</h2>{result?.status==='not-found'&&<p>No approved source matched. That is a knowledge gap, not proof that ZURI offers or refuses the service. <Link href="/tech/enquire">Ask the team ↗</Link></p>}{!!result?.missingPolicies.length&&<p role="status">Your question touches a policy that has not been confirmed. Relevant pricing guidance is shown below, without a policy promise.</p>}
 {docs.map(d=><details key={d.id} style={{padding:'20px 0',borderBottom:'1px solid #9eafb6'}}><summary style={{cursor:'pointer',fontWeight:600}}>{d.title} {d.availability==='proposed'?'· Proposed':'· Published guidance'}</summary><p>{d.body}</p><p><Link href={d.href}>View the website source ↗</Link></p><small>Source {d.id} · Revision {d.revision}</small></details>)}<p><small>Catalogue version {knowledgeVersion}. AI can still make mistakes; source links support review and do not certify every generated claim.</small></p><p><Link href="/ai-privacy">AI privacy &amp; your choices ↗</Link> · <Link href="/tech#zuri-conversation">Talk with ZURI ↗</Link></p></section></main>;
}
