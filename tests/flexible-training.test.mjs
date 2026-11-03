import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTrainingConfig,generateTrainingPlan,allTrainingSessions,workoutKey,trainingDataSchema,reconcileWorkout} from '../app/training-model.ts';
import {makeDraft,toggleSet,finishWorkout} from '../app/workout-progress.ts';
const week=[0,1,2,3,4,5,6];
test('7 physical + 7 running + 7 boxing and sparring days produce 14 independent sessions without warning overflow',()=>{
  const p=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',level:'intermediate',physicalDays:week,runningDays:week,technicalDays:week,sparringDays:week});
  const sessions=allTrainingSessions(p);assert.equal(sessions.length,14);assert.equal(sessions.filter(s=>s.kind==='lift').length,7);assert.equal(sessions.filter(s=>s.kind==='conditioning').length,7);
  assert.deepEqual(p.config.days,week);assert.equal(p.config.conditioningDays,7);assert.equal(p.extraSessions.length,7);
  assert.ok(p.warnings.some(w=>w.includes('ningún día')));assert.ok(p.warnings.some(w=>w.includes('7 días con físico, carrera y boxeo')));assert.ok(p.warnings.some(w=>w.includes('desgaste')));
  assert.equal(new Set(sessions.map(s=>workoutKey(p.id,s,'2026-11-03'))).size,14);
  assert.deepEqual(trainingDataSchema.parse(JSON.parse(JSON.stringify({plans:[p],logs:[]}))).plans[0],p);
});
test('every frequency 0–7 preserves exact days, with overlap at every weekday offset',()=>{
  for(let physical=0;physical<=7;physical++)for(let running=0;running<=7;running++)for(let offset=0;offset<7;offset++){
    const physicalDays=week.slice(0,physical),runningDays=week.slice(0,running).map(d=>(d+offset)%7).sort();
    const p=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',physicalDays,runningDays,technicalDays:week});const sessions=allTrainingSessions(p);
    assert.deepEqual(sessions.filter(s=>s.kind==='lift').map(s=>s.day),physicalDays);assert.deepEqual(sessions.filter(s=>s.kind==='conditioning').map(s=>s.day),runningDays);
    assert.equal(p.extraSessions.length,physicalDays.filter(d=>runningDays.includes(d)).length);
  }
});
test('hypertrophy accepts 0–7 chosen days even for beginner; third boxing day has a distinct C session',()=>{
  for(let n=0;n<=7;n++){
    const p=generateTrainingPlan({...defaultTrainingConfig(),days:week.slice(0,n)});assert.equal(p.sessions.filter(s=>s.kind==='lift').length,n);
  }
  for(const level of ['beginner','intermediate','advanced']){
    const p=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',level,physicalDays:[0,2,4],runningDays:[0,2,4]});
    assert.match(p.sessions[4].title,/Físico C/);assert.notDeepEqual(p.sessions[4].exercises,p.sessions[2].exercises);
  }
});
test('same-day physical and running checklists, logs and elapsed minutes never overwrite each other',()=>{
  const p=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',physicalDays:[0],runningDays:[0]});const physical=p.sessions[0],running=p.extraSessions[0],date='2026-11-03';
  const log=(session,minutes)=>{let d=makeDraft(workoutKey(p.id,session,date),session);d=toggleSet(d,session,session.exercises[0].id,0);return finishWorkout(p,session,date,{...d,elapsedMs:minutes*60000,rpe:7},0)};
  const a=log(physical,45),b=log(running,30);assert.notEqual(a.id,b.id);
  const one=reconcileWorkout([],a,10),two=reconcileWorkout(one.logs,b,one.minutes);assert.equal(two.minutes,85);assert.equal(two.logs.length,2);
  const edited=reconcileWorkout(two.logs,{...a,minutes:50},two.minutes);assert.equal(edited.minutes,90);assert.equal(edited.logs.find(l=>l.id===b.id).minutes,30);
  const old={...physical};delete old.slot;assert.equal(workoutKey(p.id,old,date),p.id+':0:'+date);
});
