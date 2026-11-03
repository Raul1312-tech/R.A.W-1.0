import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTrainingConfig,generateTrainingPlan,trainingDataSchema,reconcileWorkout} from '../app/training-model.ts';
import {makeDraft,toggleSet,nextSet,completedSets,elapsedWorkout,finishWorkout} from '../app/workout-progress.ts';
import {findExerciseRecord} from '../app/exercise-catalog.ts';
const plan=()=>generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',level:'intermediate',phase:'build',physicalDays:[0,3],runningDays:[1,5],boxingKit:['trapBar','box','kettlebell','landmine']});
test('supersets alternate each round; toggling supports undo and invalid indexes cannot count',()=>{
  const p=plan(),s=p.sessions[0];let d=makeDraft(p.id+':0:2026-11-03',s);
  assert.equal(nextSet(s,d).exerciseId,s.exercises[0].id);
  d=toggleSet(d,s,s.exercises[0].id,0);assert.equal(nextSet(s,d).exerciseId,s.exercises[1].id);
  d=toggleSet(d,s,s.exercises[1].id,0);assert.deepEqual(nextSet(s,d),{exerciseId:s.exercises[0].id,set:1});
  for(const i of [1,2])d=toggleSet(d,s,s.exercises[0].id,i);
  assert.equal(completedSets(d,s.exercises[0]),3);d=toggleSet(d,s,s.exercises[0].id,1);assert.equal(completedSets(d,s.exercises[0]),2);
  assert.throws(()=>toggleSet(d,s,s.exercises[0].id,3));assert.throws(()=>toggleSet(d,s,'missing',0));
});
test('draft survives full schema roundtrip and timers preserve pause/restart',()=>{
  const p=plan(),s=p.sessions[0];let d=makeDraft(p.id+':0:2026-11-03',s);
  d=toggleSet(d,s,s.exercises[0].id,2);d.runningSince=1000;
  const parsed=trainingDataSchema.parse(JSON.parse(JSON.stringify({plans:[p],logs:[],drafts:[d]}))).drafts[0];
  assert.deepEqual(parsed,d);assert.equal(elapsedWorkout(d,61000),60000);
  d={...d,elapsedMs:elapsedWorkout(d,61000),runningSince:null};assert.equal(elapsedWorkout(d,999999),60000);
  d.runningSince=100000;assert.equal(elapsedWorkout(d,130000),90000);
});
test('partial finish preserves exact set positions without invented reps or kg; edits do not double-count minutes',()=>{
  const p=plan(),s=p.sessions[0];let d=makeDraft(p.id+':0:2026-11-03',s);
  assert.throws(()=>finishWorkout(p,s,'2026-11-03',d,0),/al menos/);
  d=toggleSet(d,s,s.exercises[0].id,2);
  assert.throws(()=>finishWorkout(p,s,'2026-11-03',d,0),/duración/);
  d.elapsedMs=1800000;assert.throws(()=>finishWorkout(p,s,'2026-11-03',d,0),/exigente/);d.rpe=8;
  const log=finishWorkout(p,s,'2026-11-03',d,0);assert.equal(log.entries[0].sets,1);assert.equal(log.entries[0].kg,null);assert.match(log.entries[0].actual,/no anotadas/);
  assert.deepEqual(makeDraft(d.id,s,log).checked[s.exercises[0].id],[2]);
  const first=reconcileWorkout([],log,20);const second=reconcileWorkout(first.logs,log,first.minutes);assert.equal(second.minutes,50);assert.equal(second.logs.length,1);
  assert.ok(trainingDataSchema.safeParse({plans:[p],logs:second.logs}).success);
});
test('experienced boxing uses specific strength/power, respects equipment, duration, phase and has permanent illustrations',()=>{
  for(const duration of [45,60,75])for(const level of ['intermediate','advanced'])for(const phase of ['base','build','deload'])for(const equipment of ['gym','dumbbells'])for(const boxingKit of [[],['trapBar','box','kettlebell','landmine']]){
    const p=generateTrainingPlan({...plan().config,duration,level,phase,equipment,boxingKit});
    for(const s of p.sessions)for(const ex of s.exercises){assert.ok(findExerciseRecord(ex)?.image);assert.ok(ex.sets>=1);if(equipment==='dumbbells')assert.ok(!['trap-bar-deadlift','box-jump','landmine-punch','kettlebell-swing','pull-up'].includes(ex.catalogId));}
    assert.equal(p.sessions.filter(s=>s.kind==='conditioning').length,2);
  }
  const p=plan();assert.ok(p.sessions[0].exercises.some(ex=>ex.catalogId==='trap-bar-deadlift'));assert.ok(p.sessions[0].exercises.some(ex=>ex.catalogId==='landmine-punch'));assert.ok(p.sessions[3].exercises.some(ex=>ex.catalogId==='kettlebell-swing'));
  assert.ok(!p.sessions.flatMap(s=>s.exercises).some(ex=>['landing','shadow-rotation'].includes(ex.catalogId)));
  const light=generateTrainingPlan({...p.config,phase:'deload'});assert.ok(light.sessions[0].exercises[0].sets<p.sessions[0].exercises[0].sets);
});
