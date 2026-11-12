export const spaceSectionOptions=['About','Location','Category','Products and services','Website','Offerings','Media','Events','Societies','Channels','Echoes','Tools'] as const;
export const defaultSpaceSections=spaceSectionOptions.filter(value=>value!=='Tools');
export function visibleSpaceSections(value:unknown):string[]{return Array.isArray(value)?spaceSectionOptions.filter(option=>value.includes(option)):[...defaultSpaceSections];}
