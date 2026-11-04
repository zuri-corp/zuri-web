import {aiStatus,aiRequest} from '@/lib/ai/gateway';
export const maxDuration=60;
export async function GET(){return aiStatus('guide');}
export async function POST(request:Request){return aiRequest(request,'guide');}
