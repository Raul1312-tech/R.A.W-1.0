import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,emptyDay,generatePlan,total,foods} from '../app/model.ts';
import {refreshDailyMeal,recordMeal,foodDayView} from '../app/daily-food-model.ts';
import {stateSchema} from '../app/validation.ts';
test('refresh changes only chosen pending meal, persists and preserves logs and nutrition',()=>{
 const p={...newProfile(),confirmed:true}, plan=generatePlan(p,3), date='2026-11-03';
 const day=recordMeal(emptyDay(p),plan,date,0,'planned');
 const before=JSON.stringify({day,plan});
 let next=day;
 for(let n=0;n<8;n++){
  const previous=next;
  next=refreshDailyMeal(next,plan,date,1,p);
  assert.notEqual(next.foodPlan.meals[1].name,previous.foodPlan.meals[1].name);
  assert.deepEqual(next.items,day.items);assert.deepEqual(next.foodPlan.records,day.foodPlan.records);
  for(const slot of [0,2,3,4])assert.deepEqual(next.foodPlan.meals[slot],day.foodPlan.meals[slot]);
  assert.ok(Math.abs(total(next.foodPlan.meals[1].items).k-total(day.foodPlan.meals[1].items).k)<8);
 }
 assert.equal(JSON.stringify({day,plan}),before);
 const restored=stateSchema.parse(JSON.parse(JSON.stringify({active:p.id,profiles:[{...p,plans:[plan],days:{[date]:next}}]}))).profiles[0].days[date];
 assert.deepEqual(foodDayView(restored,plan,date).meals,next.foodPlan.meals);
 assert.throws(()=>refreshDailyMeal(day,plan,date,0,p),/Deshaz/);
 assert.throws(()=>refreshDailyMeal(day,plan,date,9,p));
});
test('refresh respects exclusions, fails safely when impossible and works without a current plan',()=>{
 const p=newProfile(),plan=generatePlan(p,2),date='2026-11-03',day=recordMeal(emptyDay(p),plan,date,0,'planned');
 const restricted={...p,excluded:['chicken','turkey-slices'],allergens:['leche']};
 const next=refreshDailyMeal(day,undefined,date,1,restricted);
 assert.ok(next.foodPlan.meals[1].items.every(it=>!restricted.excluded.includes(it.food.id)&&!it.food.allergens.some(a=>restricted.allergens.includes(a))));
 assert.throws(()=>refreshDailyMeal(day,plan,date,1,{...p,excluded:foods.map(f=>f.id)}),/compatible/);
});
