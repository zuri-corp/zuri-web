export const MEDIA_LIMIT=10*1024*1024;

/** Match the server's file signatures rather than trusting a phone's MIME label. */
export function identifyMedia(bytes:Uint8Array):string|null{
 const text=(start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end));
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if([137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value))return 'image/png';
 if(text(0,4)==='RIFF'&&text(8,12)==='WEBP')return 'image/webp';
 if(text(0,5)==='%PDF-')return 'application/pdf';
 if(text(4,8)==='ftyp'&&['isom','iso2','mp41','mp42','avc1'].includes(text(8,12)))return 'video/mp4';
 return null;
}

export async function prepareMedia(file:File):Promise<File>{
 const detected=identifyMedia(new Uint8Array(await file.slice(0,16).arrayBuffer()));
 if(detected&&file.size<=MEDIA_LIMIT)return detected===file.type?file:new File([file],file.name,{type:detected,lastModified:file.lastModified});
 if(!file.type.startsWith('image/'))throw Error(file.size>MEDIA_LIMIT?'This video or file is over the 10 MB limit. Choose a smaller file.':'This file format is not supported. Choose an MP4 video or a JPEG, PNG or WebP photo.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;
  try{await image.decode();}catch{throw Error('This photo cannot be opened on this device. Try a JPEG, PNG or WebP photo.');}
  const sourceType=detected&&detected.startsWith('image/')?detected:'image/jpeg';
  let scale=Math.min(1,4096/Math.max(image.naturalWidth,image.naturalHeight));
  for(let attempt=0;attempt<5;attempt++){
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   const context=canvas.getContext('2d');if(!context)throw Error('This photo could not be prepared on this device.');
   context.drawImage(image,0,0,canvas.width,canvas.height);
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,sourceType,Math.max(.76,.92-attempt*.04)));
   if(blob&&blob.size<=MEDIA_LIMIT&&['image/jpeg','image/png','image/webp'].includes(blob.type))return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.'+(blob.type==='image/jpeg'?'jpg':blob.type==='image/png'?'png':'webp'),{type:blob.type,lastModified:file.lastModified});
   scale*=.8;
  }
  throw Error('This photo is too large to prepare. Choose a smaller photo.');
 }finally{URL.revokeObjectURL(url);}
}
