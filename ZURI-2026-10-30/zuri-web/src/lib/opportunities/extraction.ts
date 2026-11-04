/** Public source text only. Provider output is untrusted and never publishes itself. */
export type EvidenceField={value:string;quote:string};
export type Extracted={eligibility?:EvidenceField;expires_at?:EvidenceField;location?:EvidenceField};
export function supportedExtraction(text:string,value:unknown):Extracted {
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const result:Extracted={};
 for(const field of ['eligibility','expires_at','location'] as const){
  const candidate=(value as Record<string,unknown>)[field] as EvidenceField|undefined;
  if(!candidate||typeof candidate.value!=='string'||typeof candidate.quote!=='string'||!candidate.value.trim()||candidate.value.length>500||candidate.quote.length>800||!text.includes(candidate.quote)||!candidate.quote.includes(candidate.value))continue;
  // No inferred dates/timezone; only an explicit source ISO instant is accepted.
  if(field==='expires_at'&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(candidate.value)||!Number.isFinite(Date.parse(candidate.value))))continue;
  result[field]={value:candidate.value,quote:candidate.quote};
 }
 return result;
}
