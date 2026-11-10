import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDay,foodById,generatePlan,newProfile,total} from '../app/model.ts';
import {applyDayChange,saveFoodPreferences,savePlannedSupplement,swapPendingIngredient,withCoordinatedDay} from '../app/preparation-engine.ts';
import {foodDayView,recordMeal} from '../app/daily-food-model.ts';
import {toggleSupplement} from '../app/preparation-model.ts';
import {clubForDate,dailySessions,planForDate} from '../app/training-calendar-model.ts';
import {generateTrainingPlan,defaultTrainingConfig} from '../app/training-model.ts';
import {replanCompetition} from '../app/competition-plan.ts';
import {competitionStatus} from '../app/competition-phase.ts';
import {stateSchema} from '../app/validation.ts';
const date='2026-11-09';
function athlete(){
 const p={...newProfile('Prueba motor'),confirmed:true};
 p.plans=[generatePlan(p,7)];
 const plan=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',level:'intermediate',physicalDays:[0,3],runningDays:[1,5],sparringDays:[3],conditioningMode:'mixed',intensity:'steady'});
 p.workouts={plans:[{...plan,month:'2026-11'}],logs:[]};
 return p;
}
const whey={id:'w',name:'Proteína ejemplo',kind:'protein',timing:'postworkout',amount:30,unit:'g',gramsPerUnit:1,k:400,p:80,c:5,f:4,allergens:['leche']};
function roundtrip(p){return stateSchema.parse(JSON.parse(JSON.stringify({active:p.id,profiles:[p]}))).profiles[0]}
test('preferences guide the actual menu and avoid items without losing prior menus',()=>{
 const p=athlete(),old=p.plans[0];
 const prefs={foods:{rice:'usual',sweetpotato:'usual',bread:'usual',chicken:'usual',beef:'usual',tofu:'avoid'},variety:'repeat',certification:'none'};
 const next=roundtrip(saveFoodPreferences(p,prefs)),menu=next.plans.at(-1);
 assert.equal(next.plans[0].id,old.id);
 assert.ok(menu.week.every(d=>d.meals.every(m=>m.items.every(x=>x.food.id!=='tofu'&&!/halal/.test(x.food.name)))));
 assert.ok(menu.week.every(d=>d.meals.some(m=>m.items.some(x=>['chicken','beef'].includes(x.food.id)))));
 assert.equal(new Set(menu.week.map(d=>d.meals[0].name)).size,1);
});
test('equivalent substitution matches carbs and cannot change logged meals',()=>{
 const p=athlete(),plan=p.plans[0];
 const view=foodDayView(emptyDay(p),plan,date);
 const slot=1;
 const day={...emptyDay(p),foodPlan:{...view.snapshot,meals:view.snapshot.meals.map((m,i)=>i===slot?{name:'Arroz',items:[{food:foodById('rice'),grams:80}]}:m)}};
 const swapped=swapPendingIngredient(p,day,plan,date,slot,0,'sweetpotato');
 assert.equal(swapped.foodPlan.meals[slot].items[0].grams,316);
 assert.throws(()=>swapPendingIngredient(p,recordMeal(day,plan,date,slot,'planned'),plan,date,slot,0,'sweetpotato'),/pendientes/);
});
test('a planned supplement is counted once in projections before and after registration',()=>{
 const p=athlete();p.preparation={supplements:[whey]};
 const plan=p.plans.at(-1),day=withCoordinatedDay(p,date,plan).days[date];
 assert.equal(day.items.length,0);
 assert.equal(day.supplementForecast.w.k,120);
 const a=foodDayView(day,plan,date);
 const logged=toggleSupplement(day,whey);
 const b=foodDayView(logged,plan,date);
 assert.ok(Math.abs(a.projected.k-b.projected.k)<.001);
 assert.equal(total(logged.items).k,120);
 assert.equal(roundtrip({...p,days:{[date]:logged}}).days[date].supplementForecast.w.p,24);
});
test('rest and eating out keep intake records and replace only pending activity',()=>{
 const p=athlete(),plan=p.plans[0];
 const initial=withCoordinatedDay(p,date,plan).days[date];
 p.days[date]=recordMeal(initial,plan,date,0,'planned');
 const next=roundtrip(applyDayChange(p,date,date,'rest'));
 assert.deepEqual(next.days[date].items,p.days[date].items);
 assert.equal(next.days[date].nutrition.training,'rest');
 assert.equal(dailySessions(next.workouts,date).length,0);
 const outside=applyDayChange(next,date,date,'outside',2);
 assert.equal(outside.days[date].foodPlan.meals[2].items.length,0);
 assert.deepEqual(outside.days[date].items,next.days[date].items);
});
test('the mixed run plan and the moved sparring propagate to the day without changing the weekly club template',()=>{
 const p=athlete(),from='2026-11-12',to='2026-11-14';
 assert.match(dailySessions(p.workouts,'2026-11-10')[0].session.title,/trote cómodo/);
 assert.match(dailySessions(p.workouts,to)[0].session.title,/intervalos/);
 const next=roundtrip(applyDayChange(p,from,date,'move-sparring',to));
 assert.equal(clubForDate(planForDate(next.workouts,from),from),undefined);
 assert.equal(clubForDate(planForDate(next.workouts,to),to),'sparring');
 assert.equal(dailySessions(next.workouts,to).length,0);
 assert.equal(clubForDate(planForDate(next.workouts,'2026-11-19'),'2026-11-19'),'sparring');
 assert.ok(next.days[to].target.k>=next.days[from].target.k);
});
test('competition replans by dates and protects recorded intake and supplement tolerance',()=>{
 const p=athlete();p.preparation={competition:{fight:'2026-11-15T19:00:00Z',weighIn:'2026-11-14T08:00:00Z',weight:70,rounds:3,roundMinutes:3,taper:true,notes:''},supplements:[whey],supplementFeedback:{[date]:{w:'poor-tolerance'}}};
 const next=replanCompetition(p,date);
 assert.equal(next.days[date].competition.phase,'fight-week');
 assert.equal(next.days[date].supplementForecast.w,undefined);
 assert.equal(dailySessions(next.workouts,'2026-11-14').length,0);
 assert.equal(competitionStatus(next,date).context.daysToWeigh,5);
 assert.equal(roundtrip(next).preparation.competition.rounds,3);
});

test('adding a supplement updates a coordinated day after eating out was planned',()=>{
 const p=athlete(),outside=applyDayChange(p,date,date,'outside',2);
 const next=roundtrip(savePlannedSupplement(outside,whey,date));
 assert.equal(next.days[date].supplementForecast.w.k,120);
 assert.deepEqual(next.days[date].nutrition.outsideMeals,[{slot:2,size:'normal'}]);
 assert.ok(next.days[date].foodPlan.meals.some(m=>m.items.length===0));
});
