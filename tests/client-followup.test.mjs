import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,emptyDay,generatePlan,foodById} from '../app/model.ts';
import {recordMeal} from '../app/daily-food-model.ts';
import {nutritionForDate,recordedDates,groupedIntake,coachChoice} from '../lib/client-followup.ts';
const today='2026-11-18';
function athlete(){
 const p=newProfile('Synthetic followup');p.confirmed=true;p.athlete={sport:'boxing',level:'recreational',goal:'performance',schedule:'regular',competitionWeight:{mode:'none'}};
 p.plans=[{...generatePlan(p,1),created:today+'T09:00:00Z'}];return p;
}
test('follow-up uses saved intake, adjusted pending meals and never writes into user state',()=>{
 const p=athlete(),plan=p.plans[0];p.days[today]=recordMeal(emptyDay(p),plan,today,0,'alternative',[{food:foodById('bread'),grams:100}]);
 const before=structuredClone(p),view=nutritionForDate(p,today,today);
 assert.equal(view.meals[0].status,'alternative');assert.equal(view.meals[0].macro.k,250);assert.equal(view.consumed.k,250);
 assert.equal(view.meals.filter(m=>m.status==='pending').length,4);assert.ok(view.projected);assert.equal(view.derived,false);assert.deepEqual(p,before);
});
test('old dates never borrow a newer plan or invent meals as consumed',()=>{
 const p=athlete(),view=nutritionForDate(p,'2026-11-01',today);
 assert.equal(view.meals.length,0);assert.equal(view.consumed.k,0);assert.equal(view.hasSavedDay,false);
});
test('a historical food snapshot wins over the current meal count and target',()=>{
 const p=athlete(),historical='2026-11-10';p.days[historical]=recordMeal({...emptyDay(p),target:{k:2000,p:130,c:230,f:60}},p.plans[0],historical,0,'planned');p.mealCount=3;
 const before=structuredClone(p.days[historical]),view=nutritionForDate(p,historical,today);
 assert.equal(view.meals.length,5);assert.equal(view.target.k,2000);assert.equal(view.meals[0].status,'planned');assert.deepEqual(p.days[historical],before);
});
test('readiness and club-only days appear in the record history without inventing a daily journal',()=>{
 const p=athlete();p.preparation={readiness:{'2026-11-17':{sleep:'good',fatigue:'low',pain:'none',motivation:'high'}},clubRecords:{'2026-11-16':{name:'Technical',kind:'technique',minutes:60,rounds:6,roundMinutes:3,rpe:5,notes:''}}};
 assert.deepEqual(recordedDates(p),['2026-11-17','2026-11-16']);assert.deepEqual(p.days,{});
});
test('registered ingredients are grouped by saved meal without losing additions',()=>{
 const items=[{food:foodById('bread'),grams:80,meal:'Cena'},{food:foodById('chicken'),grams:100,meal:'Cena'},{food:foodById('yogurt'),grams:100,meal:'Otra toma'}];
 const groups=groupedIntake(items);assert.equal(groups.length,2);assert.equal(groups[0].items.length,2);assert.equal(groups[1].items[0].grams,100);
});
test('invalid dates and incompatible AI choices are rejected without treating them as chat transcripts',()=>{
 assert.throws(()=>nutritionForDate(athlete(),'2026-02-30',today),/Fecha/);
 assert.equal(coachChoice.safeParse({action:'unsafe-prescription',priority:[]}).success,false);
 assert.ok(coachChoice.safeParse({action:'keep',priority:['nutrition']}).success);
});

test('calendar-only empty days are not presented as athlete interactions',()=>{
 const p=athlete();p.days['2026-11-19']=emptyDay(p);p.days[today]={...emptyDay(p),notes:'Real feedback'};
 assert.deepEqual(recordedDates(p),[today]);
});
