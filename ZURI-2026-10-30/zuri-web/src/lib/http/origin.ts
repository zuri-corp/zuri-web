/** Never trust forwarded hosts. Sign-in and budgets remain independent checks. */
export function sameOrigin(request:Request) {
  const origin=request.headers.get('origin');if(!origin)return false;
  try{const url=new URL(request.url),host=request.headers.get('host');
    if(host){if(!/^(?:\[[a-f0-9:.]+\]|[a-z0-9.-]+)(?::\d{1,5})?$/i.test(host))return false;url.host=new URL(`${url.protocol}//${host}`).host;}
    return origin===url.origin && request.headers.get('sec-fetch-site')!=='cross-site';
  }catch{return false;}
}
