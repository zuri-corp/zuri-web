import Link from 'next/link';

const offerings = [
  { title: 'Websites & software', detail: 'Build your next idea', href: '/tech/software', path: 'm8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 14' },
  { title: 'AI & automation', detail: 'Make work flow', href: '/tech/ai-automation', path: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z' },
  { title: 'Business tools', detail: 'Connect the everyday', href: '/tech/business-technology', path: 'M3 4h7v7H3Zm11 0h7v7h-7ZM3 15h7v6H3Zm11 0h7v6h-7Z' },
  { title: 'Digital marketing', detail: 'Help good work reach further', href: '/tech/digital-marketing', path: 'm4 10 15-6v16L4 14Zm3 5 2 6h4l-2-5M4 10H2v4h2' },
  { title: 'Security & privacy', detail: 'Protect what matters', href: '/tech/security', path: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Zm-4 9 3 3 5-6' },
  { title: 'Training & support', detail: 'Move forward with confidence', href: '/tech/training', path: 'm2 8 10-5 10 5-10 5Zm4 3v6l6 4 6-4v-6m4-3v9' },
];

export default function TechServicesGraphic() {
  return <div className="tech-system-graphic">
    <div className="system-grid" aria-hidden="true" />
    <div className="system-graphic-top"><span>ZURI TECH / CAPABILITIES</span><span className="system-signal" aria-hidden="true"><i/><i/><i/></span></div>
    <p className="system-graphic-title">Good systems.<br/><em>Working together.</em></p>
    <div className="system-hub"><span aria-hidden="true">✦</span><strong>Your idea. Our expertise.</strong><span aria-hidden="true">↗</span></div>
    <nav className="system-offerings" aria-label="Explore ZURI Tech services">{offerings.map((offer, index) => <Link key={offer.href} href={offer.href}>
      <span className="system-service-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={offer.path}/></svg></span>
      <span className="system-service-number" aria-hidden="true">0{index + 1}</span>
      <strong>{offer.title}</strong><small>{offer.detail}</small><span className="system-service-arrow" aria-hidden="true">↗</span>
    </Link>)}</nav>
    <div className="system-graphic-bottom"><span className="status-dot"/> Built around what you need.<span aria-hidden="true">01 — 06</span></div>
  </div>;
}
