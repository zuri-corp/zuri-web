export type Capability='space.read'|'bookings.create'|'bookings.read'|'bookings.manage'|'ai.space-answer';
export type ToolManifest={schemaVersion:1;name:string;slug:string;version:string;description:string;model:'connected';endpoint:string;contexts:['space'];category:string;permissions:{capability:Capability;purpose:string}[];releaseNotes:string};
export function validateManifest(input:unknown):ToolManifest;
export const bookingManifest:ToolManifest;
export const capabilities:Readonly<Record<Capability,string>>;
export class ZuriToolError extends Error{status:number;code:string}
export type RequestOptions={idempotencyKey?:string;signal?:AbortSignal};
export type IntentRequest={text:string;surface?:'website'|'app';goal?:string;details?:{audience?:'personal'|'business'|'developer';location?:string;budget?:string;dueDate?:string}};
export type IntentPlan={engineVersion:string;request:IntentRequest;status:'ready'|'clarify'|'blocked';intentId:string|null;title:string;question:string|null;interpretation:string;basis:'chosen'|'ambiguous'|'matched'|'unknown';missing:string[];candidates:{id:string;title:string}[];steps:{id:string;title:string;detail:string;state:'proposed'}[];prerequisites:string[];actions:{id:string;kind:'navigate'|'create-task';label:string;href?:string;requiresConfirmation:boolean;effect:string}[]};
export type Booking={id:string;startsAt:string;endsAt:string;name:string;note?:string;status:'requested'|'confirmed'|'cancelled'};
export function createZuriToolClient(config:{baseUrl:string;toolKey:string;installationToken:string;fetch?:typeof fetch}):{
 intents:{resolve(input:IntentRequest,options?:RequestOptions):Promise<IntentPlan>};
 space:{get():Promise<Record<string,unknown>>};
 bookings:{list():Promise<Booking[]>;create(input:{name:string;startsAt:string;endsAt:string;note?:string},options?:RequestOptions):Promise<Booking>;update(id:string,status:'confirmed'|'cancelled',options?:RequestOptions):Promise<Booking>};
 ai:{answer(question:string,options?:RequestOptions):Promise<{answer:string;usage:Record<string,number>}>};
};
export function verifyZuriWebhook(input:{rawBody:string;signature:string;timestamp:string;eventId:string;secret:string;now?:number}):boolean;
