import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,emptyDay,foodById,total} from '../app/model.ts';
import {coachContext,applyCoachAction,validateCoachChoice} from '../app/coach-model.ts';
import {coachFoodProposal} from '../app/coach-food.ts';
import {foodDayView,recordMeal} from '../app/daily-food-model.ts';
import {freezeMonth,monthlyShopping,planForFoodDate} from '../app/preparation-model.ts';
import {defaultTrainingConfig,generateTrainingPlan} from '../app/training-model.ts';
import {stateSchema} from '../app/validation.ts';
const date='2026-11-09';
function fixture(){
 const p=newProfile('Private identity');p.confirmed=true;
 const meals=Array.from({length:5},()=>({name:'Plato',items:[{food:foodById('rice'),grams:70},{food:foodById('chicken'),grams:100},{food:foodById('olive'),grams:10}]}));
 const base=total(meals.flatMap(m=>m.items)),target=Object.fromEntries(Object.entries(base).map(([k,v])=>[k,v*1.2]));
 const plan={id:'test-plan',created:date+'T12:00:00Z',seed:1,target,meals};p.plans=[plan];
 p.days[date]={...emptyDay(p),target};
 return freezeMonth(p,plan,'2026-11');
}
test('food proposal improves target, preserves ingredients and stays within visible portion bounds',()=>{
 const p=fixture(),before=structuredClone(p),food=coachFoodProposal(p,date);assert.ok(food);
 assert.ok(Math.abs(food.after.k-food.target.k)<Math.abs(food.before.k-food.target.k));
 for(const c of food.changes){assert.ok(c.after<=Math.floor(c.before*1.1));assert.ok(c.after>=Math.ceil(c.before*.9));}
 assert.deepEqual(p,before);assert.equal(food.day.foodPlan.autoAdjust,false);
});
test('acceptance reaches daily menu and monthly shopping, cannot compound',()=>{
 const p=fixture(),ctx=coachContext(p,date),oldShopping=total(monthlyShopping(p,'2026-11'));
 assert.ok(ctx.allowedActions.includes('fuel'));
 const next=applyCoachAction(p,date,ctx.signature,'fuel');
 const view=foodDayView(next.days[date],planForFoodDate(next,next.plans[0],date),date);
 assert.deepEqual(view.projected,coachFoodProposal(p,date).after);
 const shopping=total(monthlyShopping(next,'2026-11'));
 assert.ok(Math.abs((shopping.k-oldShopping.k)-(view.projected.k-coachFoodProposal(p,date).before.k))<.01);
 assert.deepEqual(next.days[date].items,p.days[date].items);
 assert.deepEqual(next.days[date].target,p.days[date].target);
 assert.equal(coachFoodProposal(next,date),null);
 assert.throws(()=>applyCoachAction(next,date,ctx.signature,'fuel'));
 const persisted=stateSchema.parse({profiles:[next],active:next.id});assert.ok(persisted.profiles[0].preparation.coach.events.at(-1).foodAdjusted);
});
test('balanced menus are left alone and supplement quantities are fixed',()=>{
 const p=fixture();p.days[date].target=total(p.plans[0].meals.flatMap(m=>m.items));assert.equal(coachFoodProposal(p,date),null);
 const q=fixture();q.preparation.monthlyMenus[0].days.find(d=>d.date===date).meals[0].items.push({food:foodById('whey'),grams:25});
 const proposal=coachFoodProposal(q,date);assert.ok(proposal);assert.equal(proposal.day.foodPlan.meals[0].items.find(i=>i.food.id==='whey').grams,25);
});
test('registered meals are immutable, omitted meals and dinner do not trigger compensation',()=>{
 const p=fixture();p.days[date]=recordMeal(p.days[date],p.plans[0],date,0,'planned');
 const food=coachFoodProposal(p,date);assert.ok(food);assert.ok(food.changes.every(c=>c.slot>0));assert.deepEqual(food.day.items,p.days[date].items);
 p.days[date]=recordMeal(p.days[date],p.plans[0],date,1,'skipped');assert.equal(coachFoodProposal(p,date),null);
 const q=fixture();q.days[date]=recordMeal(q.days[date],q.plans[0],date,4,'planned');assert.equal(coachFoodProposal(q,date),null);
});
test('coordinated action changes food and training atomically; no calorie target reduction',()=>{
 const p=fixture();p.days[date].sleep=5;p.days['2026-11-08']={...emptyDay(p),sleep:5};p.workouts={plans:[{...generateTrainingPlan(defaultTrainingConfig()),month:'2026-11'}],logs:[]};
 const ctx=coachContext(p,date);assert.ok(ctx.allowedActions.includes('coordinate'));
 const next=applyCoachAction(p,date,ctx.signature,'coordinate');
 assert.ok(next.preparation.coach.events.at(-1).foodAdjusted);assert.ok(next.preparation.coach.events.at(-1).trainingAdjusted);
 assert.deepEqual(next.days[date].target,p.days[date].target);assert.notDeepEqual(next.workouts,p.workouts);
});
test('stale recipe of equal energy, exclusions and forged actions are rejected',()=>{
 const p=fixture(),ctx=coachContext(p,date);p.plans[0].meals[0].name='Changed';
 p.days[date].notes='Local state changed';assert.throws(()=>applyCoachAction(p,date,ctx.signature,'fuel'));
 p.excluded=['rice'];assert.equal(coachFoodProposal(p,date),null);
 assert.throws(()=>validateCoachChoice({priority:['nutrition'],action:'water-cut'},coachContext(p,date)));
});
