import {validateManifest,bookingManifest,capabilities} from '../../../packages/tool-sdk/manifest.mjs';
export {validateManifest,bookingManifest,capabilities};
export type Manifest=ReturnType<typeof validateManifest>;
export const uuid=(v:unknown)=>{if(typeof v!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))throw Error('Choose a valid record.');return v;};
export const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('An object is required.');return v as Record<string,unknown>;};
export const text=(v:unknown,min:number,max:number)=>{if(typeof v!=='string'||v.trim().length<min||v.length>max)throw Error(`Use ${min}–${max} characters.`);return v.trim();};
export function bookingInput(raw:unknown){const p=object(raw);const name=text(p.name,2,80),note=p.note?text(p.note,1,500):'';
 const start=text(p.startsAt,20,40),end=text(p.endsAt,20,40),a=Date.parse(start),b=Date.parse(end);
 if(!/(Z|[+-]\d\d:\d\d)$/.test(start)||!/(Z|[+-]\d\d:\d\d)$/.test(end)||!Number.isFinite(a)||!Number.isFinite(b)||a<=Date.now()||b<=a||b-a>86400000||a>Date.now()+366*86400000)throw Error('Choose a future appointment within one year, lasting at most 24 hours, with an explicit timezone.');
 return {name,note,startsAt:new Date(a).toISOString(),endsAt:new Date(b).toISOString()};
}
export function studioMutation(raw:unknown){const p=object(raw),action=text(p.action,3,30),input=object(p.input??{});let payload:Record<string,unknown>;
 switch(action){
 case 'register':payload={name:text(input.name,2,80),kind:input.kind==='organization'?'organization':'individual'};break;
 case 'create':payload={developerId:uuid(input.developerId),manifest:validateManifest(input.manifest)};break;
 case 'version':payload={toolId:uuid(input.toolId),manifest:validateManifest(input.manifest)};break;
 case 'submit':case 'publish':payload={versionId:uuid(input.versionId)};break;
 case 'approve':case 'reject':payload={versionId:uuid(input.versionId),reference:text(input.reference,10,1000)};break;
 case 'verify':payload={developerId:uuid(input.developerId),reference:text(input.reference,10,1000)};break;
 case 'suspend':payload={toolId:uuid(input.toolId),reference:text(input.reference,10,1000)};break;
 case 'install':if(input.consent!==true)throw Error('Explicit installation consent is required.');payload={versionId:uuid(input.versionId),spaceId:uuid(input.spaceId),consent:true};break;
 case 'revoke':payload={installationId:uuid(input.installationId)};break;
 case 'issue-key':payload={toolId:uuid(input.toolId)};break;
 case 'revoke-key':payload={keyId:uuid(input.keyId)};break;
 case 'booking-create':payload={installationId:uuid(input.installationId),...bookingInput(input)};break;
 case 'booking-status':if(!['confirmed','cancelled'].includes(String(input.status)))throw Error('Choose confirmed or cancelled.');payload={bookingId:uuid(input.bookingId),status:input.status};break;
 case 'budget':if(!Number.isSafeInteger(input.limitMicros)||Number(input.limitMicros)<0||Number(input.limitMicros)>1000000000)throw Error('Choose an integer budget cap up to 1,000 USD.');payload={developerId:uuid(input.developerId),limitMicros:input.limitMicros,reference:text(input.reference,10,1000)};break;
 case 'team':if(!['owner','developer','viewer','remove'].includes(String(input.role)))throw Error('Choose a team role.');payload={developerId:uuid(input.developerId),userId:uuid(input.userId),role:input.role};break;
 default:throw Error('Unknown Studio action.');
 }return {action,payload};
}
export function runtimeInput(raw:unknown){const p=object(raw),operation=String(p.operation),input=object(p.input??{});
 if(!Object.hasOwn(capabilities,operation))throw Error('This runtime capability is unavailable.');
 if(operation==='bookings.create')return {operation,input:bookingInput(input)};
 if(operation==='bookings.manage'){if(!['confirmed','cancelled'].includes(String(input.status)))throw Error('Choose confirmed or cancelled.');return {operation,input:{id:uuid(input.id),status:input.status}};}
 if(operation==='ai.space-answer')return {operation,input:{question:text(input.question,3,600)}};
 return {operation,input:{}};
}
export type StudioState={developers:Row[];members:Row[];tools:Row[];versions:Row[];installations:Row[];bookings:Row[];keys:Row[];audit:Row[];usage:Row[];spaces:Row[];budgets:Row[];userId:string;admin:boolean};
// JSON projections from the versioned Studio RPC; never use these as authority.
export type Row={id:string;[key:string]:any};
export function emptyStudio():StudioState{return {developers:[],members:[],tools:[],versions:[],installations:[],bookings:[],keys:[],audit:[],usage:[],spaces:[],budgets:[],userId:'',admin:false};}
