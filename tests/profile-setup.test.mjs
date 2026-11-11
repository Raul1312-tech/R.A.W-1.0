import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,generatePlan,total,emptyDay,targets} from '../app/model.ts';
import {saveProfileSetup,profileSetupSchema} from '../app/profile-setup-model.ts';
import {stateSchema} from '../app/validation.ts';
import {recordMeal,foodSnapshot,refreshDailyMeal} from '../app/daily-food-model.ts';
import {saveFavorite,applyRepeats,freezeMonth,monthlyShopping,planForFoodDate} from '../app/preparation-model.ts';
import {mealLabelsFor,mealSlots,mealTimes} from '../app/meal-layout.ts';
import {coachContext} from '../app/coach-model.ts';
import {defaultTrainingConfig,generateTrainingPlan} from '../app/training-model.ts';
import {saveNutritionSituation,applyNutritionSituation} from '../app/nutrition-situations-model.ts';

const input=(p,count=5)=>({name:p.name,age:p.age,sex:p.sex,height:p.height,weight:p.weight,goal:p.goal,activity:p.activity,waterGoal:p.waterGoal,health:p.health,budget:p.budget,allergens:p.allergens,excluded:p.excluded,confirmed:true,mealCount:count,athlete:{sport:'boxing',level:'experienced',goal:'performance',schedule:'regular',competitionWeight:{mode:'none'}}});
const date='2026-11-06';

test('updating the usual profile preserves an explicitly planned dated situation',()=>{
  let p={...newProfile('Atleta'),confirmed:true};p.plans=[generatePlan(p,1)];
  p=applyNutritionSituation(saveNutritionSituation(p,{id:'late',name:'Me levanto tarde',mealCount:2,times:['12:00','20:00'],energyTarget:2400,training:'rest',supplements:[]}),'late','2026-11-07');
  const before=structuredClone(p.days['2026-11-07']);const next=saveProfileSetup(p,input(p,4),date);
  assert.equal(next.plans.at(-1).meals.length,4);assert.deepEqual(next.days['2026-11-07'],before);
});

test('three to six meals produce complete, balanced weeks and survive saving, logging and monthly shopping',()=>{
  for(const count of [3,4,5,6])for(const sex of ['male','female']){
    const p={...newProfile('Atleta'),sex};
    const next=saveProfileSetup(p,input(p,count),date),plan=next.plans.at(-1);
    assert.equal(plan.week.length,7);
    for(const day of plan.week){
      assert.equal(day.meals.length,count);const macros=total(day.meals.flatMap(m=>m.items));
      assert.ok(Math.abs(macros.k-plan.target.k)<plan.target.k*.05);
      for(const macro of ['p','c','f'])assert.ok(Math.abs(macros[macro]-plan.target[macro])<3);
      assert.equal(new Set(mealLabelsFor(count)).size,count);
    }
    let day=emptyDay(next);for(let slot=0;slot<count;slot++)day=recordMeal(day,plan,date,slot,'planned');
    assert.equal(day.complete,true);assert.equal(day.foodPlan.records.length,count);
    assert.deepEqual([...new Set(day.items.map(item=>item.meal))],mealLabelsFor(count));
    next.days[date]=day;
    const fixed=freezeMonth(next,plan,'2026-11');
    assert.equal(fixed.preparation.monthlyMenus[0].days[0].meals.length,count);
    const sum=total(monthlyShopping(fixed,'2026-11')).k;
    assert.ok(Math.abs(sum-total(fixed.preparation.monthlyMenus[0].days.flatMap(d=>d.meals.flatMap(m=>m.items))).k)<.001);
    const restored=stateSchema.parse(JSON.parse(JSON.stringify({active:fixed.id,profiles:[fixed]}))).profiles[0];
    assert.equal(restored.mealCount,count);assert.deepEqual(restored.athlete,next.athlete);
    const {bmr,maintenance,...dailyTarget}=day.target;
    assert.deepEqual(restored.days[date],{...day,target:dailyTarget});
    assert.equal(mealTimes(count,'early').length,count);
  }
});

test('changing meal count rebuilds the current distribution while preserving food records, past dates and dinner favorites',()=>{
  let p={...newProfile('Atleta'),confirmed:true};const plan=generatePlan(p,1);p.plans=[plan];
  p=saveFavorite(p,plan.meals[4],4);p.preparation.favorites[0].repeat=true;
  p=freezeMonth(p,plan,'2026-11');
  p.days['2026-11-05']=recordMeal(emptyDay(p),plan,'2026-11-05',0,'planned');
  p.days[date]=recordMeal(emptyDay(p),plan,date,0,'planned');
  p.days['2026-11-07']={...emptyDay(p),water:500,foodPlan:foodSnapshot(emptyDay(p),plan,'2026-11-07')};
  const before=structuredClone(p);
  const next=saveProfileSetup(p,input(p,3),date);
  assert.deepEqual(p,before);assert.deepEqual(next.plans[0],plan);
  assert.equal(next.days[date].foodPlan.meals.length,3);assert.deepEqual(next.days[date].items,before.days[date].items);assert.deepEqual(next.days['2026-11-05'],before.days['2026-11-05']);
  assert.equal(next.days['2026-11-07'].water,500);assert.equal(next.days['2026-11-07'].foodPlan.meals.length,3);
  const old=next.preparation.monthlyMenus[0].days.find(day=>day.date===date);
  assert.equal(old.meals.length,5);
  const pending=planForFoodDate(next,next.plans.at(-1),'2026-11-07');assert.equal(pending.meals.length,3);
  assert.deepEqual(pending.meals[2],p.preparation.favorites[0].meal);
  const changed=refreshDailyMeal(next.days[date],next.plans.at(-1),date,1,next);
  assert.equal(changed.foodPlan.meals.length,3);assert.deepEqual(changed.items,p.days[date].items);
  for(const count of [3,4,6]){
    const chosen={...next,mealCount:count};const current=generatePlan(chosen,3);
    const repeated=applyRepeats(chosen,current.meals);const dinner=mealSlots(count).indexOf(4);
    assert.deepEqual(repeated[dinner],p.preparation.favorites[0].meal);
  }
});

