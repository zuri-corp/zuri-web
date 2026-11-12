import {useState} from 'react';
export const textSizes = {standard:1,large:1.15,largest:1.3} as const;
export type TextSize = keyof typeof textSizes;
export function savedTextSize():TextSize {
 try { const value=localStorage.getItem('zuri-text-size');return value&&Object.prototype.hasOwnProperty.call(textSizes,value)?value as TextSize:'standard'; } catch {return 'standard';}
}
export default function TextSizeControl({value,onChange}:{value:TextSize;onChange:(value:TextSize)=>void}){
 const [open,setOpen]=useState(false);
 return <div className="cw-text-size"><button type="button" aria-label="Adjust text size" aria-expanded={open} onClick={()=>setOpen(!open)}>Aa</button>{open&&<div className="cw-text-options" role="group" aria-label="Text size"><strong>Make yourself comfortable</strong>{(Object.keys(textSizes) as TextSize[]).map(size=><button key={size} type="button" aria-pressed={size===value} onClick={()=>{onChange(size);try{localStorage.setItem('zuri-text-size',size);}catch{}}}>{size==='standard'?'Standard':size==='large'?'Larger':'Largest'} {size===value?'✓':''}</button>)}<button type="button" onClick={()=>setOpen(false)}>Done</button></div>}</div>;
}
