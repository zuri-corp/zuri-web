export type ZuriAssistant='viola'|'robert';
export type ConversationTurn={role:'user'|'assistant';content:string};
export type ConversationContext={kind:'space'|'society'|'channel'|'event'|'ping'|'chapter'|'moment'|'task';id:string;label?:string};
export type ConversationWorkspace={id:string;assistant:ZuriAssistant;title:string;createdAt:string;updatedAt:string;contexts:ConversationContext[];turns:ConversationTurn[]};

const maxTurns=12;
const contextKinds=new Set(['space','society','channel','event','ping','chapter','moment','task']);
const contextId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validConversationContext(value:unknown):value is ConversationContext{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const context=value as Partial<ConversationContext>;
 return typeof context.kind==='string'&&contextKinds.has(context.kind)&&typeof context.id==='string'&&contextId.test(context.id);
}
function clean(value:string,max:number){return value.replace(/\s+/g,' ').trim().slice(0,max);}
export function workspaceTitle(turns:ConversationTurn[],fallback='New conversation'){
 const first=turns.find(turn=>turn.role==='user')?.content||'';
 const title=clean(first.replace(/^(?:hi|hey|hello|please|can you|could you|help me)\b[:,.!\s]*/i,''),64).replace(/[.?!,:;]+$/,'');
 return title||fallback;
}
export function createConversationWorkspace(assistant:ZuriAssistant,context?:ConversationContext):ConversationWorkspace{
 const now=new Date().toISOString();
 return {id:crypto.randomUUID(),assistant,title:'New conversation',createdAt:now,updatedAt:now,contexts:context?[context]:[],turns:[]};
}
export function addConversationTurn(workspace:ConversationWorkspace,turn:ConversationTurn):ConversationWorkspace{
 const content=clean(turn.content,1500);if(!content)return workspace;
 const turns=[...workspace.turns,{role:turn.role,content}].slice(-maxTurns),updatedAt=new Date().toISOString();
 return {...workspace,turns,title:workspaceTitle(turns),updatedAt};
}
export function replaceConversationContext(workspace:ConversationWorkspace,contexts:ConversationContext[]){
 const unique=contexts.filter((value,index,self)=>validConversationContext(value)&&self.findIndex(item=>item.kind===value.kind&&item.id===value.id)===index).slice(0,4).map(context=>({kind:context.kind,id:context.id,label:typeof context.label==='string'?clean(context.label,80):undefined}));
 return {...workspace,contexts:unique,updatedAt:new Date().toISOString()};
}
export function resetConversationTopic(workspace:ConversationWorkspace){
 return {...workspace,id:crypto.randomUUID(),title:'New conversation',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),contexts:[],turns:[]};
}
export function readConversationWorkspace(value:unknown,assistant:ZuriAssistant):ConversationWorkspace{
 if(!value||typeof value!=='object'||Array.isArray(value))return createConversationWorkspace(assistant);
 const candidate=value as Partial<ConversationWorkspace>;
 if(candidate.assistant!==assistant||typeof candidate.id!=='string'||typeof candidate.title!=='string'||!Array.isArray(candidate.turns)||!Array.isArray(candidate.contexts))return createConversationWorkspace(assistant);
 const turns=candidate.turns.filter((turn):turn is ConversationTurn=>!!turn&&(turn.role==='user'||turn.role==='assistant')&&typeof turn.content==='string').slice(-maxTurns).map(turn=>({role:turn.role,content:clean(turn.content,1500)})).filter(turn=>turn.content);
 const contexts=candidate.contexts.filter(validConversationContext).filter((context,index,all)=>all.findIndex(other=>other.kind===context.kind&&other.id===context.id)===index).slice(0,4).map(context=>({kind:context.kind,id:context.id,label:typeof context.label==='string'?clean(context.label,80):undefined}));
 return {id:candidate.id.slice(0,100),assistant,title:workspaceTitle(turns,clean(candidate.title,64)||'New conversation'),createdAt:typeof candidate.createdAt==='string'?candidate.createdAt:new Date().toISOString(),updatedAt:typeof candidate.updatedAt==='string'?candidate.updatedAt:new Date().toISOString(),contexts,turns};
}
