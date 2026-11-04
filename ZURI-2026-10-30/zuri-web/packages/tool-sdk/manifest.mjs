export const capabilities=Object.freeze({
 'space.read':'Read the approved public information of the installing Space.',
 'bookings.create':'Create booking requests in this Space when explicitly requested.',
 'bookings.read':'Read this installation’s booking requests, including customer notes.',
 'bookings.manage':'Confirm or cancel this installation’s booking requests.',
 'ai.space-answer':'Answer questions using only the installing Space’s approved public information.',
});
const text=(value,name,min,max)=>{if(typeof value!=='string'||value.trim().length<min||value.length>max)throw Error(`${name}: use ${min}–${max} characters.`);return value.trim();};
export function validateManifest(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('A Tool manifest object is required.');
 const name=text(raw.name,'Name',3,80),description=text(raw.description,'Description',20,1200);
 const slug=text(raw.slug,'Address',3,64),version=text(raw.version,'Version',5,32);
 if(!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug))throw Error('Use a lowercase Tool address with letters, numbers and hyphens.');
 if(!/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(version))throw Error('Use a semantic version such as 1.0.0.');
 if(raw.model!=='connected')throw Error('Only connected Tools are supported in this pilot. Managed code hosting is unavailable.');
 let endpoint;try{endpoint=new URL(raw.endpoint);}catch{throw Error('A public HTTPS endpoint is required.');}
 const host=endpoint.hostname.toLowerCase();
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.hash||endpoint.search||!host.includes('.')||host.endsWith('.local')||host.endsWith('.localhost')||host.endsWith('.internal')||/^[\d.]+$/.test(host)||host.includes(':'))throw Error('Use a public HTTPS endpoint without credentials, query parameters or fragments.');
 if(!Array.isArray(raw.contexts)||raw.contexts.length!==1||raw.contexts[0]!=='space')throw Error('The initial connected runtime supports Space installations only.');
 if(!Array.isArray(raw.permissions)||raw.permissions.length<1||raw.permissions.length>5)throw Error('Declare between one and five permissions.');
 const seen=new Set();
 const permissions=raw.permissions.map(p=>{
  if(!p||!Object.hasOwn(capabilities,p.capability)||seen.has(p.capability))throw Error('Unknown or repeated Tool permission.');
  seen.add(p.capability);return {capability:p.capability,purpose:text(p.purpose,'Permission purpose',15,300)};
 });
 return {schemaVersion:1,name,slug,version,description,model:'connected',endpoint:endpoint.href,contexts:['space'],category:text(raw.category,'Category',3,60),permissions,releaseNotes:text(raw.releaseNotes||'Initial release.','Release notes',5,1000)};
}
export const bookingManifest={schemaVersion:1,name:'Space Booking',slug:'space-booking',version:'1.0.0',description:'Receive booking requests and manage appointment status for a Space.',model:'connected',endpoint:'https://tools.example.com/space-booking',contexts:['space'],category:'Business operations',permissions:[{capability:'space.read',purpose:'Show the customer which approved Space receives this request.'},{capability:'bookings.create',purpose:'Save an appointment request after a person explicitly submits it.'},{capability:'bookings.read',purpose:'Let the connected booking service display its own appointment requests.'},{capability:'bookings.manage',purpose:'Let the Space team confirm or cancel its appointment requests.'}],releaseNotes:'Initial connected booking pilot.'};
