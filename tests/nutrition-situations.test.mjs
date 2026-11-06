import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,generatePlan,emptyDay,total,targets} from '../app/model.ts';
import {saveNutritionSituation,applyNutritionSituation,clearNutritionSituation,previewNutritionSituation} from '../app/nutrition-situations-model.ts';
import {nutritionSituationSchema} from '../app/nutrition-situation-schema.ts';
import {recordMeal,foodDayView} from '../app/daily-food-model.ts';
import {freezeMonth,monthlyShopping,toggleSupplement,saveFavorite,supplementsForDay} from '../app/preparation-model.ts';
import {mealTimes} from '../app/meal-layout.ts';
import {stateSchema} from '../app/validation.ts';
import {situationEnergy,outsideMealEstimate} from '../app/nutrition-estimates.ts';
import {generateTrainingPlan,defaultTrainingConfig} from '../app/training-model.ts';
const date='2026-11-07';
const setup=()=>{let p={...newProfile('Atleta'),confirmed:true};const plan=generatePlan(p,3);p.plans=[plan];return {p,plan}};
const situation=(count=2)=>({id:'weekend',name:'Fin de semana',mealCount:count,times:mealTimes(count,'weekend'),energyTarget:2400,training:'rest',supplements:[]});
const roundTrip=p=>stateSchema.parse(JSON.parse(JSON.stringify({active:p.id,profiles:[p]}))).profiles[0];

test('saved situations generate two to six meals with calculated energy and chosen times, survive reload and leave other dates/week untouched',()=>{
  for(let count=2;count<=6;count++){
    const {p,plan}=setup();p.days['2026-11-06']={...emptyDay(p),water:750};
    const before=JSON.stringify(p),s=situation(count),saved=saveNutritionSituation(p,s),next=applyNutritionSituation(saved,s.id,date);
    const day=next.days[date];assert.equal(day.foodPlan.meals.length,count);assert.equal(day.target.k,2800);assert.deepEqual(day.nutrition.times,s.times);assert.equal(day.items.length,0);
    assert.ok(Math.abs(total(day.foodPlan.meals.flatMap(m=>m.items)).k-day.target.k)<day.target.k*.05);
    assert.deepEqual(next.plans,[plan]);assert.deepEqual(next.days['2026-11-06'],p.days['2026-11-06']);assert.equal(JSON.stringify(p),before);
    assert.deepEqual(roundTrip(next).days[date],day);
  }
});

test('a dated situation overrides a fixed month in the daily snapshot and shopping and can restore its normal meals',()=>{
  const {p,plan}=setup();let next=saveNutritionSituation(freezeMonth(p,plan,'2026-11'),situation());
  next.days[date]={...emptyDay(p),water:900,steps:2000,minutes:35,notes:'Notas del día'};
  const original=total(monthlyShopping(next,'2026-11')).k;const fixed=next.preparation.monthlyMenus[0].days.find(x=>x.date===date);
  const changed=applyNutritionSituation(next,'weekend',date),day=changed.days[date];
  assert.equal(day.water,900);assert.equal(day.steps,2000);assert.equal(day.minutes,35);assert.equal(day.notes,'Notas del día');
  assert.ok(Math.abs(total(monthlyShopping(changed,'2026-11')).k-original-(total(foodDayView(day,undefined,date).meals.flatMap(m=>m.items)).k-total(fixed.meals.flatMap(m=>m.items)).k))<.001);
  const restored=clearNutritionSituation(changed,date,plan);assert.equal(restored.days[date].nutrition,undefined);assert.deepEqual(restored.days[date].foodPlan.meals,fixed.meals);assert.equal(restored.days[date].water,900);
});

test('editing definitions cannot mutate an applied day and applying after eating preserves the exact records',()=>{
  const {p,plan}=setup();let next=applyNutritionSituation(saveNutritionSituation(p,situation()),'weekend',date);
  const before=JSON.stringify(next.days[date]);next=saveNutritionSituation(next,{...situation(),name:'Otro finde',energyTarget:2600});
  assert.equal(JSON.stringify(next.days[date]),before);next.preparation.situations=[];assert.equal(next.days[date].nutrition.name,'Fin de semana');
  next=saveNutritionSituation(next,situation());next.days[date]=recordMeal(next.days[date],plan,date,0,'planned');
  const logged=JSON.stringify(next),changed=applyNutritionSituation(next,'weekend',date);
  assert.deepEqual(changed.days[date].items,next.days[date].items);assert.deepEqual(changed.days[date].foodPlan.records,next.days[date].foodPlan.records);
  assert.throws(()=>clearNutritionSituation(next,date,plan),/registrados/);assert.equal(JSON.stringify(next),logged);
});

