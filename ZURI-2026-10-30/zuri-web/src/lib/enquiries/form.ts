export type RequestMode='tech'|'general'|'pamoja'|'claim';
export function enquiryFromForm(data:FormData,mode:RequestMode){
 const field=(name:string)=>String(data.get(name)??'');
 return {enquiryType:'tech',contactIntent:mode==='tech'?'technology':mode,name:field('name'),email:field('email'),phone:field('phone'),service:mode==='tech'?field('service'):'',message:field('message')};
}
