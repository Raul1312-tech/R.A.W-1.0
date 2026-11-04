import test from 'node:test';
import assert from 'node:assert/strict';
import {photoName,parsePhotoName,validProfile,validPhotoDate,validView,comparablePhotos,readPhotoBody,PHOTO_LIMIT} from '../lib/progress-photos.ts';
test('photo paths cannot escape a profile and retain date and view',()=>{
 const name=photoName('2026-11-04','front','12345678-1234-1234-1234-123456789012');assert.equal(parsePhotoName(name,'profile-1').date,'2026-11-04');
 for(const input of ['../user','a/b','%2f','', 'a'.repeat(101)])assert.equal(validProfile(input),false);
 for(const input of ['../'+name,name+'/x',name.replace('front','nude'),name.replace('2026-11-04','2026-02-31')])assert.equal(parsePhotoName(input,'profile-1'),null);
 assert.equal(validPhotoDate('2024-02-29'),true);assert.equal(validPhotoDate('2026-02-29'),false);assert.equal(validView('__proto__'),false);
});
test('comparison orders matching views and never mixes front with side',()=>{
 const photos=[{id:'b',date:'2026-11-04',view:'front'},{id:'c',date:'2026-10-01',view:'side'},{id:'a',date:'2026-10-01',view:'front'}];
 assert.deepEqual(comparablePhotos(photos,'front').map(p=>p.id),['a','b']);assert.equal(photos[0].id,'b');
});
test('photo upload enforces JPEG type, signature and streamed size',async()=>{
 const req=(bytes,type='image/jpeg')=>new Request('http://localhost/api/progress-photos',{method:'POST',headers:{'content-type':type},body:bytes});
 assert.equal((await readPhotoBody(req(new Uint8Array([255,216,0,255,217])))).length,5);
 await assert.rejects(readPhotoBody(req('not an image')));await assert.rejects(readPhotoBody(req(new Uint8Array([255,216,255,217]),'image/svg+xml')));
 await assert.rejects(readPhotoBody(req(new Uint8Array(PHOTO_LIMIT+1))));
});