test('supplement choices and doses count in the chosen total without inventing consumption or withdrawing any product globally',()=>{
  const {p}=setup();const whey={id:'w',name:'Proteína',kind:'protein',timing:'postworkout',amount:30,unit:'g',gramsPerUnit:1,k:400,p:80,c:5,f:4,allergens:['leche']};
  const creatine={...whey,id:'c',name:'Creatina',kind:'creatine',unit:'capsules',amount:3,gramsPerUnit:1,allergens:[]};p.preparation={supplements:[whey,creatine]};
  const s={...situation(),supplements:[{id:'w',amount:20,timing:'breakfast'}]};const next=applyNutritionSituation(saveNutritionSituation(p,s),'weekend',date),day=next.days[date];
  assert.deepEqual(next.preparation.supplements,[whey,creatine]);assert.equal(day.items.length,0);assert.deepEqual(day.nutrition.supplements,s.supplements);
  assert.deepEqual(supplementsForDay(next,day),[{...whey,amount:20,timing:'breakfast'}]);
  assert.deepEqual(supplementsForDay(next,emptyDay(next)),[whey,creatine]);
  const expected=total(day.foodPlan.meals.flatMap(m=>m.items));assert.ok(Math.abs(expected.k+80-day.target.k)<day.target.k*.05);assert.ok(Math.abs(expected.p+16-day.target.p)<2);
  const checked=toggleSupplement(day,{...whey,amount:20,timing:'breakfast'});assert.equal(total(checked.items).k,80);assert.equal(checked.items[0].meal,'Suplementos · Desayuno');
  assert.equal(roundTrip({...next,days:{[date]:checked}}).days[date].items[0].grams,20);
});

test('late starts and fewer meals keep energy, rest calculates less, and obsolete manual situation calories are ignored',()=>{
  const {p}=setup(),base=targets(p),usual={...situation(),training:'usual'};
  assert.equal(situationEnergy(p,usual,date).target.k,base.k);
  const late=previewNutritionSituation(p,{...usual,mealCount:3,times:['12:00','16:00','21:00'],energyTarget:1200},date);
  assert.equal(late.target.k,base.k);
  const rest=previewNutritionSituation(p,{...situation(),energyTarget:6500},date);
  assert.ok(rest.target.k<base.k);assert.ok(rest.target.k>=base.k-Math.min(300,base.k*.1)-25);assert.equal(rest.target.p,base.p);
  assert.equal(previewNutritionSituation(p,{...situation(),energyTarget:1200},date).target.k,rest.target.k);
  const noCalories={...usual};delete noCalories.energyTarget;assert.ok(nutritionSituationSchema.safeParse(noCalories).success);
});

test('calendar activity is periodized around the existing average without adding exercise twice',()=>{
  const {p}=setup();p.workouts={plans:[generateTrainingPlan({...defaultTrainingConfig(),days:[0,2,4],duration:60})],logs:[]};
  const rest=situationEnergy(p,{training:'rest'},'2026-11-02'),training=situationEnergy(p,{training:'usual'},'2026-11-02');
  assert.equal(training.source,'calendar');assert.ok(training.target.k>rest.target.k);assert.ok(training.target.k-targets(p).k<250);
  const soft=situationEnergy(p,{training:'training',trainingMinutes:30,trainingIntensity:'light'},date),hard=situationEnergy(p,{training:'training',trainingMinutes:90,trainingIntensity:'hard'},date);
  assert.ok(hard.target.k>soft.target.k);
  assert.equal(situationEnergy({...p,preparation:{energyTarget:2500}},{training:'rest'},date).target.k,2500);
});

test('a rest override accounts for completed training and never deletes its log or adds its calories twice',()=>{
  const {p}=setup(),untrained=situationEnergy(p,{training:'rest'},date);p.days[date]={...emptyDay(p),minutes:60};
  const completed=situationEnergy(p,{training:'rest'},date);assert.equal(completed.completedMinutes,60);assert.ok(completed.target.k>untrained.target.k);
  const definition=situation();const applied=applyNutritionSituation(saveNutritionSituation(p,definition),definition.id,date);
  assert.equal(applied.days[date].minutes,60);assert.equal(applied.days[date].target.k,completed.target.k);
  assert.equal(situationEnergy(applied,{training:'rest'},date).target.k,completed.target.k);
});

