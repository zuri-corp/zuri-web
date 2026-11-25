import type {ConversationContext} from '../core/conversationEngine';

type Read=(action:string,payload:unknown)=>Promise<unknown>;
const entityKinds=new Set(['space','society','channel','event','ping']);

/** Verify only the items the person selected before sending a paid AI request. */
export async function verifyConversationContexts(contexts:ConversationContext[],read:Read):Promise<void>{
 const results=await Promise.all(contexts.map(async context=>{
  try{
   const entity=entityKinds.has(context.kind);
   const result=await read(entity?'objects.summary':'records.get',{id:context.id}) as {entity?:{kind?:unknown;status?:unknown};readable?:unknown;kind?:unknown}|null;
   return entity?result?.entity?.kind===context.kind&&result.readable!==false&&result.entity.status!=='archived':result?.kind===context.kind;
  }catch{return false;}
 }));
 const unavailable=results.findIndex(valid=>!valid);
 if(unavailable!==-1)throw Error('Could not verify '+(contexts[unavailable].label||'a selected item')+'. Check your connection or remove it from this conversation before sending.');
}
