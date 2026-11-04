export const goals = [
    { id: 'business-finances', label: 'Keep track of money and business admin', question: 'Is this mainly for you or a team?', service: 'business-technology', reason: 'Start by understanding the work, then choose and set up suitable tools.' },
    { id: 'online-presence', label: 'Give my work or business a home online', question: 'Who will this presence represent?', service: 'software', reason: 'A portfolio, a business website or a simple Space may suit different needs. Start with the presence you want to create.' },
    { id: 'work-better', label: 'Make everyday work simpler', question: 'Who needs to work more smoothly?', service: 'business-technology', reason: 'Existing tools, better setup or a small integration may be enough. Custom software is not always the first step.' },
    { id: 'privacy', label: 'Improve my privacy or digital security', question: 'Who is the guidance for?', service: 'security', reason: 'Start with practical habits and setup. ZURI can clarify the scope; specialist testing is considered separately.' },
    { id: 'ai', label: 'Find a useful way to use AI', question: 'Who would use it?', service: 'ai-automation', reason: 'Begin with a real task and a way to judge whether AI helps, rather than adding AI for its own sake.' },
    { id: 'custom', label: 'Build or connect something specific', question: 'Who will use the system?', service: 'software', reason: 'Define the problem, examine existing options, and build or integrate when that is the useful next step.' },
    { id: 'celebration', label: 'Bring a wedding celebration together', question: 'Who are you planning for?', service: 'invites', reason: 'ZURI Invites brings a wedding story and practical guest information into one considered experience.' },
    { id: 'creative', label: 'Choose or set up creative tools', question: 'Who will use the tools?', service: 'business-technology', reason: 'The useful choice depends on your craft, workflow and the tools you already have.' },
] as const;
export const audiences = [{ id: 'individual', label: 'Me / an individual' }, { id: 'business', label: 'A small business or team' }, { id: 'organization', label: 'A larger organization' }] as const;
export function guidance(goal: string, audience: string) {
    const chosen = goals.find(g => g.id === goal);
    const person = audiences.find(a => a.id === audience);
    if (!chosen || !person)
        return null;
    return { goal: chosen.id, audience: person.id, title: chosen.service === 'invites' ? 'Start with ZURI Invites' : 'A useful place to begin', reason: chosen.reason, service: chosen.service, href: chosen.service === 'invites' ? '/tech/invites' : `/tech/${chosen.service}`, enquiryHref: chosen.service === 'invites' ? '/tech/invites/enquire' : `/tech/enquire?service=${chosen.service}&goal=${chosen.id}&audience=${person.id}`, context: `Goal: ${chosen.label}\nFor: ${person.label}` };
}
export function enquiryContext(goal: string | undefined, audience: string | undefined) { return guidance(goal ?? '', audience ?? '')?.context ?? ''; }
export const shelfCategories = [
    { id: 'ai', name: 'AI', description: 'Tools that help with a real task, with a clear role for human judgment.' },
    { id: 'business', name: 'Business', description: 'The practical systems behind running an organization.' },
    { id: 'productivity', name: 'Productivity', description: 'Less friction in the work you do every day.' },
    { id: 'security', name: 'Security & privacy', description: 'Practical protection, with an honest account of what a product can and cannot do.' },
    { id: 'creative', name: 'Creative', description: 'Tools that support your craft and fit the way you work.' },
] as const;
// No third-party endorsement, resale agreement or price is inferred from strategy.
export type ShelfProduct = {
    slug: string;
    name: string;
    provider: string;
    category: typeof shelfCategories[number]['id'];
    description: string;
    fits: string[];
    considerations: string[];
    officialUrl: string;
};
export const approvedShelf: readonly ShelfProduct[] = [];
