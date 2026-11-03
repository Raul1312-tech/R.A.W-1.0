import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,emptyDay,generatePlan,total,foodById} from '../app/model.ts';
import {foodSnapshot,foodDayView,recordMeal,undoMeal,syncFoodRecords,replaceLooseFood} from '../app/daily-food-model.ts';
import {stateSchema} from '../app/validation.ts';
const setup=()=>{const profile={...newProfile('Prueba'),confirmed:true};const plan=generatePlan(profile,3);return {profile,plan,day:emptyDay(profile),date:'2026-11-03'}};
const food=(id,grams)=>({food:foodById(id),grams});
test('daily food uses Tuesday menu and snapshots it across weekly menu changes and JSON reload',()=>{
  const {profile,plan,day,date}=setup();assert.deepEqual(foodSnapshot(day,plan,date).meals,plan.week[1].meals);
  const saved=recordMeal(day,plan,date,0,'planned');const newer=generatePlan(profile,4);
  assert.deepEqual(foodDayView(saved,newer,date).snapshot.meals,plan.week[1].meals);
  const state={active:profile.id,profiles:[{...profile,plans:[plan],days:{[date]:saved}}]};
  const restored=stateSchema.parse(JSON.parse(JSON.stringify(state))).profiles[0].days[date];
  assert.deepEqual(restored.foodPlan,saved.foodPlan);assert.deepEqual(restored.items,saved.items);assert.equal(restored.target.k,saved.target.k);
});
test('one tap logs exactly the displayed quantities, double tap is idempotent and undo keeps unrelated foods/activity',()=>{
  const {plan,date}=setup();let day={...setup().day,water:500,minutes:45,items:[{...food('coffee',150),id:'extra',meal:'Otra toma'}]};
  const before=JSON.stringify(day),expected=foodDayView(day,plan,date).meals[0].items;
  const saved=recordMeal(day,plan,date,0,'planned');assert.equal(saved.items.length,expected.length+1);
  assert.deepEqual(saved.items.slice(1).map(({food,grams})=>({food,grams})),expected);
  assert.deepEqual(recordMeal(saved,plan,date,0,'planned'),saved);
  const undone=undoMeal(saved,0);assert.deepEqual(undone.items,day.items);assert.equal(undone.minutes,45);assert.equal(undone.water,500);assert.equal(JSON.stringify(day),before);
});
test('manual breakfast edits replace rather than duplicate and portions move towards target within bounds',()=>{
  const {plan,day,date}=setup();const base=foodDayView(day,plan,date);
  const breakfast=base.meals[0].items.map(it=>({...it,grams:it.grams*1.4}));
  const logged=recordMeal(day,plan,date,0,'alternative',breakfast);const view=foodDayView(logged,plan,date);
  assert.ok(view.adjustments.length>0);assert.ok(Math.abs(view.projected.k-day.target.k)<Math.abs(total([...breakfast,...base.meals.slice(1).flatMap(m=>m.items)]).k-day.target.k));
  for(const a of view.adjustments){assert.ok(a.slot>0);assert.ok(a.after>=a.before*.8&&a.after<=a.before*1.2)}
  assert.deepEqual(view.meals[0],base.meals[0]);assert.deepEqual(logged.items.map(({food,grams})=>({food,grams})),breakfast);
  const edited=recordMeal(logged,plan,date,0,'alternative',[food('bread',80),food('turkey-slices',60)]);
  assert.equal(edited.items.length,2);assert.equal(edited.foodPlan.records.length,1);
});
test('exact plan completion counts the full day once with no invented automatic eating',()=>{
  const {plan,day,date}=setup();let result=day;
  for(let slot=0;slot<5;slot++)result=recordMeal(result,plan,date,slot,'planned');
  assert.deepEqual(total(result.items),total(plan.week[1].meals.flatMap(m=>m.items)));
  assert.equal(result.foodPlan.records.length,5);assert.equal(foodDayView(result,plan,date).pending.length,0);assert.equal(result.complete,true);
});
test('skipping a meal records no consumption and never removes or doubles remaining meals',()=>{
  const {plan,day,date}=setup();const skipped=recordMeal(day,plan,date,0,'skipped');
  assert.equal(skipped.items.length,0);const view=foodDayView(skipped,plan,date);assert.equal(view.pending.length,4);
  for(const a of view.adjustments)assert.ok(a.after<=a.before*1.2&&a.after>=a.before*.8);
  assert.ok(view.projected.k<day.target.k); // The bounded adjustment does not pretend to recover a whole missing meal.
});
test('dinner never adjusts previous unrecorded meals or the next day, and disabling adjustment preserves base portions',()=>{
  const {plan,day,date}=setup();const original=JSON.stringify(plan);
  const dinner=recordMeal(day,plan,date,4,'alternative',[food('bread',500),food('olive',100)]);
  const view=foodDayView(dinner,plan,date);assert.equal(view.adjustments.length,0);assert.equal(view.finished,true);
  assert.deepEqual(foodDayView(day,plan,'2026-11-04').meals,plan.week[2].meals);assert.equal(JSON.stringify(plan),original);
  const breakfast=recordMeal(day,plan,date,0,'skipped');breakfast.foodPlan.autoAdjust=false;assert.equal(foodDayView(breakfast,plan,date).adjustments.length,0);
});
test('earlier unmarked meals are not mistaken for skipped meals and completed later meals stay untouched',()=>{
  const {plan,day,date}=setup();let result=recordMeal(day,plan,date,2,'alternative',[food('rice-cooked',500)]);
  const v=foodDayView(result,plan,date);assert.ok(v.adjustments.every(a=>a.slot>2));assert.deepEqual(v.meals[0],plan.week[1].meals[0]);
  result=recordMeal(result,plan,date,3,'planned');const actual=JSON.stringify(result.items.filter(it=>result.foodPlan.records.find(r=>r.slot===3).itemIds.includes(it.id)));
  result=recordMeal(result,plan,date,2,'alternative',[food('rice-cooked',150)]);
  assert.equal(JSON.stringify(result.items.filter(it=>result.foodPlan.records.find(r=>r.slot===3).itemIds.includes(it.id))),actual);
});
test('legacy food logs attach to their meal without duplication and single-item corrections update completion status',()=>{
  const {plan,day,date}=setup();const legacy={...day,items:[{...food('egg',100),id:'old',meal:'Primera comida'}]};
  const view=foodDayView(legacy,plan,date);assert.equal(view.snapshot.records[0].status,'alternative');assert.equal(view.snapshot.records[0].itemIds[0],'old');
  const replaced=recordMeal(legacy,plan,date,0,'alternative',[food('egg',150)]);assert.equal(replaced.items.length,1);
  const planned=recordMeal(day,plan,date,0,'planned');const items=planned.items.map((it,i)=>i?it:{...it,grams:it.grams+10});
  assert.equal(syncFoodRecords(planned,items).records[0].status,'alternative');assert.equal(syncFoodRecords(planned,[]).records.length,0);
});
test('large deviations stay bounded and invalid amounts cannot enter the meal log',()=>{
  const {plan,day,date}=setup();const result=recordMeal(day,plan,date,0,'alternative',[food('olive',500)]);const view=foodDayView(result,plan,date);
  assert.ok(view.meals.every(m=>m.items.every(it=>it.grams>0)));assert.ok(view.adjustments.every(a=>a.after>=a.before*.8));
  assert.throws(()=>recordMeal(day,plan,date,0,'alternative',[]));assert.throws(()=>recordMeal(day,plan,date,0,'alternative',[food('bread',NaN)]));
  assert.throws(()=>replaceLooseFood(day,[food('bread',4000)],'Otra toma'));
});
