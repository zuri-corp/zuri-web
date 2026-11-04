"use client";
import Link from 'next/link';
import BrandMark from '@/components/BrandMark';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { destination, destinationLinks } from '@/lib/navigation/routes';
export default function SiteHeader() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const world = destination(pathname);
    const [open, setOpen] = useState<'none' | 'navigation' | 'worlds'>('none');
    const toggle = useRef<HTMLButtonElement>(null);
    const switcher = useRef<HTMLButtonElement>(null);
    const header = useRef<HTMLElement>(null);
    useEffect(() => { function escape(e: KeyboardEvent) { if (e.key === 'Escape' && open !== 'none') {
        (open === 'worlds' ? switcher : toggle).current?.focus();
        setOpen('none');
    } } function outside(e: MouseEvent) { if (header.current && !header.current.contains(e.target as Node))
        setOpen('none'); } document.addEventListener('keydown', escape); document.addEventListener('click', outside); return () => { document.removeEventListener('keydown', escape); document.removeEventListener('click', outside); }; }, [open]);
    const links = destinationLinks[world];
    const home = world === 'corporate' ? '/' : `/${world}`;
    const title = world === 'tech' ? 'Tech' : world === 'select' ? 'Select' : 'Pamoja';
    const cta = world === 'tech' ? { href: '/tech#zuri-conversation', label: 'Talk to ZURI ↗' } : world === 'pamoja' ? { href: '/pamoja/connect', label: 'Find your place ↗' } : { href: '/contact', label: 'Let’s talk ↗' };
    function active(href: string) { if (world === 'pamoja' && pathname === '/pamoja') {
        const type = searchParams.get('type') ?? 'all';
        return href === '/pamoja' ? type === 'all' : href.endsWith(`type=${type}`);
    } if (world === 'tech' && href === '/tech/services')
        return /^\/tech\/(partnership|software|business-technology|ai-automation|security|training|digital-marketing|services)(\/|$)/.test(pathname); if (world === 'tech' && href === '/tech/products')
        return pathname.startsWith('/tech/products') || pathname.startsWith('/tech/invites'); return pathname === href; }
    return <><a className="skip-link" href="#main">Skip to content</a><header ref={header} className={`global-header destination-header ${world}`}><div className="header-inner">{world === 'corporate' ? <Link href="/" className="parent-wordmark" onClick={() => setOpen('none')} aria-label="ZURI home"><BrandMark/></Link> : <div className="destination-identity"><Link href="/" className="zuri-parent-link" aria-label="Return to ZURI"><BrandMark/></Link><span aria-hidden="true">/</span><Link href={home} className="destination-wordmark" onClick={() => setOpen('none')}><BrandMark world={world}/></Link></div>}<nav className="desktop-nav" aria-label={world === 'corporate' ? 'ZURI destinations' : `${title} navigation`}>{links.map(l => <Link key={l.href} href={l.href} aria-current={active(l.href) ? 'page' : undefined} onClick={() => setOpen('none')}>{l.label}</Link>)}</nav>{world !== 'corporate' && <button ref={switcher} className="world-switcher" type="button" aria-expanded={open === 'worlds'} aria-controls="world-menu" onClick={() => setOpen(open === 'worlds' ? 'none' : 'worlds')}>More from ZURI <span aria-hidden="true">⌄</span></button>}<Link href={cta.href} className="header-contact">{cta.label}</Link><button ref={toggle} className="mobile-toggle" type="button" aria-expanded={open === 'navigation'} aria-controls="mobile-menu" onClick={() => setOpen(open === 'navigation' ? 'none' : 'navigation')}>{open === 'navigation' ? 'Close' : 'Menu'}</button></div>{open === 'worlds' && <nav id="world-menu" className="world-menu" aria-label="Other ZURI destinations">{destinationLinks.corporate.map(l => <Link key={l.href} href={l.href} onClick={() => setOpen('none')}>{l.label} ↗</Link>)}</nav>}{open === 'navigation' && <nav id="mobile-menu" className="mobile-nav" aria-label={`${title} mobile navigation`}>{links.map(l => <Link key={l.href} href={l.href} onClick={() => setOpen('none')} aria-current={active(l.href) ? 'page' : undefined}>{l.label}<span aria-hidden="true">↗</span></Link>)}<Link href={cta.href} onClick={() => setOpen('none')}>{cta.label}</Link>{world !== 'corporate' && <><p className="eyebrow mt-6">Elsewhere at ZURI</p>{destinationLinks.corporate.map(l => <Link key={l.href} href={l.href} onClick={() => setOpen('none')}>{l.label}</Link>)}</>}</nav>}</header></>;
}

