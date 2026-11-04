import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData,readData} from '../src/experience/model.ts';
import {setChatWallpaper} from '../src/experience/chatSettings.ts';
import {contextHeader} from '../src/experience/activity.ts';
test('wallpapers persist per conversation without changing other chats or messages',()=>{const d=structuredClone(initialData);let next=setChatWallpaper(d,'u1','ocean');next=setChatWallpaper(next,'u3','rose');assert.equal(next.chatWallpapers.u1,'ocean');assert.equal(next.chatWallpapers.u3,'rose');assert.equal(d.chatWallpapers,undefined);assert.deepEqual(next.messages,d.messages);assert.deepEqual(readData(JSON.stringify(next)),next);next=setChatWallpaper(next,'u1','default');assert.equal(next.chatWallpapers.u3,'rose');assert.throws(()=>setChatWallpaper(d,'u1','invalid'),/supported/);});
test('malformed wallpaper backups fail safely and chat options show the conversation context',()=>{assert.throws(()=>readData(JSON.stringify({...initialData,chatWallpapers:{u1:'bad'}})),/wallpaper/);const h=contextHeader(initialData,{world:'lore',tab:'Profile',kind:'object-actions',id:'chat:u3'});assert.equal(h.title,'Chat options');assert.equal(h.parent,'Sarah Amara');});

test('photo wallpapers use the same saved per-chat settings',()=>{const d=setChatWallpaper(structuredClone(initialData),'u1','lake-photo');assert.equal(readData(JSON.stringify(d)).chatWallpapers.u1,'lake-photo');});
