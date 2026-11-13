
import {AppGlyph} from './AppGlyph';
import {useState} from 'react';
import {intentCatalog,resolveIntent,validateIntentRequest,type ConversationIntent,type IntentRequest} from '../core/intents';

export default function ConversationNextStep({draft,onContinue}:{draft:ConversationIntent;onContinue:(request:IntentRequest)=>void}){
 const [error,setError]=useState('');
 function proceed(){
  try{
   const request=validateIntentRequest({...draft.request,goal:draft.goal??undefined});
   if(resolveIntent(request).status==='blocked')throw Error('This goal cannot bypass permission boundaries.');
   onContinue(request);
  }catch(e){setError(e instanceof Error?e.message:'This suggestion could not open.');}
 }
 return <section className="conversation-next-step" aria-label="A next step from your conversation">
  <button className="vw-suggestion-link" type="button" onClick={proceed}><AppGlyph name="next" size={16}/><span><strong>{intentCatalog.find(item=>item.id===draft.goal)?.title||'Explore a next step'}</strong><small>Open suggestion</small></span></button>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
