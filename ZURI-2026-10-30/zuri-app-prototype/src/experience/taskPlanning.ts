import type {LocalData,Task} from './model';
export function validDueDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function planTask(data:LocalData,id:string,fields:{dueDate?:string;assignee?:string;status:'todo'|'doing'|'done'}):LocalData{
 if(!data.tasks.some(t=>t.id===id))throw new Error('This task is no longer available.');
 if(fields.dueDate&&!validDueDate(fields.dueDate))throw new Error('Choose a valid due date.');
 if(!['todo','doing','done'].includes(fields.status))throw new Error('Choose a task status.');
 return {...data,tasks:data.tasks.map(t=>t.id===id?{...t,dueDate:fields.dueDate||undefined,assignee:fields.assignee?.trim().slice(0,80)||undefined,status:fields.status,done:fields.status==='done'}:t)};
}
export function toggleTask(task:Task):Task{return {...task,done:!task.done,status:task.done?'todo':'done'};}
export function chapterSummary(data:LocalData,id:string){
 const chapter=data.chapters.find(c=>c.id===id),ids=new Set(chapter?.blocks?.filter(b=>b.kind==='task').map(b=>b.taskId));
 const tasks=data.tasks.filter(t=>ids.has(t.id)),done=tasks.filter(t=>t.done).length;
 const next=tasks.filter(t=>!t.done).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'))[0];
 return {tasks,done,next,total:tasks.length};
}
export function removeChapter(data:LocalData,id:string):LocalData{return {...data,chapters:data.chapters.filter(c=>c.id!==id),tasks:data.tasks.map(t=>t.chapterId===id?{...t,chapterId:undefined}:t),posts:data.posts.map(p=>({...p,tags:p.tags?.filter(t=>t.kind!=='chapter'||t.id!==id)}))};}
