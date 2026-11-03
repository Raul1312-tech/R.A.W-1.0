import test from 'node:test';
import assert from 'node:assert/strict';
import {readDemo,writeDemo,DEMO_STORAGE_KEY} from '../lib/demo-storage.ts';
import {initialState} from '../app/model.ts';

test('demo persists only in its own browser namespace and reloads changes',()=>{
  const values=new Map([['account-journal','private'],['sb-auth-token','session']]);
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  assert.equal(readDemo(storage),null);
  const state=initialState();state.profiles[0].name='Local example';
  writeDemo(storage,state);
  assert.deepEqual(readDemo(storage),state);
  assert.equal(values.get('account-journal'),'private');
  assert.equal(values.get('sb-auth-token'),'session');
  assert.equal(values.size,3);
  assert.ok(values.has(DEMO_STORAGE_KEY));
});

test('corrupt data is not silently replaced and storage failures are reported',()=>{
  const storage={getItem:()=>'{broken',setItem:()=>assert.fail('unexpected write')};
  assert.throws(()=>readDemo(storage),/No se pudo leer/);
  assert.throws(()=>writeDemo({...storage,setItem:()=>{throw new Error('quota')}},{value:'test'}),/no permite guardar/);
  assert.throws(()=>writeDemo(storage,{value:'a'.repeat(2_000_001)}),/supera 2 MB/);
});
