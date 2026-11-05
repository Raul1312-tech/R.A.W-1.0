import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,generatePlan,updateMenuSelection,total} from '../app/model.ts';

test('refreshing any meal changes only that meal and preserves the original plan',()=>{
 const profile=newProfile('Prueba'),plan=generatePlan(profile,1);
 const original=structuredClone(plan);
 for(let day=0;day<7;day++)for(let slot=0;slot<5;slot++){
  const next=updateMenuSelection(profile,plan,day,slot);
  assert.ok(next);assert.notEqual(next.id,plan.id);
  for(let d=0;d<7;d++)for(let s=0;s<5;s++){
   if(d===day&&s===slot)assert.notEqual(next.week[d].meals[s].name,plan.week[d].meals[s].name);
   else assert.deepEqual(next.week[d].meals[s],plan.week[d].meals[s]);
  }
  assert.deepEqual(next.meals,next.week[0].meals);
  const macros=total(next.week[day].meals.flatMap(m=>m.items));
  assert.ok(Math.abs(macros.k-plan.target.k)<plan.target.k*.05);
 }
 assert.deepEqual(plan,original);
});

test('refreshing a day replaces all its meals and leaves the other six days untouched',()=>{
 const profile=newProfile('Prueba'),plan=generatePlan(profile,1);
 for(let day=0;day<7;day++){
  const next=updateMenuSelection(profile,plan,day);
  assert.ok(next);
  for(let d=0;d<7;d++){
   if(d===day)next.week[d].meals.forEach((m,s)=>assert.notEqual(m.name,plan.week[d].meals[s].name));
   else assert.deepEqual(next.week[d],plan.week[d]);
  }
  assert.deepEqual(next.meals,next.week[0].meals);
 }
 assert.equal(updateMenuSelection(profile,plan,7),null);
 assert.equal(updateMenuSelection(profile,plan,0,8),null);
});