test('competition weight is saved without inventing dates or an automatic calorie cut',()=>{
  const p=newProfile('Atleta'),fields=input(p,4);
  fields.athlete.competitionWeight={mode:'target',weight:65,date:'2026-12-12',event:'Campeonato'};
  const next=saveProfileSetup(p,fields,date);
  assert.equal(next.preparation,undefined);
  assert.equal(next.athlete.competitionWeight.weight,65);
  assert.equal(next.surplus,0);assert.equal(next.goal,p.weight);
  const without=saveProfileSetup(p,input(p,4),date);
  assert.deepEqual(targets(next),targets(without));
  assert.ok(coachContext(next,date).facts.some(f=>f.id==='competition-weight'&&f.text.includes('65')));
  assert.ok(coachContext(next,date).facts.some(f=>f.id==='athlete'&&f.text.includes('4 comidas')));
  const gain=saveProfileSetup(p,{...fields,athlete:{...fields.athlete,goal:'gain'}},date);
  assert.ok(targets(gain).k>targets(next).k);
});

test('setup rejects malformed input and impossible diets before replacing the previous profile',()=>{
  const p=newProfile('Atleta'),before=JSON.stringify(p);
  assert.equal(profileSetupSchema.safeParse({...input(p),mealCount:2}).success,false);
  assert.equal(profileSetupSchema.safeParse({...input(p),mealCount:7}).success,false);
  assert.equal(profileSetupSchema.safeParse({...input(p),athlete:{...input(p).athlete,competitionWeight:{mode:'target',weight:65,date:'2026-02-30'}}}).success,false);
  assert.equal(profileSetupSchema.safeParse({...input(p),athlete:{...input(p).athlete,sport:'other'}}).success,false);
  assert.throws(()=>saveProfileSetup(p,{...input(p),excluded:['rice','pasta','couscous','potato','sweetpotato','quinoa','tortilla','bread','oats','cornflakes']},date),/No podemos generar/);
  assert.equal(JSON.stringify(p),before);
});

test('old five-meal and four-meal histories stay valid, and six-meal snapshots reject out-of-bounds records',()=>{
  const p={...newProfile('Anterior'),confirmed:true};const plan=generatePlan(p,2);p.plans=[plan];
  assert.equal(p.athlete,undefined);assert.equal(p.mealCount,undefined);
  assert.ok(stateSchema.safeParse({active:p.id,profiles:[p]}).success);
  const legacy={...plan,week:undefined,meals:plan.meals.slice(0,4)};
  assert.ok(stateSchema.safeParse({active:p.id,profiles:[{...p,plans:[legacy]}]}).success);
  const next=saveProfileSetup(p,input(p,6),date),week=next.plans.at(-1);
  const day=recordMeal(emptyDay(next),week,date,5,'planned');
  day.foodPlan.records[0].slot=6;
  assert.equal(stateSchema.safeParse({active:next.id,profiles:[{...next,days:{[date]:day}}]}).success,false);
});

test('a category edit is shared with the existing routine while detailed dates and exercises stay intact',()=>{
  const competition={fight:'2026-12-12T16:00:00Z',weighIn:'2026-12-12T09:00:00Z',weight:65,taper:true,notes:'Preparación acordada'};
  const training={...generateTrainingPlan({...defaultTrainingConfig(),competition}),month:'2026-12'};
  const p={...newProfile('Atleta'),preparation:{competition},workouts:{plans:[training],logs:[]}};
  const fields=input(p,4);fields.athlete.competitionWeight={mode:'target',weight:64,date:'2027-01-01'};
  const next=saveProfileSetup(p,fields,date);
  assert.equal(next.preparation.competition.weight,64);
  assert.equal(next.preparation.competition.weighIn,competition.weighIn);
  assert.equal(next.athlete.competitionWeight.date,'2026-12-12');
  assert.equal(next.workouts.plans[0].config.competition.weight,64);
  assert.deepEqual(next.workouts.plans[0].sessions,training.sessions);
  const removed=saveProfileSetup(next,input(next,4),date);
  assert.equal(removed.preparation.competition,undefined);
  assert.equal(removed.workouts.plans[0].config.competition,undefined);
  assert.deepEqual(removed.workouts.plans[0].sessions,training.sessions);
  assert.deepEqual(p.preparation.competition,competition);
});
