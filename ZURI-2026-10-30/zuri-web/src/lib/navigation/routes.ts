export const reservedAddresses = ['ai-knowledge', 'ai-privacy', 'intent', 'app', 'zuri-app', 'pricing', 'experience', 'tech', 'select', 'pamoja', 'search', 'about', 'admin', 'api', 'contact', 'brands', '_next', '_not-found', 'auth', 'login', 'logout', 'signin', 'signup', 'account', 'settings', 'dashboard', 'claim', 'requests', 'moments', 'privacy', 'terms', 'zuri', 'robots', 'sitemap', 'favicon'] as const;
export function validSpaceAddress(value: string) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 90 && !(reservedAddresses as readonly string[]).includes(value); }
export function destination(pathname: string) {
    if (pathname === '/tech' || pathname.startsWith('/tech/'))
        return 'tech';
    if (pathname === '/select' || pathname.startsWith('/select/'))
        return 'select';
    if (pathname === '/pamoja' || pathname.startsWith('/pamoja/'))
        return 'pamoja';
    if (/^\/[a-z0-9-]+$/.test(pathname) && validSpaceAddress(pathname.slice(1)))
        return 'pamoja';
    return 'corporate';
}
export const destinationLinks = {
    corporate: [{ label: 'Tech', href: '/tech' }, { label: 'Select', href: '/select' }, { label: 'Pamoja', href: '/pamoja' }, { label: 'ZURI app', href: '/app' }, { label: 'About', href: '/about' }, { label: 'Plans & services', href: '/pricing' }],
    tech: [{ label: 'Developer Studio', href: '/tech/studio' }, { label: 'ZURI Invites', href: '/tech/invites' }, { label: 'Plans & services', href: '/pricing' }],
    select: [{ label: 'The edition', href: '/select' }, { label: 'Our standard', href: '/select#our-standard' }],
    pamoja: [{ label: 'For you', href: '/pamoja#for-individuals' }, { label: 'For business', href: '/pamoja#for-businesses' }, { label: 'Spaces', href: '/pamoja#spaces' }, { label: 'ZURI app', href: '/app' }, { label: 'Tools', href: '/pamoja/tools' }, { label: 'My Pamoja', href: '/pamoja/account' }],
};






