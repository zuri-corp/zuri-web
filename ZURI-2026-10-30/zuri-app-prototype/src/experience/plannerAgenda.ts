export function requestedAgenda(text:string):'today'|'tomorrow'|null{
 const normalized=text.toLowerCase().replace(/[’']/g,'').replace(/[?!.,]+$/g,'').trim();
 const match=/^(?:(?:hey viola |viola )?)(?:what am i doing|whats (?:on (?:my )?(?:planner|agenda|schedule)|planned)|what (?:do i have(?: planned)?|is on my (?:planner|agenda|schedule))|show(?: me)? (?:my )?(?:planner|agenda|schedule|plans|tasks)|do i have (?:anything|any plans|any tasks)) (today|tomorrow)$/.exec(normalized);
 return (match?.[1] as 'today'|'tomorrow'|undefined)??null;
}

export function kampalaAgendaDate(day:'today'|'tomorrow',now=new Date()){
 return new Date(now.getTime()+3*3600000+(day==='tomorrow'?86400000:0)).toISOString().slice(0,10);
}

export function isOnAgenda(content:Record<string,unknown>,day:string){
 if(typeof content.dueDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(content.dueDate))return content.dueDate===day;
 if(typeof content.startsAt==='string'){
  const start=new Date(content.startsAt);
  if(Number.isFinite(start.getTime()))return kampalaAgendaDate('today',start)===day;
 }
 return false;
}
