import Link from 'next/link';
import BrandMark from '@/components/BrandMark';
export default function SiteFooter(){return <footer className="global-footer"><div className="page-wrap footer-grid"><div><Link href="/" className="parent-wordmark" aria-label="ZURI home"><BrandMark/></Link><p>Powering &amp; Distributing Good Systems<br/>Discover what’s good. Put it to work.</p></div><nav aria-label="Footer destinations"><p className="eyebrow">Explore</p><Link href="/tech">Tech</Link><Link href="/select">Select</Link><Link href="/pamoja">Pamoja</Link><Link href="/about">About</Link><Link href="/pricing">Plans & services</Link></nav><div><p className="eyebrow">Make something possible</p><p>A project, a question<br/>or a new connection.</p><Link href="/contact" className="text-link">Get in touch →</Link></div></div><div className="page-wrap footer-bottom"><span>© 2026 ZURI. All rights reserved.</span><span>Shared foundation. Distinct experiences. One ZURI.</span></div></footer>;}



