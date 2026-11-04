export type KnowledgeDocument={
 id:string;title:string;body:string;href:string;topics:string[];
 state:'included'|'draft'|'retired';availability:'current'|'proposed';surface:'both'|'website'|'app';
 approvalBasis:'existing-public-catalogue'|'manual-review';revision:string;approvedRevision:string|null;validUntil?:string;
};
export type KnowledgeSource={id:string;title:string;href:string;revision:string;availability:'current'|'proposed'};
export type KnowledgeResult={status:'matched'|'not-found';documents:KnowledgeDocument[];missingPolicies:string[];version:string;scope:'public-zuri'};
export const safeKnowledgeHref=(href:unknown):href is string=>typeof href==='string'&&/^\/(?:[a-z0-9-]+\/?)*(?:#[a-z0-9-]+)?$/i.test(href)&&href.length<180;
export function sourceLinks(raw:unknown):KnowledgeSource[]{
 if(!Array.isArray(raw))return [];
 const seen=new Set<string>();
 return raw.filter((s):s is KnowledgeSource=>!!s&&typeof s==='object'&&typeof s.id==='string'&&/^[a-z0-9.-]{1,90}$/.test(s.id)&&!seen.has(s.id)&&!!seen.add(s.id)&&typeof s.title==='string'&&s.title.length<=150&&safeKnowledgeHref(s.href)&&typeof s.revision==='string'&&/^[a-f0-9]{16}$/.test(s.revision)&&['current','proposed'].includes(s.availability)).slice(0,6).map(s=>({id:s.id,title:s.title,href:s.href,revision:s.revision,availability:s.availability}));
}
