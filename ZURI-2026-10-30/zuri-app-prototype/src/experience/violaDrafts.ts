export type OfferingFields={title?:string;description?:string;priceLabel?:string;space?:string;delivery?:string;category?:string;priceMode?:'fixed'|'quote'};
export type EntityDraftKind='event'|'ping'|'space'|'society'|'channel';
export type EntityFields={priceMode?:'free'|'paid';priceUgx?:string;category?:string;website?:string;genderPreference?:'any'|'women'|'men';title?:string;description?:string;location?:string;starts?:string;capacity?:string;visibility?:'private'|'public'};
export type CreationDraft={kind:'offering';fields:OfferingFields}|{kind:EntityDraftKind;fields:EntityFields};

function first(text:string,pattern:RegExp){return pattern.exec(text)?.[1]?.trim().replace(/[.!?]+$/,'');}
function offering(text:string):OfferingFields{
 const title=first(text,/^(?:add|list|create|draft|publish)\s+(?:(?:a|an|the)\s+)?(?:offering\s+(?:called|named)\s+)?(.+?)(?=\s+to\s+|\s+(?:at|for)\s+UGX\b|[.!;]|$)/i);
 const price=first(text,/\b(UGX\s*[\d,]+(?:\.\d+)?)/i);
 const space=first(text,/\b(?:to|for)\s+(.+?)(?=\s+(?:for|at)\s+UGX\b|[.!;]|$)/i);
 const delivery=first(text,/\b(?:we\s+deliver|delivery)\s+(?:in|to)\s+([^.!;]+)/i);
 const description=first(text,/\b(?:description\s*:\s*|it includes\s+)([^.!;]+)/i);
 const category=first(text,/\bcategory\s*:\s*([^.!;]+)/i)||(/\b(?:side table|sofa|chair|desk|furniture)\b/i.test(title||'')?'Furniture & home':undefined);
 return {...(title&&!/^offering$/i.test(title)?{title}:{}),...(price?{priceLabel:price,priceMode:'fixed'}:{}),...(/\bask for a quote\b/i.test(text)?{priceMode:'quote'}:{}),...(space&&!/^my space$/i.test(space)?{space}:{}),...(delivery?{delivery:`Delivery in ${delivery}`} :{}),...(description?{description}:{}),...(category?{category}:{})};
}

function entity(text:string,kind:EntityDraftKind):EntityFields{
 const sentence=text.split(/[;\n]|\.\s/)[0];
 const named=first(sentence,/\b(?:called|named|rename(?: it)? to|name\s*:)\s*(.+?)(?=\s+(?:at|on|in|with|for)\s+|$)/i);
 const object=new RegExp('\\b'+kind+'\\b\\s+(.+?)(?=\\s+(?:at|on|in|with|for)\\s+|$)','i');
 const title=named||first(sentence,object);
 const location=first(text,/\b(?:venue\s*:\s*|location\s*:\s*)([^;\n]+?)(?=\.\s|$)/i)||first(sentence,/\b(?:at|in)\s+(?!\d)(.+?)(?=\s+(?:on\s+\d{4}-|with\s+\d|for\s+\d)|$)/i);
 const starts=first(text,/\b(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2})\b/)?.replace(' ','T');
 const capacity=first(text,/\b(?:capacity\s*:?\s*|for\s+|with\s+)(\d{1,4})(?=\s+(?:people|guests|attendees)|[.!;]|$)/i);
 const visibility=(first(text,/\b(?:visibility\s*:\s*|make it\s+)(private|public)\b/i)||first(text,new RegExp('\\b(private|public)\\s+'+kind+'\\b','i')))?.toLowerCase() as EntityFields['visibility'];
 const description=first(text,/\b(?:description\s*:\s*|it.s about\s+|about\s+)(.+?)(?=;|\n|\.\s+(?:category|website|visibility|location|capacity)\s*:|$)/i);
 const category=first(text,/\bcategory\s*:\s*([^.!;\n]+)/i);
 const website=first(text,/\bwebsite\s*:\s*(https:\/\/[^\s;]+)/i);
 const price=kind==='event'?first(text,/\b(?:price\s*:\s*|tickets?\s+(?:at|for)\s+|admission\s*:\s*)?UGX\s*([\d,]+)\b/i)?.replace(/,/g,''):undefined;
 const pricing:EntityFields=kind==='event'&&/\b(?:free (?:entry|admission|event)|(?:admission|price|tickets)\s*:\s*free)\b/i.test(text)?{priceMode:'free'}:price?{priceMode:'paid',priceUgx:price}:{};
 const genderPreference=kind==='ping'?first(text,/\b(?:preference\s*:\s*|prefer\s+)(women|men|any)\b/i)?.toLowerCase() as EntityFields['genderPreference']:undefined;
 return {...pricing,...(title?{title:title.slice(0,120)}:{}),...(location?{location}:{}),...(starts?{starts}:{}),...(capacity?{capacity}:{}),...(visibility?{visibility}:{}),...(description?{description}:{}),...(category?{category}:{}),...(website?{website}:{}),...(genderPreference?{genderPreference}:{})};
}

export function creationDraft(message:string):CreationDraft|null{
 const text=message.trim().replace(/^(?:(?:please|can you|could you|i want to)\s+)+/i,'');
 if(!/^(?:add|list|create|draft|publish|schedule|start|set up|organize|organise)\b/i.test(text))return null;
 if(/\boffering\b/i.test(text)||/^(?:add|list)\s+.+\s+to\s+.+\bUGX\b/i.test(text))return {kind:'offering',fields:offering(text)};
 const kind=/^(?:add|create|draft|publish|schedule|start|set up|organize|organise)\s+(?:(?:a|an|the|new|public|private|free|paid|zuri)\s+)*(event|ping|space|society|channel)\b/i.exec(text)?.[1]?.toLowerCase() as EntityDraftKind|undefined;
 if(kind)return {kind,fields:entity(text,kind)};
 return null;
}

export function reviseCreation(draft:CreationDraft,message:string,now=new Date()):CreationDraft|null{
 const text=message.trim().replace(/^(?:actually[, ]+|change\s+|make it\s+)/i,'');
 const patch=draft.kind==='offering'?offering(text):entity(text,draft.kind);
 if(draft.kind!=='offering'&&draft.fields.starts){
  const weekday=/^(?:make it\s+)?(?:on\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)[.!]?$/i.exec(text)?.[1];
  if(weekday){
   const kampala=new Date(now.getTime()+3*3600000);
   const target=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(weekday.toLowerCase());
   kampala.setUTCDate(kampala.getUTCDate()+((target-kampala.getUTCDay()+7)%7||7));
   (patch as EntityFields).starts=kampala.toISOString().slice(0,10)+draft.fields.starts.slice(10);
  }
 }
 if(draft.kind!=='offering'&&/^(?:public|private)[.!]?$/i.test(text))(patch as EntityFields).visibility=text.toLowerCase().replace(/[.!]$/,'') as EntityFields['visibility'];
 if(!Object.keys(patch).length)return null;
 return {...draft,fields:{...draft.fields,...patch}} as CreationDraft;
}
