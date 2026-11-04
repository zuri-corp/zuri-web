import type {ReactNode} from 'react';
import {AppGlyph} from './AppGlyph';

/** Native disclosures remain keyboard accessible without hiding the media. */
export function PostMeta({text,contexts,count=0}:{text:string;contexts?:ReactNode;count?:number}){
 return <div className="zi-post-meta">{text&&<details className="zi-caption"><summary aria-label="Expand or collapse caption"><span>{text}</span><AppGlyph name="chevron" size={14}/></summary><p>{text}</p></details>}{count>0&&<details className="zi-context"><summary><AppGlyph name="tag" size={13}/><span>{count} {count===1?'connection':'connections'}</span><AppGlyph name="chevron" size={13}/></summary><div className="zi-context-items">{contexts}</div></details>}</div>;
}
