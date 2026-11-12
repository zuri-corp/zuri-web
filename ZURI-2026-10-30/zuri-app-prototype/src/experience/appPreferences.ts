export const preferenceKey='zuri-appearance-v1';
export const palettes=[
 {id:'midnight',name:'Midnight',hint:'Ink blue & silver',swatches:['#101827','#202c40','#abc7ff']},
 {id:'graphite',name:'Graphite',hint:'Soft charcoal & lilac',swatches:['#17171c','#292930','#c8b9f2']},
 {id:'lagoon',name:'Lagoon',hint:'Deep teal & sea glass',swatches:['#0d2528','#183c40','#8ad9c7']},
 {id:'orchid',name:'Orchid',hint:'Plum & lavender',swatches:['#251a30','#3b2949','#e0b4ff']},
 {id:'moss',name:'Moss',hint:'Forest & warm stone',swatches:['#1b251d','#303e30','#c2d5a4']},
 {id:'clay',name:'Clay',hint:'Earth & soft copper',swatches:['#2b201c','#44332a','#e8bb9d']},
] as const;
export const wallpapers=[{id:'aurora',name:'Aurora'},{id:'horizon',name:'Horizon'},{id:'bloom',name:'Bloom'},{id:'dunes',name:'Dunes'},{id:'nightfall',name:'Nightfall'},{id:'plain',name:'Just my theme'}] as const;
export const widgetOptions=[{id:'planner',name:'My next steps',detail:'Your open tasks, at a glance.'},{id:'events',name:'Coming up',detail:'Upcoming events from the live feed.'},{id:'channels',name:'My channels',detail:'A shortcut to the channels you own or follow.'},{id:'quick-actions',name:'Quick create',detail:'Start a Ping, a Chapter, a Space or a Society.'}] as const;
export type AppPreferences={version:1;palette:typeof palettes[number]['id'];mode:'system'|'day'|'night';font:'modern'|'humanist'|'serif';size:'standard'|'large'|'largest';density:'comfortable'|'compact';wallpaper:typeof wallpapers[number]['id'];customWallpaper:string|null;widgets:string[]};
export const defaultPreferences:AppPreferences={version:1,palette:'midnight',mode:'night',font:'modern',size:'standard',density:'comfortable',wallpaper:'aurora',customWallpaper:null,widgets:['planner','events','quick-actions']};
const member=(value:unknown,values:readonly string[])=>typeof value==='string'&&values.includes(value);
export function normalizePreferences(value:unknown):AppPreferences{
 const v=(value&&typeof value==='object'?value:{}) as Partial<AppPreferences>;
 return {...defaultPreferences,
  palette:member(v.palette,palettes.map(p=>p.id))?v.palette!:defaultPreferences.palette,
  mode:member(v.mode,['system','day','night'])?v.mode!:'night',font:member(v.font,['modern','humanist','serif'])?v.font!:'modern',size:member(v.size,['standard','large','largest'])?v.size!:'standard',density:v.density==='compact'?'compact':'comfortable',
  wallpaper:member(v.wallpaper,wallpapers.map(p=>p.id))?v.wallpaper!:'aurora',customWallpaper:typeof v.customWallpaper==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v.customWallpaper)&&v.customWallpaper.length<1500000?v.customWallpaper:null,
  widgets:Array.isArray(v.widgets)?Array.from(new Set(v.widgets.filter(id=>widgetOptions.some(w=>w.id===id)))):defaultPreferences.widgets.slice()};
}
export function loadPreferences(storage:Pick<Storage,'getItem'>|undefined=typeof localStorage==='undefined'?undefined:localStorage):AppPreferences{
 try {const current=storage?.getItem(preferenceKey);if(current)return normalizePreferences(JSON.parse(current));const old=JSON.parse(storage?.getItem('zuri-experience-v2')||'{}');return normalizePreferences({size:storage?.getItem('zuri-text-size'),mode:old.pamoja?.preferences?.mode,wallpaper:old.pamoja?.preferences?.wallpaper==='forest'?'nightfall':old.pamoja?.preferences?.wallpaper==='dusk'?'bloom':'aurora'});}catch{return normalizePreferences(null);}
}
export function storePreferences(value:AppPreferences,storage:Pick<Storage,'setItem'>=localStorage){const next=normalizePreferences(value);storage.setItem(preferenceKey,JSON.stringify(next));return next;}
export const textScale={standard:1,large:1.14,largest:1.28};
