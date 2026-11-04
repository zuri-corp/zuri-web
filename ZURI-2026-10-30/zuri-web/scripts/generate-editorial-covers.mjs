import {writeFileSync} from 'node:fs';
const covers=[
 ['work','01','SMALL TASKS.|REAL WORK.','#ef3b4f','#181817','AI AT WORK / CUSTOMER REPLIES'],
 ['proposal','02','MAKE THE|BRIEF CLEAR.','#e9e3d7','#18283d','AI AT WORK / PROPOSALS'],
 ['meetings','03','FROM TALK.|TO ACTION.','#252b30','#d9ecbc','AI AT WORK / FOLLOW-THROUGH'],
 ['fortran','56','A SMALL|MANUAL.','#d9d0ba','#33261d','15 OCTOBER 1956 / TECH HISTORY'],
 ['policy','04','GOOD RULES.|USEFUL AI.','#202020','#faeee1','POLICY / HUMAN RESPONSIBILITY'],
 ['openai','05','THE TASK|COMES FIRST.','#c7dcd0','#183a30','TECHNOLOGY / OPENAI'],
 ['quickbooks','06','KNOW YOUR|NUMBERS.','#e7edd5','#29402d','PRODUCTS / QUICKBOOKS'],
];
for(const[slug,num,title,paper,ink,tag]of covers){const[a,b]=title.split('|');const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="840" viewBox="0 0 1200 840"><rect width="1200" height="840" fill="${paper}"/><g fill="${ink}" font-family="Arial,Helvetica,sans-serif"><text x="60" y="65" font-size="17" letter-spacing="4">ZURI SELECT / ${tag}</text><path d="M60 100H1140" stroke="${ink}" opacity=".4"/><text x="56" y="340" font-size="105" font-weight="700" letter-spacing="-5">${a}</text><text x="56" y="455" font-size="105" font-weight="700" letter-spacing="-5">${b}</text><text x="60" y="765" font-size="18" letter-spacing="3">A CONSIDERED POINT OF VIEW.</text><text x="1030" y="770" font-size="82" font-family="Georgia,serif" font-style="italic">${num}</text></g><g fill="none" stroke="${ink}" stroke-width="2" opacity=".55"><path d="M65 580H730M65 610H550M65 640H650"/><circle cx="970" cy="590" r="65"/><path d="M910 590H1030M970 530V650"/></g></svg>`;writeFileSync(`public/brands/select-${slug}.svg`,svg)}
