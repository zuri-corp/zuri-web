export const worlds = {
  lounge: { name: 'Lounge', mark: '✦', color: '#b7a2ff', description: 'A little space. A lot of possibility.', tabs: [] },
  aura: { name: 'Aura', mark: '◎', color: '#56dfd0', description: 'Find your people. Feel your place.', tabs: ['Home', 'Spaces', 'Societies', 'Find'] },
  motion: { name: 'Motion', mark: '↗', color: '#ffac70', description: 'Make room for what moves you.', tabs: ['Planner', 'Events', 'Trips', 'Pings'] },
  rizz: { name: 'Rizz', mark: '◈', color: '#ff81ac', description: 'Put a little of yourself out there.', tabs: ['Feed', 'Create', 'Channels', 'Chats'] },
  lore: { name: 'Lore', mark: '◒', color: '#91b6ff', description: 'Your life, beautifully collected.', tabs: ['Moments', 'Discover', 'Chapters', 'Profile'] },
} as const;
export type World = keyof typeof worlds;
export type Route = { world: World; tab: string; kind?: string; id?: string };
export const home: Route = { world: 'lounge', tab: '' };
export function routeHash(route: Route) {
  const query = new URLSearchParams();
  if (route.kind && route.id) { query.set('kind', route.kind); query.set('id', route.id); }
  return `#/${route.world}${route.tab ? '/' + route.tab.toLowerCase() : ''}${query.size ? '?' + query : ''}`;
}
export function parseRoute(hash: string): Route {
  try {
    const url = new URL(hash.replace(/^#/, '') || '/', 'https://zuri.local');
    const [name, segment] = url.pathname.split('/').filter(Boolean);
    if (!Object.prototype.hasOwnProperty.call(worlds, name)) return home;
    const world = name as World;
    const tabs: readonly string[] = worlds[world].tabs;
    const tab = tabs.find(t => t.toLowerCase() === segment) || tabs[0] || '';
    const kind = url.searchParams.get('kind') || undefined;
    const id = url.searchParams.get('id') || undefined;
    return { world, tab, ...(kind && id && ['space', 'society', 'event', 'ping', 'trip', 'person', 'chapter', 'channel', 'chat', 'moment'].includes(kind) ? { kind, id } : {}) };
  } catch { return home; }
}
export type Post = { id: string; text: string; created: string; image?: string; spaceId?: string };
export type Task = { id: string; text: string; done: boolean; date: string };
export type Message = { id: string; text: string; personId: string; created: string };
export type Automation = { id: string; name: string; enabled: boolean; lastRun?: string };
export type LocalData = {
  version: 2; name: string; bio: string; saved: string[]; joined: string[]; plan: string[];
  posts: Post[]; tasks: Task[]; messages: Message[]; liked: string[];
  automations: Automation[]; widgets: string[]; chapters: {id:string; title:string; momentIds:string[]}[];
};
export const initialData: LocalData = { version: 2, name: 'Alex Kato', bio: 'Curious about people, places and what comes next. Jinja, Uganda.', saved: [], joined: [], plan: [], posts: [], tasks: [], messages: [], liked: [], automations: [{ id: 'daily', name: 'Build my daily focus list', enabled: false }], widgets: ['planner', 'saved', 'automations'], chapters: [] };
export function readData(raw: string | null): LocalData {
  if (!raw) return structuredClone(initialData);
  const value = JSON.parse(raw);
  if (value?.version !== 2 || typeof value.name !== 'string' || value.name.length > 60 || typeof value.bio !== 'string') throw new Error('Saved workspace has an unsupported format.');
  for (const key of ['saved', 'joined', 'plan', 'liked', 'widgets']) if (!Array.isArray(value[key]) || !value[key].every((x: unknown) => typeof x === 'string')) throw new Error('Saved workspace is incomplete.');
  for (const key of ['posts', 'tasks', 'messages', 'automations']) if (!Array.isArray(value[key]) || !value[key].every((x: unknown) => x && typeof x === 'object' && typeof (x as {id?: unknown}).id === 'string')) throw new Error('Saved records are incomplete.');
  if (!value.posts.every((x: Post) => typeof x.text === 'string' && typeof x.created === 'string') || !value.tasks.every((x: Task) => typeof x.text === 'string' && typeof x.done === 'boolean' && typeof x.date === 'string') || !value.messages.every((x: Message) => typeof x.text === 'string' && typeof x.personId === 'string' && typeof x.created === 'string') || !value.automations.every((x: Automation) => typeof x.name === 'string' && typeof x.enabled === 'boolean')) throw new Error('Saved record content is invalid.');
  value.chapters ??= [];
  if (!Array.isArray(value.chapters) || !value.chapters.every((c: {id:string;title:string;momentIds:string[]}) => c && typeof c.id === 'string' && typeof c.title === 'string' && Array.isArray(c.momentIds) && c.momentIds.every(id => typeof id === 'string'))) throw new Error('Saved chapters are invalid.');
  return value as LocalData;
}
export function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export function runFocus(data: LocalData, date = today()): LocalData {
  const id = `focus-${date}`;
  return { ...data, tasks: data.tasks.some(t => t.id === id) ? data.tasks : [...data.tasks, { id, text: 'Choose one meaningful thing for today', date, done: false }], automations: data.automations.map(a => a.id === 'daily' ? { ...a, lastRun: date } : a) };
}
