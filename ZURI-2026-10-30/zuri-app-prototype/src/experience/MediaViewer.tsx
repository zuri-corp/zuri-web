import {useRef,type ReactNode} from 'react';
import {AppGlyph} from './AppGlyph';
import {Modal} from './UsabilityUI';

export default function MediaViewer({index,count,onChange,onClose,children}:{index:number;count:number;onChange:(index:number)=>void;onClose:()=>void;children:ReactNode}){
 const touch=useRef<{x:number;y:number}|null>(null);
 function move(by:number){const next=index+by;if(next>=0&&next<count)onChange(next);}
 return <Modal label="Media preview" onClose={onClose}>
  <div className="ux-media-viewer" onKeyDown={e=>{
   if(e.target instanceof HTMLVideoElement)return;
   if(e.key==='ArrowLeft')move(-1);
   if(e.key==='ArrowRight')move(1);
  }} onTouchStart={e=>{const finger=e.touches[0];touch.current={x:finger.clientX,y:finger.clientY};}}
   onTouchEnd={e=>{const start=touch.current,finger=e.changedTouches[0];touch.current=null;
    if(!start||Math.abs(finger.clientY-start.y)>55)return;
    const distance=finger.clientX-start.x;if(Math.abs(distance)>55)move(distance<0?1:-1);
   }} onTouchCancel={()=>{touch.current=null;}}>
   {children}
   {count>1&&<nav aria-label="Browse media"><button type="button" disabled={index===0} aria-label="Previous media" onClick={()=>move(-1)}><AppGlyph name="back" size={18}/></button><span aria-live="polite">{index+1} / {count}</span><button type="button" disabled={index===count-1} aria-label="Next media" onClick={()=>move(1)}><AppGlyph name="next" size={18}/></button></nav>}
  </div>
 </Modal>;
}
