import Link from 'next/link';
import BrandMark from '@/components/BrandMark';
import {loadStories} from '@/lib/publishing/public';
import ContentState from '@/components/site/ContentState';
import WorldWaves from '@/components/site/WorldWaves';
import SelectLibrary from '@/components/site/SelectLibrary';
export const metadata={title:'Select — A considered point of view',description:'Read the AI at Work series in order, explore products, policy and technology history, and find a story worth your attention.'};
export default async function Select(){
 const delivery=await loadStories();
 const firstPart=delivery.items.filter(s=>s.series?.startsWith('AI at Work')).sort((a,b)=>(a.series??'').localeCompare(b.series??''))[0];
 return <main id="main" className="select-edition">
  <header className="edition-masthead page-wrap"><WorldWaves/>
   <div className="edition-kicker"><span>Technology / Products / People</span><span>{delivery.preview?'The first edition / Editorial preview':'The Select edition'}</span></div>
   <div className="edition-title"><h1>A considered<br/><em>point of view.</em></h1><div><p>Understand it.<br/>Put it to work.</p><a href="#edition" className="text-link">Find your next read ↓</a></div></div>
   <div className="edition-reading-note"><span>START HERE</span>{firstPart?<Link href={`/select/${firstPart.slug}`}>AI at Work · A practical series ↗</Link>:<a href="#edition">Explore stories by topic ↓</a>}<span>Then explore the bigger picture.</span></div>
  </header>
  <section id="edition" className="page-wrap select-library-wrap">{!delivery.available||!delivery.items.length?<ContentState available={delivery.available} label="stories"/>:<SelectLibrary stories={delivery.items}/>}</section>
  <section id="our-standard" className="select-standard"><div className="page-wrap"><BrandMark world="select"/><p className="eyebrow">Taste. Curiosity. Independence.</p><h2>Interesting enough to explore.<br/><em>Independent enough to question.</em></h2><div className="standard-columns"><p>We choose stories with a reason. Technology, products, design and the people behind them—with a view of the world from here.</p><p>Commercial relationships never purchase a favourable verdict. Sponsorship is identified. Moments can inspire a story; reporting still does the work.</p></div><Link href="/contact" className="text-link">Have something worth exploring? ↗</Link></div></section>
 </main>;
}
