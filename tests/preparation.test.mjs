import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,generatePlan,emptyDay,total,targets} from '../app/model.ts';
import {saveFavorite,useFavorite,applyRepeats,freezeMonth,planForFoodDate,monthlyShopping,toggleSupplement,competitionContext} from '../app/preparation-model.ts';
import {recordMeal,foodSnapshot} from '../app/daily-food-model.ts';
import {stateSchema} from '../app/validation.ts';
import {competitionSchema} from '../app/preparation-schema.ts';
import {generateTrainingPlan,defaultTrainingConfig,trainingLevels} from '../app/training-model.ts';
import {sessionsForDate,editCalendarDay} from '../app/training-calendar-model.ts';
import {estimateShopping} from '../app/shopping-cost.ts';
const setup=()=>{const p={...newProfile('Test'),confirmed:true};return {p,plan:generatePlan(p,4),date:'2026-11-03'}};
test('favorite meals are isolated, reusable only before logging and follow exclusions',()=>{
 const {p,plan,date}=setup();const saved=saveFavorite(p,plan.meals[0],0),f=saved.preparation.favorites[0];
 assert.equal(p.preparation,undefined);assert.deepEqual(f.meal,plan.meals[0]);
 const day=useFavorite(emptyDay(p),plan,date,saved,f.id,0);
 assert.deepEqual(day.foodPlan.meals[0],f.meal);assert.equal(day.items.length,0);
 const logged=recordMeal(day,plan,date,0,'planned');assert.throws(()=>useFavorite(logged,plan,date,saved,f.id,0));
 assert.throws(()=>useFavorite(emptyDay(p),plan,date,{...saved,excluded:[f.meal.items[0].food.id]},f.id,0));
});
test('monthly snapshot includes exact month weekdays, repeats and remains stable across new weeks',()=>{
 const {p,plan}=setup();let saved=saveFavorite(p,plan.meals[0],0);saved.preparation.favorites[0].repeat=true;
 saved=freezeMonth(saved,plan,'2026-11');const month=saved.preparation.monthlyMenus[0];assert.equal(month.days.length,30);
 assert.deepEqual(month.days[0].meals[2],plan.week[6].meals[2]);
 assert.ok(month.days.every(d=>JSON.stringify(d.meals[0])===JSON.stringify(saved.preparation.favorites[0].meal)));
 const newer=generatePlan(saved,5);assert.deepEqual(planForFoodDate(saved,newer,'2026-11-03').meals,month.days[2].meals);
 assert.equal(freezeMonth(saved,plan,'2028-02').preparation.monthlyMenus.at(-1).days.length,29);
 assert.ok(Math.abs(total(monthlyShopping(saved,'2026-11')).k-total(month.days.flatMap(d=>d.meals.flatMap(m=>m.items))).k)<.001);
 const next=stateSchema.parse(JSON.parse(JSON.stringify({active:saved.id,profiles:[{...saved,plans:[plan]}]})));assert.equal(next.profiles[0].preparation.monthlyMenus[0].days.length,30);
 assert.equal(applyRepeats({...saved,excluded:[month.days[0].meals[0].items[0].food.id]},plan.meals)[0].name,plan.meals[0].name);
});
test('supplement checks count label macros once and creatine capsule grams separately',()=>{
 const {p}=setup();const whey={id:'w',name:'Protein',kind:'protein',timing:'postworkout',amount:30,unit:'g',gramsPerUnit:1,k:400,p:80,c:5,f:4,allergens:['leche']};
 const base=emptyDay(p),one=toggleSupplement(base,whey);assert.equal(foodSnapshot(one,generatePlan(p,1),'2026-11-03').records.length,0);assert.equal(total(one.items).p,24);assert.equal(total(one.items).k,120);
 assert.deepEqual(toggleSupplement(one,whey).items,[]);
 const creatine={...whey,id:'c',kind:'creatine',amount:3,unit:'capsules',gramsPerUnit:1};const both=toggleSupplement(one,creatine);
 assert.equal(both.items[1].grams,3);assert.equal(total(both.items).k,120);assert.equal(total(both.items).p,24);
});
test('manual energy target affects generation without calculating an acute cut',()=>{
 const {p}=setup();const adjusted={...p,preparation:{energyTarget:2400}};assert.equal(targets(adjusted).k,2400);assert.equal(generatePlan(adjusted,1).target.k,2400);
});
test('all five levels and every priority generate valid illustrated boxing sessions including neck/core',()=>{
 let previous=0;
 for(const level of Object.keys(trainingLevels))for(const priority of ['balanced','punch','footwork','core']){
  const plan=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',level,priority,phase:'build',duration:90,physicalDays:[0,3],runningDays:[1,4],medicineBall:true,boxingKit:['landmine','box','trapBar']});
  const s=plan.sessions[0];assert.ok(s.exercises.every(e=>e.catalogId));assert.ok(s.exercises.some(e=>e.catalogId==='neck-isometric'));assert.ok(s.exercises.filter(e=>e.block==='core').length>=3);
  assert.ok(s.exercises.length<=10);if(priority==='balanced'){const volume=s.exercises.reduce((n,e)=>n+e.sets,0);assert.ok(volume>=previous);previous=volume;}
  if(priority==='footwork')assert.ok(s.exercises.some(e=>e.catalogId==='cone-shuffle'));
 }
});
test('competition dates validate and taper is optional, dated, does not double apply or alter base plan',()=>{
 const competition={fight:'2026-11-15T19:00:00+01:00',weighIn:'2026-11-15T09:00:00+01:00',weight:70,taper:true,notes:''};
 assert.ok(competitionSchema.safeParse(competition).success);assert.equal(competitionContext(competition,'2026-11-15').hours,10);
 assert.equal(competitionSchema.safeParse({...competition,weighIn:'2026-11-16T09:00:00Z'}).success,false);
 const plan={...generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',level:'competitive',physicalDays:[0,1,2,3,4,5,6],runningDays:[],competition}),month:'2026-11'};
 const before=JSON.stringify(plan),full=sessionsForDate(plan,'2026-11-02'),taper=sessionsForDate(plan,'2026-11-09');
 assert.ok(taper[0].exercises[0].sets<full[0].exercises[0].sets);assert.equal(sessionsForDate(plan,'2026-11-14').length,0);
 assert.ok(sessionsForDate({...plan,config:{...plan.config,competition:{...competition,taper:false}}},'2026-11-14').length);
 const edited=editCalendarDay(plan,'2026-11','2026-11-09',taper,'date');assert.equal(sessionsForDate(edited,'2026-11-09')[0].exercises[0].sets,taper[0].exercises[0].sets);assert.equal(JSON.stringify(plan),before);
});
test('profile price overrides calculate full packs, preserve source date and never affect other profiles',()=>{
 const {plan}=setup();const item=plan.meals[0].items[0];const overrides={[item.food.id]:{perKg:10,packGrams:500,checked:'2026-11-05',source:'ticket'}};
 const cost=estimateShopping([{...item,grams:750}],new Set(),overrides);assert.equal(cost.mean,10);assert.match(cost.rows[0].ref.note,/2026-11-05/);
 assert.notDeepEqual(estimateShopping([{...item,grams:750}]).rows[0].ref,cost.rows[0].ref);
});
