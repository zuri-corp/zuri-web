import 'server-only';
import {approvedKnowledge,knowledgeVersion} from './catalog';
import {searchKnowledge} from './search';
import type {ChatMessage} from '@/lib/chat/conversation';
export function retrieveKnowledge(messages:ChatMessage[],surface:'website'|'app'){
 const users=messages.filter(m=>m.role==='user'),latest=users.at(-1)?.content??'';
 // Use previous USER context only for a short follow-up. Assistant text cannot
 // insert facts, change eligibility or choose arbitrary sources.
 const query=latest.length<70&&/\b(?:it|that|those|they|also|included|hosting|price|cost|how much)\b/i.test(latest)?[users.at(-2)?.content,latest].filter(Boolean).join('\n').slice(-1500):latest.slice(-1500);
 if(query.trim().length<2)return {status:"not-found" as const,documents:[],missingPolicies:[],version:knowledgeVersion,scope:"public-zuri" as const};
 return searchKnowledge(query,approvedKnowledge,knowledgeVersion,surface);
}
