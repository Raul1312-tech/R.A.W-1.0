import test from 'node:test';
import assert from 'node:assert/strict';
import {monthDates,weekdayOf,planForDate,sessionsForDate,editCalendarDay,dailySessions,monthlyLoadWarnings} from '../app/training-calendar-model.ts';
import {generateTrainingPlan,defaultTrainingConfig,trainingDataSchema,trainingPlanSchema,workoutKey} from '../app/training-model.ts';
import {makeDraft,toggleSet,finishWorkout} from '../app/workout-progress.ts';
import {exerciseCatalog} from '../app/exercise-catalog.ts';
import {movementExercise,exerciseCategory} from '../app/exercise-options.ts';
const weekly=()=>generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',level:'intermediate',phase:'build',physicalDays:[0,2,4],runningDays:[0,3],technicalDays:[0,1,2,3,4,5,6]});
const monthly=()=>({...weekly(),month:'2026-11'});

test('calendar uses actual month boundaries and Monday-based weekdays independent of local time',()=>{
  assert.equal(monthDates('2026-11').length,30);assert.equal(weekdayOf('2026-11-01'),6);assert.equal(weekdayOf('2026-11-02'),0);
  assert.equal(monthDates('2028-02').length,29);assert.equal(monthDates('2027-02').length,28);
  assert.equal(monthDates('2026-12').at(-1),'2026-12-31');assert.equal(weekdayOf('2027-01-01'),4);assert.throws(()=>monthDates('2026-13'));
});
test('daily planner selects the latest exact month, preserves legacy weeks and never spills a monthly plan into another month',()=>{
  const old=weekly(),nov=monthly(),later={...monthly(),id:'later'},dec={...monthly(),month:'2026-12'};
  assert.equal(planForDate({plans:[old],logs:[]},'2026-11-03').id,old.id);
  const data={plans:[old,nov,dec,later],logs:[]};
  assert.equal(planForDate(data,'2026-11-03').id,later.id);assert.equal(planForDate(data,'2026-12-03').id,dec.id);assert.equal(planForDate(data,'2027-01-03'),undefined);
  assert.equal(sessionsForDate(nov,'2026-11-02').length,2);assert.equal(sessionsForDate(nov,'2026-11-03').length,0);assert.equal(sessionsForDate(nov,'2026-12-02').length,0);
});
test('single-day and weekday edits preserve other dates and both session slots, including explicit rest',()=>{
  const p=monthly(),before=JSON.stringify(p),sessions=structuredClone(sessionsForDate(p,'2026-11-02'));
  sessions[0].exercises[0].sets=4;sessions[0].exercises[0].plannedKg=30;
  const one=editCalendarDay(p,'2026-11','2026-11-02',sessions,'date');
  assert.equal(sessionsForDate(one,'2026-11-02')[0].exercises[0].sets,4);assert.notEqual(sessionsForDate(one,'2026-11-09')[0].exercises[0].sets,4);
  const all=editCalendarDay(one,'2026-11','2026-11-02',sessions,'weekday');
  assert.deepEqual(all.overrides.map(o=>o.date),['2026-11-02','2026-11-09','2026-11-16','2026-11-23','2026-11-30']);
  for(const o of all.overrides)assert.equal(o.sessions.length,2);
  const rest=editCalendarDay(all,'2026-11','2026-11-09',[],'date');assert.equal(sessionsForDate(rest,'2026-11-09').length,0);
  assert.equal(JSON.stringify(p),before);assert.throws(()=>editCalendarDay(p,'2026-11','2026-12-01',sessions,'date'));
  assert.equal(trainingPlanSchema.safeParse({...one,overrides:[{date:'2026-11-03',sessions}]}).success,false);
});
test('execution snapshots survive replacement, removing sessions, pruning old plans and JSON roundtrip without logging programmed kg',()=>{
  const p=monthly(),date='2026-11-02';const session=structuredClone(sessionsForDate(p,date)[0]);session.exercises[0].plannedKg=30;
  let draft={...makeDraft(workoutKey(p.id,session,date),session),planId:p.id,date,session};
  draft=toggleSet(draft,session,session.exercises[0].id,0);draft.elapsedMs=1800000;draft.rpe=7;
  const updated=editCalendarDay(p,'2026-11',date,[],'date');
  const data=trainingDataSchema.parse(JSON.parse(JSON.stringify({plans:[updated],logs:[],drafts:[draft]})));
  let actual=dailySessions(data,date);assert.equal(actual.length,1);assert.equal(actual[0].session.exercises[0].plannedKg,30);assert.equal(actual[0].draft.checked[session.exercises[0].id].length,1);
  const log=finishWorkout(p,session,date,draft,0);assert.equal(log.entries[0].kg,null);assert.match(log.entries[0].prescribed,/previstos 30 kg/);
  const replacement={...monthly(),id:'replacement'};
  actual=dailySessions({plans:[replacement],logs:[log],drafts:[]},date);assert.equal(actual.length,2);assert.equal(actual.find(x=>x.session.kind==='lift').key,log.id);
  assert.equal(actual.find(x=>x.session.kind==='conditioning').plan.id,'replacement');
  assert.equal(dailySessions({plans:[],logs:[log]},date)[0].session.exercises[0].plannedKg,30);
  assert.equal(dailySessions(data,'2026-11-03').length,0);
});
test('legacy logs and drafts retain their original keys when adopted into a monthly calendar',()=>{
  const old=weekly();for(const s of old.sessions)delete s.slot;
  const date='2026-11-02',session=old.sessions[0];const d=toggleSet(makeDraft(workoutKey(old.id,session,date),session),session,session.exercises[0].id,0);
  const month=editCalendarDay(old,'2026-11',date,sessionsForDate(old,date),'date');assert.notEqual(month.id,old.id);
  const resolved=dailySessions({plans:[old,month],logs:[],drafts:[d]},date);
  assert.equal(resolved.find(x=>x.session.kind==='lift').key,d.id);
});
test('new library supplies four core, four plyometric and four footwork guides and participates in generation',()=>{
  const newRecords=exerciseCatalog.filter(r=>r.image.src==='/training/core-footwork.png');assert.equal(newRecords.length,12);
  for(const category of ['Abdomen','Pliometría','Agilidad de pies'])assert.equal(newRecords.filter(r=>exerciseCategory(r)===category).length,4);
  const p=monthly();const ids=p.sessions.flatMap(s=>s.exercises.map(e=>e.catalogId));
  for(const id of ['boxing-in-out','cone-shuffle','boxing-pivot','shoulder-tap','short-crunch','bird-dog','broad-jump','line-hop'])assert.ok(ids.includes(id),id);
  assert.equal(movementExercise('split-jump').plannedKg,null);
});
test('manual calendar edits can fill all seven weekdays with both sessions and trigger non-blocking warnings',()=>{
  let p=monthly();const base=sessionsForDate(p,'2026-11-02');
  for(const date of monthDates('2026-11'))p=editCalendarDay(p,'2026-11',date,base,'date');
  assert.equal(p.overrides.length,30);assert.equal(monthDates('2026-11').reduce((n,d)=>n+sessionsForDate(p,d).length,0),60);
  assert.ok(trainingPlanSchema.safeParse(p).success);const warnings=monthlyLoadWarnings(p,'2026-11');
  assert.ok(warnings.some(w=>w.includes('sin un día libre')));assert.ok(warnings.some(w=>w.includes('más de dos días de carrera')));
});
