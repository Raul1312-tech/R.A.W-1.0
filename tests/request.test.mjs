import test from 'node:test';
import assert from 'node:assert/strict';
import {readLimitedJson,sameOrigin,MAX_BYTES} from '../lib/request.ts';
import {initialState} from '../app/model.ts';
test('first visit contains no personal profile or automatic meal plan',()=>{const s=initialState();assert.equal(s.profiles[0].confirmed,false);assert.equal(s.profiles[0].name,'Nuevo perfil');assert.deepEqual(s.profiles[0].plans,[]);assert.deepEqual(s.profiles[0].days,{})});
test('reject missing and cross-site origins for cookie mutations',()=>{assert.equal(sameOrigin(new Request('https://raw.example/api/journal')),false);assert.equal(sameOrigin(new Request('https://raw.example/api/journal',{headers:{origin:'https://evil.example'}})),false);assert.equal(sameOrigin(new Request('https://raw.example/api/journal',{headers:{origin:'https://raw.example'}})),true)});
test('body cap applies even without a content-length header',async()=>{await assert.rejects(readLimitedJson(new Request('https://raw.example',{method:'PUT',body:'x'.repeat(MAX_BYTES+1)})),RangeError);await assert.rejects(readLimitedJson(new Request('https://raw.example',{method:'PUT',body:'no json'})),SyntaxError);assert.deepEqual(await readLimitedJson(new Request('https://raw.example',{method:'PUT',body:'{"revision":1}'})),{revision:1})});
