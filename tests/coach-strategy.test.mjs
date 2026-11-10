import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,emptyDay,targets} from '../app/model.ts';
import {strategyProposal,applyStrategy} from '../app/coach-strategy.ts';
import {coachContext,applyCoachAction} from '../app/coach-model.ts';
import {generateTrainingPlan,defaultTrainingConfig} from '../app/training-model.ts';
import {dailySessions,planForDate,editCalendarDay} from '../app/training-calendar-model.ts';
import {undoStrategy} from '../app/strategy-version.ts';
import {stateSchema} from '../app/validation.ts';
const date='2026-11-06';
function athlete(){const p=newProfile('Synthetic');p.confirmed=true;p.weight=80;p.goal=85;const target=targets(p);for(let i=0;i<14;i++){const d=new Date(Date.parse(date+'T12:00:00Z')-i*86400000).toISOString().slice(0,10);p.days[d]={...emptyDay(p),weight:80,complete:true,sleep:8,items:[{id:d,meal:'Test',grams:100,food:{id:'test',name:'Synthetic food',unit:'100g',allergens:[],k:target.k,p:target.p,c:target.c,f:target.f}}]};}return p;}
test('plateau with adequate records raises target, generates future food and preserves history',()=>{const p=athlete(),original=structuredClone(p),s=strategyProposal(p,date);assert.ok(s.energyAfter>s.energyBefore);assert.ok(s.energyAfter-s.energyBefore<=150);assert.equal(s.foodDates.length,7);const next=applyStrategy(p,date);for(const [d,v]of Object.entries(original.days))assert.deepEqual(next.days[d],v);assert.equal(next.days['2026-11-07'].target.k,s.energyAfter);assert.deepEqual(p,original);assert.ok(stateSchema.safeParse({profiles:[next],active:next.id}).success);assert.equal(strategyProposal(next,date).enabled,false);});
test('weekly nutrition strategy stores labels for the chosen meal count',()=>{
 const p=athlete();p.mealCount=3;
 const next=applyStrategy(p,date),plan=next.days['2026-11-07'].foodPlan;
 assert.equal(plan.meals.length,3);
 assert.deepEqual(plan.labels,['Primera comida','Comida','Cena']);
 assert.ok(stateSchema.safeParse({profiles:[next],active:next.id}).success);
});
test('insufficient or unrepresentative food data never changes calories',()=>{const p=athlete();for(const d of Object.values(p.days))d.complete=false;assert.equal(strategyProposal(p,date).energyAfter,targets(p).k);const q=athlete();for(const d of Object.values(q.days))d.weight=null;assert.equal(strategyProposal(q,date).energyAfter,targets(q).k);});
test('fight proximity, unrealistic category and goal conflict cannot deepen deficit',()=>{const p=athlete();p.goal=78;p.preparation={competition:{fight:'2026-11-15T20:00:00Z',weighIn:'2026-11-15T08:00:00Z',weight:78,taper:true,notes:''}};const s=strategyProposal(p,date);assert.equal(s.energyAfter,s.energyBefore);assert.ok(s.warnings.length);p.goal=85;assert.equal(strategyProposal(p,date).energyAfter,s.energyBefore);});
test('regeneration respects schedule, manual dates and past records',()=>{const p=athlete();p.workouts={plans:[generateTrainingPlan({...defaultTrainingConfig(),level:'advanced',phase:'build'})],logs:[]};p.days[date].sleep=5;p.days['2026-11-05'].sleep=5;const proposal=strategyProposal(p,date);assert.equal(proposal.phase,'deload');assert.ok(proposal.training.length);const next=applyStrategy(p,date);assert.deepEqual(next.workouts.logs,p.workouts.logs);for(const d of proposal.training){assert.deepEqual(dailySessions(next.workouts,d.date).map(s=>s.session),d.after);}assert.ok(stateSchema.safeParse({profiles:[next],active:next.id}).success);});
test('future logged food and explicit calendar overrides are not overwritten',()=>{const p=athlete();p.days['2026-11-07']={...emptyDay(p),items:[{...p.days[date].items[0],id:'future'}]};p.workouts={plans:[editCalendarDay(generateTrainingPlan(defaultTrainingConfig()),'2026-11','2026-11-09',[],'date')],logs:[]};const original=structuredClone(p.days['2026-11-07']);const next=applyStrategy(p,date);assert.deepEqual(next.days['2026-11-07'],original);assert.deepEqual(planForDate(next.workouts,'2026-11-09').overrides.find(o=>o.date==='2026-11-09').sessions,[]);});
test('changed goal or trend invalidates strategy acceptance',()=>{const p=athlete(),ctx=coachContext(p,date);assert.ok(ctx.allowedActions.includes('strategy'));p.goal=75;assert.throws(()=>applyCoachAction(p,date,ctx.signature,'strategy'));});
test('cross-month calendar conversion is valid',()=>{const p=athlete(),dt='2026-11-28';p.days[dt]={...emptyDay(p),sleep:5};p.days['2026-11-27']={...emptyDay(p),sleep:5};p.workouts={plans:[generateTrainingPlan({...defaultTrainingConfig(),phase:'build'})],logs:[]};const next=applyStrategy(p,dt);assert.ok(planForDate(next.workouts,'2026-12-02'));assert.ok(stateSchema.safeParse({profiles:[next],active:next.id}).success);});
test('gradual loss plateau can lower calories, rapid observed loss restores energy',()=>{const p=athlete();p.goal=77;assert.ok(strategyProposal(p,date).energyAfter<targets(p).k);for(const [d,v]of Object.entries(p.days))if(d>='2026-10-31')v.weight=79.4;const s=strategyProposal(p,date);assert.ok(s.energyAfter>s.energyBefore);});
test('noisy weights do not drive energy adjustments',()=>{const p=athlete();p.days[date].weight=92;const s=strategyProposal(p,date);assert.equal(s.energyAfter,s.energyBefore);assert.ok(s.warnings.some(w=>w.includes('fluctúan')));});
test('new energy retains a matching current menu for the alimentation tab',()=>{const p=athlete(),next=applyStrategy(p,date);assert.equal(next.plans.at(-1).target.k,targets(next).k);assert.equal(next.plans.at(-1).target.p,targets(next).p);});

test('weekly undo survives journal validation and keeps newer unrelated activity',()=>{
 const p=athlete();p.plans=[];p.workouts={plans:[generateTrainingPlan({...defaultTrainingConfig(),phase:'build'})],logs:[]};p.days[date].sleep=5;p.days['2026-11-05'].sleep=5;
 const next=applyStrategy(p,date);
 const saved=stateSchema.parse(JSON.parse(JSON.stringify({profiles:[next],active:next.id}))).profiles[0];
 saved.days['2026-11-07'].water=500;
 const restored=undoStrategy(saved,date);
 assert.deepEqual(restored.workouts.plans,stateSchema.parse({profiles:[p],active:p.id}).profiles[0].workouts.plans);
 assert.equal(restored.days['2026-11-07'].water,500);
 assert.equal(restored.days['2026-11-07'].foodPlan,undefined);
 assert.equal(restored.preparation.energyTarget,undefined);
 assert.equal(restored.strategyVersion,undefined);
 saved.days['2026-11-07'].items.push({...p.days[date].items[0],id:'new-food'});
 assert.throws(()=>undoStrategy(saved,date),/registradas/);
});
