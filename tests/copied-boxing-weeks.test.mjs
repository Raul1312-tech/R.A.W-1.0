import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTrainingConfig,generateTrainingPlan,trainingDataSchema,workoutKey} from '../app/training-model.ts';
import {planForDate,sessionsForDate,refreshBoxingCatalog,editCalendarDay,dailySessions} from '../app/training-calendar-model.ts';
import {makeDraft,toggleSet} from '../app/workout-progress.ts';
const today='2026-11-15',month='2026-11';
function historicalCopies(){
 const old={...generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',level:'elite',duration:90,physicalDays:[1,4,5],runningDays:[0,2],boxingKit:['landmine','kettlebell','box','trapBar'],medicineBall:true}),created:'2026-11-14T12:00:00.000Z',month};
 const data={plans:[old],logs:[]};
 const fresh={...refreshBoxingCatalog(data,today),created:'2026-11-15T16:14:16.573Z'};
 fresh.overrides=fresh.overrides.map(({source,...legacy})=>legacy);
 return {plans:[old,fresh],logs:[]};
}
const signature=s=>s.exercises.map(e=>e.catalogId).join(',');
test('recovers the old 14-day catalog-refresh copies: Saturday 7 and 14 keep physical C but change their exercises',()=>{
 const data=historicalCopies(),raw=data.plans.at(-1),before=JSON.stringify(data);
 assert.equal(signature(raw.overrides.find(o=>o.date===month+'-07').sessions[0]),signature(raw.overrides.find(o=>o.date===month+'-14').sessions[0]));
 const p=planForDate(data,today);assert.equal(p.overrides.filter(o=>o.source==='weekly-copy').length,14);
 const sessions=['07','14','21','28'].map(day=>sessionsForDate(p,month+'-'+day).find(s=>s.kind==='lift'));
 assert.equal(new Set(sessions.map(signature)).size,4);
 for(const s of sessions)assert.match(s.title,/Físico C/);
 assert.ok(sessions[0].exercises.filter((e,i)=>e.catalogId!==sessions[1].exercises[i]?.catalogId).length>=5);
 assert.equal(JSON.stringify(data),before);
 assert.ok(trainingDataSchema.safeParse({...data,plans:[...data.plans.slice(0,-1),p]}).success);
 assert.deepEqual(dailySessions(data,month+'-14').find(s=>s.session.kind==='lift').session,sessions[1]);
});
test('explicit manual edits and ambiguous legacy overrides stay fixed',()=>{
 let data=historicalCopies(),p=data.plans.at(-1),day=month+'-14';
 const fixed=editCalendarDay(p,month,day,p.overrides.find(o=>o.date===day).sessions,'date');
 data.plans[data.plans.length-1]=fixed;
 assert.equal(planForDate(data,today).overrides.find(o=>o.date===day).source,'manual');
 assert.deepEqual(sessionsForDate(planForDate(data,today),day),fixed.overrides.find(o=>o.date===day).sessions);
 data=historicalCopies();data.plans.at(-1).overrides.splice(0,1);
 assert.ok(planForDate(data,today).overrides.every(o=>!o.source));
 data=historicalCopies();data.plans.at(-1).overrides.at(-1).sessions[0].exercises[0].sets=1;
 assert.ok(planForDate(data,today).overrides.every(o=>!o.source));
});
test('already started and completed prescriptions survive recovery; new snapshots are not rotated twice',()=>{
 const data=historicalCopies(),p=data.plans.at(-1),day=month+'-14',session=p.overrides.find(o=>o.date===day).sessions[0];
 let draft={...makeDraft(workoutKey(p.id,session,day),session),planId:p.id,date:day,session:structuredClone(session)};
 draft=toggleSet(draft,session,session.exercises[0].id,0);data.drafts=[draft];
 assert.deepEqual(dailySessions(data,day).find(s=>s.session.kind==='lift').session,session);
 const fresh=refreshBoxingCatalog(data,today),resolved=planForDate(data,today);
 const copied=fresh.overrides.find(o=>o.date===day);
 assert.equal(copied.source,'weekly-copy');
 assert.deepEqual(sessionsForDate(fresh,day),sessionsForDate(resolved,day));
 const generated={...generateTrainingPlan({...p.config,catalogVersion:2}),month,created:'2026-11-14T12:00:00Z'};
 const updated=refreshBoxingCatalog({plans:[generated],logs:[]},today);
 assert.equal(updated.overrides.find(o=>o.date===day).source,'dated-copy');
 assert.deepEqual(sessionsForDate(updated,day),sessionsForDate(generated,day));
});
