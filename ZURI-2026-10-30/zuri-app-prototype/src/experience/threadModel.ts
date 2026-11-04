import type {CommunityTopic,LocalData} from './model';
export type ThreadComment={id:string;author:string;userId?:string;text:string;time:string;local:boolean;image?:string;parentId?:string};
export function threadComments(topic:CommunityTopic,data:LocalData):ThreadComment[]{
 return [...topic.messages.slice(1).map((m,i)=>({id:topic.id+':sample:'+i,author:m.userId,userId:m.userId,text:m.text,time:m.time,image:m.image,local:false})),...(data.discussions||[]).filter(m=>m.topicId===topic.id).map(m=>({id:m.id,author:m.author,text:m.text,time:m.created,local:true,image:m.image,parentId:m.parentId}))];
}
export function replyParent(comments:ThreadComment[],comment:ThreadComment){
 let parent=comments.find(c=>c.id===comment.parentId);const seen=new Set([comment.id]);let current=parent;
 while(current){if(seen.has(current.id))return undefined;seen.add(current.id);current=comments.find(c=>c.id===current?.parentId)}
 return parent?.id;
}
