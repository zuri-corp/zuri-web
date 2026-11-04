'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { marketplaceCategories, technologyProducts } from '@/lib/technology/products';

export default function TechnologyShelf() {
 const [expanded,setExpanded]=useState(false);
 const [category,setCategory]=useState('all'); const [query,setQuery]=useState(''); const [failedLogos,setFailedLogos]=useState<string[]>([]);
 const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
 const products=technologyProducts.filter(product=>{const group=marketplaceCategories.find(item=>item.id===product.category)!;const words=`${product.name} ${product.title} ${product.description} ${group.name}`.toLowerCase().split(/[^a-z0-9]+/);return(category==='all'||product.category===category)&&terms.every(term=>words.some(word=>word.startsWith(term)))});
 const selected=marketplaceCategories.find(item=>item.id===category);
 const shownProducts=expanded?products:marketplaceCategories.map(group=>technologyProducts.find(product=>product.category===group.id)!);
 return <section className={`real-product-shelf expanded-tool-shelf${expanded?'':' tool-shelf-collapsed'}`} aria-label="Curated technology shelf">
  <div className="tool-shelf-intro"><div><p className="eyebrow">02 / Marketplace · 25 tools · 5 categories</p><h3>Good tools. <em>Put to work.</em></h3></div><button type="button" className="button button-white tool-expand" aria-expanded={expanded} aria-controls="marketplace-tools" onClick={()=>{setExpanded(!expanded);setCategory('all');setQuery('')}}>{expanded?'Show less ↑':'Explore all 25 tools ↓'}</button></div>
  {expanded&&<>
  <div className="tool-category-picker" role="group" aria-label="Filter technology products"><button type="button" aria-pressed={category==='all'} onClick={()=>setCategory('all')}><span>01—25</span><strong>All tools</strong><small>The whole shortlist</small></button>{marketplaceCategories.map((group,index)=><button type="button" key={group.id} aria-pressed={category===group.id} onClick={()=>setCategory(group.id)}><span>0{index+1} / 5 tools</span><strong>{group.name}</strong><small>{group.description}</small></button>)}</div>
  <div className="tool-results-toolbar"><div><p className="tool-category-title">{selected?.name??'The whole shortlist'}</p><p role="status" aria-live="polite">{products.length} {products.length===1?'tool':'tools'} to explore{query?` for “${query}”`:''}</p></div><label className="tool-search"><span>Find a tool</span><input type="search" value={query} maxLength={100} placeholder="Try Notion, invoices, passwords…" onChange={event=>setQuery(event.target.value)}/></label></div>
  </>}
  {shownProducts.length?<div id="marketplace-tools" className="real-product-grid">{shownProducts.map(product=><article key={product.id} className={`real-product product-${product.id}`}>
   <header className="tool-card-heading"><div className="official-tool-logo" aria-hidden="true">{product.logo&&!failedLogos.includes(product.id)?<Image src={product.logo} alt="" width={46} height={46} unoptimized onError={()=>setFailedLogos(previous=>[...previous,product.id])}/>:<span className="tool-text-reference">↗</span>}</div><div><p>{marketplaceCategories.find(group=>group.id===product.category)!.name}</p><h3>{product.name}{product.id==='quickbooks'&&<sup>®</sup>}</h3></div></header>
   <div className="real-product-copy"><p className="tool-promise">{product.title}</p><p>{product.description}</p><div className="product-setup-note"><span>WITH ZURI</span><p>{product.help}</p></div><div className="product-actions"><Link href={`/tech/enquire?service=${product.service}&goal=${product.goal}&audience=business&product=${product.id}`} className="text-link">Help me use it ↗</Link><a href={product.url} target="_blank" rel="noopener noreferrer" aria-label={`Explore ${product.name} on the official website`}>Official website ↗</a></div></div>
  </article>)}</div>:<div className="tool-no-results"><h3>No tools match that search.</h3><p>Try a name, a task or another category.</p><button type="button" className="button button-white" onClick={()=>{setQuery('');setCategory('all')}}>Show all 25 tools →</button></div>}
  {expanded&&<div className="marketplace-fitting"><div><strong>The tool is the starting point.</strong><p>ZURI helps with the choice, setup, connections and training.</p></div><Link href="/tech/find" className="button button-blue">Find my starting point ↗</Link></div>}
  <p className="marketplace-disclosure">Independent guidance and services from ZURI. Buy subscriptions directly from the provider. Product availability, payment support and features vary by region and plan. Listings do not imply endorsement, certification or a reseller relationship. Product names and logos belong to their respective owners.</p>
  <p className="marketplace-disclosure">QuickBooks is a trademark of Intuit Inc., registered in the US and other countries. This listing and ZURI’s services have not been approved by Intuit. Adobe and Adobe Express are either registered trademarks or trademarks of Adobe in the United States and other countries.</p>
 </section>;
}
