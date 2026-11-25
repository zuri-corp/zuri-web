import test from 'node:test';
import assert from 'node:assert/strict';
import {File} from 'node:buffer';
import {identifyMedia,prepareMedia,MEDIA_LIMIT} from '../src/experience/mediaPreparation.ts';

globalThis.File ??= File;

test('recognizes the signatures accepted by the upload service',()=>{
 assert.equal(identifyMedia(Uint8Array.from([255,216,255,0])),'image/jpeg');
 assert.equal(identifyMedia(Uint8Array.from([137,80,78,71,13,10,26,10])),'image/png');
 assert.equal(identifyMedia(new TextEncoder().encode('RIFF0000WEBP')),'image/webp');
 assert.equal(identifyMedia(new TextEncoder().encode('0000ftypisom')),'video/mp4');
 assert.equal(identifyMedia(new TextEncoder().encode('0000ftypheic')),null);
});

test('keeps valid image bytes and corrects a misleading MIME label',async()=>{
 const original=new File([Uint8Array.from([255,216,255,4,5])],'photo.jpg',{type:'image/jpeg'});
 assert.equal(await prepareMedia(original),original);
 const mislabeled=new File([original],'photo.jpg',{type:'application/octet-stream'});
 const prepared=await prepareMedia(mislabeled);
 assert.equal(prepared.type,'image/jpeg');
 assert.deepEqual(new Uint8Array(await prepared.arrayBuffer()),new Uint8Array(await original.arrayBuffer()));
});

test('rejects oversized video and unsupported containers before upload',async()=>{
 await assert.rejects(prepareMedia(new File([new Uint8Array(MEDIA_LIMIT+1)],'long.mp4',{type:'video/mp4'})),/10 MB/);
 await assert.rejects(prepareMedia(new File(['0000ftypqt  '],'clip.mov',{type:'video/quicktime'})),/not supported/);
});

test('reduces a large photo without cropping its proportions',async()=>{
 const previousImage=globalThis.Image,previousDocument=globalThis.document;
 let dimensions;
 globalThis.Image=class {naturalWidth=6000;naturalHeight=3000;async decode(){} };
 globalThis.document={createElement:()=>({width:0,height:0,getContext(){return {drawImage:()=>{dimensions=[this.width,this.height];}};},toBlob(callback,type){callback(new Blob([Uint8Array.from([255,216,255,1])],{type}));}})};
 try{
  const large=new File([Uint8Array.from([255,216,255]),new Uint8Array(MEDIA_LIMIT)],'large.jpg',{type:'image/jpeg'});
  const result=await prepareMedia(large);
  assert.deepEqual(dimensions,[4096,2048]);
  assert.equal(result.type,'image/jpeg');
  assert.ok(result.size<MEDIA_LIMIT);
 }finally{globalThis.Image=previousImage;globalThis.document=previousDocument;}
});
