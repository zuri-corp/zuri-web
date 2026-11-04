import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),app=new URL('../../zuri-app-prototype/',import.meta.url);
for(const [from,to,transform] of [
 ['src/lib/opportunities/model.ts','src/experience/opportunityModel.ts',s=>s],
 ['src/components/opportunities/OpportunityDiscovery.tsx','src/experience/OpportunityDiscovery.tsx',s=>s.replace("'@/lib/opportunities/model'","'./opportunityModel'")],
 ['src/app/opportunities.css','src/experience/opportunities.css',s=>s],
])writeFileSync(fileURLToPath(new URL(to,app)),transform(readFileSync(new URL(from,root),'utf8')));
