import TechnologyFinder from '@/components/site/TechnologyFinder';
import {Suspense} from 'react';
export const metadata={title:'Find the right technology',description:'Begin with the goal, not the name of a tool.'};
export default function Page(){return <main id="main" className="tech-page"><div className="page-wrap section-pad finder-wrap"><Suspense fallback={<p role="status">Opening your starting points…</p>}><TechnologyFinder/></Suspense></div></main>}

