import {validDueDate} from './taskPlanning';
export function validPhoto(image:string){return !image||/^https:\/\//i.test(image)||/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image);}
export function validateGathering(f:{title:string;when:string;end?:string;location:string;capacity?:number;image:string}){
 if(!f.title.trim())throw Error('Give this gathering a name.');
 const start=Date.parse(f.when);if(!validDueDate(f.when.slice(0,10))||!/^\d{4}-\d{2}-\d{2}T/.test(f.when)||!Number.isFinite(start))throw Error('Choose a valid start date and time.');
 if(f.end&&(!validDueDate(f.end.slice(0,10))||!Number.isFinite(Date.parse(f.end))||Date.parse(f.end)<=start))throw Error('End time must be after the start.');
 if(!f.location.trim())throw Error('Enter a meeting place or link a Space.');
 if(f.capacity!==undefined&&(!Number.isSafeInteger(f.capacity)||f.capacity<1||f.capacity>100000))throw Error('Capacity must be a whole number from 1 to 100,000.');
 if(!validPhoto(f.image))throw Error('Choose a supported photo.');
}
