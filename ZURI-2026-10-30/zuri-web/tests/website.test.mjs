import './hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const {stories,directory,services,searchDirectory,profileHref}=await import('../src/lib/content/website.ts');
test('directory searches offering, category, name and location',()=>{
 assert.equal(searchDirectory(' portrait ', 'all','all')[0].slug,'amina-k');
 assert.equal(searchDirectory('GARDEN','all','all')[0].slug,'the-garden-house');
 assert.equal(searchDirectory('Kampala','space','all').length,2);
});
test('directory combines type and category without false matches',()=>{
 assert.equal(searchDirectory('photography','space','Photography & Design').length,1);
 assert.equal(searchDirectory('photography','space','Events & Venues').length,0);
 assert.equal(searchDirectory('nothing-here','all','all').length,0);
 assert.equal(searchDirectory('','all','all').length,3);
});
test('Space and person links preserve type boundaries',()=>{
 assert.equal(profileHref(directory[0]),'/the-garden-house');
 assert.equal(profileHref(directory[2]),'/pamoja/people/amina-k');
});
test('all fixtures stay visibly non-live; slugs are unique and safe',()=>{
 for(const collection of [stories,directory,services]){assert.equal(new Set(collection.map(x=>x.slug)).size,collection.length);for(const x of collection)assert.match(x.slug,/^[a-z0-9-]+$/);}
 for(const item of directory)assert.equal(item.sample,true);
 for(const story of stories)assert.ok(story.paragraphs.some(p=>/illustrative|sample|example/.test(p)));
});
