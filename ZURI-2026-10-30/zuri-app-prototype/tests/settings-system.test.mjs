import test from 'node:test';import assert from 'node:assert/strict';import {createElement as h} from 'react';import {renderToStaticMarkup as render} from 'react-dom/server';import {register} from 'node:module';
register('./component-loader.mjs',import.meta.url);
const {normalizePreferences,loadPreferences,storePreferences,defaultPreferences,palettes}=await import('../src/experience/appPreferences.ts');
const {screenTitle,creationAction}=await import('../src/experience/screenPresentation.ts');
const {objectRoute,routeHash,parseRoute}=await import('../src/experience/model.ts');
const {default:SettingsScreen}=await import('../src/experience/SettingsScreen.tsx');
const {default:EntityEditor}=await import('../src/experience/EntityScreens.tsx');
const {default:EntityCollection}=await import('../src/experience/EntityCollection.tsx');
test('appearance migration preserves identity storage and rejects unsafe wallpaper values',()=>{
 const values={'zuri-text-size':'large','zuri-experience-v2':JSON.stringify({name:'Keep my identity',pamoja:{preferences:{mode:'day',wallpaper:'forest'}}})};
 const storage={getItem:key=>values[key]||null};const migrated=loadPreferences(storage);assert.equal(migrated.size,'large');assert.equal(migrated.mode,'day');assert.equal(migrated.wallpaper,'nightfall');assert.match(values['zuri-experience-v2'],/Keep my identity/);
 assert.equal(normalizePreferences({customWallpaper:'data:image/svg+xml;base64,PHN2Zz4='}).customWallpaper,null);
 assert.equal(normalizePreferences({palette:'constructor',widgets:['planner','planner','unknown']}).palette,'midnight');assert.deepEqual(normalizePreferences({widgets:[]}).widgets,[]);
 const saved={};storePreferences({...defaultPreferences,widgets:['events','planner'],palette:'lagoon'},{setItem:(key,value)=>{saved[key]=value;}});assert.deepEqual(JSON.parse(Object.values(saved)[0]).widgets,['events','planner']);
 assert.throws(()=>storePreferences(defaultPreferences,{setItem(){throw Error('Quota');}}),/Quota/);
});
test('screen titles describe the actual location and header creation actions have valid reloadable routes',()=>{
 for(const [world,tab] of [['aura','Spaces'],['aura','Societies'],['motion','Events'],['motion','Pings'],['motion','Planner'],['rizz','Channels'],['lore','Moments'],['lore','Chapters']]){
  const route={world,tab};assert.equal(screenTitle(route),tab);const action=creationAction(route);assert.ok(action);const target=objectRoute(action.kind,'new');assert.equal(target.world,world);assert.deepEqual(parseRoute(routeHash(target)),target);
 }
 for(const kind of ['settings','settings-appearance','settings-widgets','settings-wallpaper'])assert.equal(parseRoute(routeHash(objectRoute(kind,'home'))).kind,kind);
 assert.equal(screenTitle(objectRoute('new-ping','new')),'New Ping');assert.equal(creationAction(objectRoute('new-ping','new')),null);
});
test('settings separates appearance, widgets, wallpaper and account entry',()=>{
 const props={prefs:defaultPreferences,onChange(){},onOpen(){},onProfile(){}};
 const root=render(h(SettingsScreen,{...props,section:'settings'}));assert.match(root,/Appearance/);assert.match(root,/Lounge wallpaper/);assert.match(root,/Lounge widgets/);assert.doesNotMatch(root,/<textarea|Save profile/);
 const appearance=render(h(SettingsScreen,{...props,section:'settings-appearance'}));for(const palette of palettes)assert.ok(appearance.includes(palette.name));assert.match(appearance,/Text size/);assert.match(appearance,/Use device/);
 const widgets=render(h(SettingsScreen,{...props,section:'settings-widgets'}));assert.match(widgets,/checkbox/);assert.match(widgets,/Move events up/);
});
test('each entity has an immediate-use creation screen and collection pages do not embed its form',()=>{
 for(const kind of ['space','society','event','ping','channel']){
  const html=render(h(EntityEditor,{kind,onCreated(){},onCancel(){}}));assert.match(html,/Public/);assert.match(html,/Private/);assert.doesNotMatch(html,/public review|after review|Submit for/);assert.ok(html.includes('Create '+kind[0].toUpperCase()+kind.slice(1)));
  assert.equal(html.includes('datetime-local'),kind==='event'||kind==='ping');
  const list=render(h(EntityCollection,{kind,entities:[],onOpen(){}}));assert.doesNotMatch(list,/<textarea|Create draft|Submit for public review/);
 }
});
