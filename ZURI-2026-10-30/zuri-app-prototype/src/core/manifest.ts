export type Capability='storage.read'|'storage.write'|'planner.create';
export type ToolManifest={id:string;name:string;description:string;version:string;apiVersion:1;icon:string;capabilities:Capability[]};
export const manifests:ToolManifest[]=[
 {id:'notes',name:'Pocket notes',description:'Capture a thought beside a place, plan or Chapter.',version:'1.0.0',apiVersion:1,icon:'note',capabilities:['storage.read','storage.write']},
 {id:'packing',name:'Checklists',description:'Keep preparation and small details together.',version:'1.0.0',apiVersion:1,icon:'check',capabilities:['storage.read','storage.write']},
 {id:'nextstep',name:'Next step',description:'Turn an intention into a connected Planner task.',version:'1.0.0',apiVersion:1,icon:'Planner',capabilities:['planner.create']}
];
