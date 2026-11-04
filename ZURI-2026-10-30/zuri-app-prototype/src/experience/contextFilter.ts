import type {ContextTag} from './model';
export function matchesContext(refs:ContextTag[],kind:string,id:string){
 if(kind==='all')return true;
 if(kind==='untagged')return refs.length===0;
 return refs.some(t=>t.kind===kind&&(!id||t.id===id));
}
