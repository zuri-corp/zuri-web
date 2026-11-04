import {notFound} from 'next/navigation';
import {weddingTemplates,weddingTemplate} from '@/lib/invites/templates';
import WeddingExperience from '@/components/site/WeddingExperience';
export function generateStaticParams(){return weddingTemplates.map(t=>({template:t.slug}))}
export async function generateMetadata({params}:{params:Promise<{template:string}>}){const t=weddingTemplate((await params).template);return {title:t?`${t.name} — ZURI Invites wedding example`:'Template not found',robots:{index:false,follow:true}}}
export default async function Page({params}:{params:Promise<{template:string}>}){const t=weddingTemplate((await params).template);if(!t)notFound();return <WeddingExperience template={t}/>}
