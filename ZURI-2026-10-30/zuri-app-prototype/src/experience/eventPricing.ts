export function eventPriceLabel(details:Record<string,unknown>){
 if(details.priceMode==='free')return 'Free';
 const amount=details.priceUgx;
 return details.priceMode==='paid'&&typeof amount==='number'&&Number.isSafeInteger(amount)&&amount>0?'UGX '+amount.toLocaleString('en-UG'):'';
}