test('outside meals reserve energy without invented consumption and recording the actual meal updates only pending quantities',()=>{
  const {p}=setup();const s={...situation(3),training:'usual',outsideMeals:[{slot:2,size:'large'}]};
  let next=applyNutritionSituation(saveNutritionSituation(p,s),s.id,date),day=next.days[date];
  assert.equal(day.target.k,targets(p).k);assert.equal(day.foodPlan.meals[1].items.length,0);assert.equal(day.items.length,0);
  const view=foodDayView(day,undefined,date),reserve=outsideMealEstimate(day,1);assert.ok(reserve.k>day.target.k*.38);assert.ok(view.adjustments.length>0);
  const actual=[{food:{id:'outside-label',name:'Plato según etiqueta',unit:'según envase',allergens:[],k:190,p:10,c:25,f:6},grams:400}];
  day=recordMeal(day,undefined,date,1,'alternative',actual);const after=foodDayView(day,undefined,date);
  assert.equal(total(day.items).k,760);assert.equal(day.foodPlan.records.length,1);assert.ok(after.adjustments.every(a=>a.slot>1));
  assert.ok(Math.abs(after.projected.k-total([...day.items,...after.pending.flatMap(i=>after.meals[i].items)]).k)<.001);
  assert.equal(roundTrip({...next,days:{[date]:day}}).days[date].items[0].food.id,'outside-label');
});

test('reducing meal count after an outside lunch retains its slot, food IDs and other dated data',()=>{
  const {p,plan}=setup();const original=recordMeal({...emptyDay(p),water:800,minutes:50},plan,date,2,'planned');p.days[date]=original;
  const next=applyNutritionSituation(saveNutritionSituation(p,situation()),'weekend',date),day=next.days[date];
  assert.equal(day.foodPlan.meals.length,3);assert.equal(day.nutrition.mealCount,3);assert.deepEqual(day.items,original.items);assert.equal(day.foodPlan.labels[day.foodPlan.records[0].slot],'Comida');assert.deepEqual(day.foodPlan.records[0].itemIds,original.foodPlan.records[0].itemIds);assert.equal(day.water,800);assert.equal(day.minutes,50);
  assert.deepEqual(roundTrip(next).days[date].foodPlan.records,day.foodPlan.records);
});

test('invalid dates, schedules, quantities, unavailable supplements and impossible diets fail without partial changes',()=>{
  const {p}=setup(),before=JSON.stringify(p);
  for(const input of [{...situation(),times:['12:00','11:00']},{...situation(),times:['12:00','12:00']},{...situation(),times:['25:00','26:00']},{...situation(),energyTarget:0},{...situation(),mealCount:1}])assert.equal(nutritionSituationSchema.safeParse(input).success,false);
  assert.throws(()=>previewNutritionSituation(p,situation(),'2026-02-31'));
  assert.throws(()=>saveNutritionSituation(p,{...situation(),supplements:[{id:'missing',amount:2,timing:'evening'}]}));
  assert.throws(()=>previewNutritionSituation({...p,excluded:['olive','rice','oats','bread','potato','pasta','couscous']},situation(),date));
  assert.equal(JSON.stringify(p),before);
});

test('replacing oats with a different ingredient and grams logs its macros once and only adjusts the remaining same-day meals',()=>{
  const {p,plan}=setup(),day=emptyDay(p),weekday=plan.week.findIndex(d=>d.meals[0].items.some(it=>it.food.id==='oats'));
  assert.ok(weekday>=0);const testDate='2026-11-'+String(2+weekday).padStart(2,'0'),base=foodDayView(day,plan,testDate);
  const muesli={id:'my-muesli',name:'Muesli según etiqueta',unit:'seco',allergens:['gluten'],k:420,p:10,c:68,f:12};
  const items=structuredClone(base.meals[0].items);const index=items.findIndex(x=>x.food.id==='oats');assert.ok(index>=0);
  items[index]={food:muesli,grams:160};const next=recordMeal(day,plan,testDate,0,'alternative',items),view=foodDayView(next,plan,testDate);
  assert.deepEqual(total(next.items),total(items));assert.equal(next.items.filter(x=>x.food.id==='my-muesli').length,1);assert.ok(!next.items.some(x=>x.food.id==='oats'));assert.ok(view.adjustments.length>0);assert.ok(view.adjustments.every(x=>x.slot>0));
  assert.deepEqual(foodDayView(emptyDay(p),plan,'2026-11-08').meals,plan.week[6].meals);assert.deepEqual(roundTrip({...p,days:{[date]:next}}).days[date].items,next.items);
  const saved=saveFavorite(p,{name:'Mi muesli',items},0);assert.equal(saveFavorite(saved,{name:'Mi muesli',items},0).preparation.favorites.length,1);
});
