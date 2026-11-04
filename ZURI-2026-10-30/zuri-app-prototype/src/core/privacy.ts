export type PrivacyArea={id:string;name:string;location:string;access:string;retention:string;encrypted:boolean};
export const privacyInventory:PrivacyArea[]=[
 {id:'intent-handoff',name:'Explicit website-to-app goal draft',location:'Same-tab browser sessionStorage',access:'This tab and same-origin app code',retention:'Consumed when the new-goal screen opens; otherwise until tab close/browser restore. The draft is rejected after five minutes, not erased by a background job.',encrypted:false},
 {id:'workspace',name:'Profile, Lore, goals, messages and tool content',location:'Browser localStorage, including photo data',access:'This browser profile and code running on the app origin',retention:'Until removed by you or browser storage eviction; no expiry job',encrypted:false},
 {id:'drafts',name:'Unsubmitted form drafts',location:'Browser sessionStorage when enabled',access:'This tab and same-origin code',retention:'Tab session; browser session restore may preserve it',encrypted:false},
 {id:'views',name:'Navigation, filters and context choices',location:'Browser sessionStorage and history',access:'This tab, browser history and same-origin code',retention:'Session/history controlled by the browser',encrypted:false},
 {id:'exports',name:'Downloaded workspace backups',location:'Your chosen download location',access:'Anyone who can access that file',retention:'Until you delete the exported file separately',encrypted:false},
 {id:'images',name:'External sample media requests',location:'Image hosts receive network requests',access:'The host may receive IP address and request information',retention:'Host policies; not controlled by this prototype',encrypted:false},
 {id:'voice',name:'Optional browser voice input',location:'Browser speech-recognition implementation',access:'The browser or its speech provider may process audio after microphone permission',retention:'Browser/provider policy; not controlled by ZURI',encrypted:false},
 {id:'ai',name:'Explicit Viola conversation',location:'Configured service and its declared provider, if connected',access:'Service/provider sees the reviewed conversation you send',retention:'Must be disclosed by the connected service',encrypted:false}
];
export type AIMessage={role:'user'|'assistant';content:string};
export function reviewedAIMessages(input:AIMessage[]):AIMessage[]{if(!Array.isArray(input))throw Error('Invalid conversation.');return input.slice(-12).map(m=>{if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>12000)throw Error('Invalid AI message.');return {role:m.role,content:m.content}});}
export function matchesAIReview(messages:AIMessage[],approvedJson:string){return JSON.stringify(reviewedAIMessages(messages))===approvedJson;}
export function draftKeys(storage:Pick<Storage,'length'|'key'>){const result:string[]=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith('zuri-form-'))result.push(key)}return result;}
