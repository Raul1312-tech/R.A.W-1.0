import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTrainingConfig,generateTrainingPlan,recommendBoxing,reconcileWorkout,trainingDataSchema,workoutLogSchema} from '../app/training-model.ts';
import {initialState} from '../app/model.ts';
import {stateSchema} from '../app/validation.ts';

test('hypertrophy creates 2–5 lifting days and preserves seven unique calendar days',()=>{
  for(const days of [[0,3],[0,2,4],[0,1,3,4],[0,1,3,4,5]]){
    const plan=generateTrainingPlan({...defaultTrainingConfig(),level:'intermediate',days});
    assert.equal(plan.sessions.length,7);
    assert.deepEqual(plan.sessions.map(s=>s.day),[0,1,2,3,4,5,6]);
    assert.equal(plan.sessions.filter(s=>s.kind==='lift').length,days.length);
    assert.equal(plan.sessions.filter(s=>s.kind==='conditioning').length,0);
    assert.ok(plan.sessions.filter(s=>s.kind==='rest').every(s=>s.exercises.length===0));
  }
});

test('boxing uses 2 strength/power days plus 0–2 interval days, with power first',()=>{
  for(const count of [0,1,2]){
    const days=count===0?[0,3]:count===1?[0,2,4]:[0,1,3,5];
    const p=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',level:'intermediate',days,conditioningDays:count});
    const lifts=p.sessions.filter(s=>s.kind==='lift');
    assert.equal(lifts.length,2);assert.equal(p.sessions.filter(s=>s.kind==='conditioning').length,count);
    for(const s of lifts){assert.equal(s.exercises[0].block,'power');assert.equal(s.exercises[1].block,'power');assert.ok(s.exercises.some(e=>e.block==='strength'));}
  }
});

test('recommendation responds to experience, technical workload and sparring',()=>{
  const c={...defaultTrainingConfig(),sport:'boxing',level:'intermediate'};
  assert.equal(recommendBoxing(c).conditioningDays,2);
  assert.equal(recommendBoxing({...c,level:'beginner'}).conditioningDays,1);
  assert.equal(recommendBoxing({...c,technicalDays:[0,2,4]}).conditioningDays,1);
  assert.equal(recommendBoxing({...c,sparringDays:[2,5]}).conditioningDays,0);
});

test('conflicting schedules and limitations fail with actionable errors',()=>{
  assert.throws(()=>generateTrainingPlan({...defaultTrainingConfig(),limitation:true}),/profesional/);
  assert.throws(()=>generateTrainingPlan({...defaultTrainingConfig(),days:[0,6]}),/Separa/);
  assert.throws(()=>generateTrainingPlan({...defaultTrainingConfig(),days:[0,1,3,4]}),/2 o 3/);
  assert.throws(()=>generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',days:[0,1,3,5],sparringDays:[6]}),/sparring/);
  assert.throws(()=>generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',days:[0,2]}),/4 días/);
});

test('equipment, session duration and phase change the prescription',()=>{
  const c={...defaultTrainingConfig(),level:'intermediate',phase:'build'};
  const base=generateTrainingPlan(c);
  const short=generateTrainingPlan({...c,duration:45,equipment:'dumbbells'});
  const light=generateTrainingPlan({...c,phase:'deload'});
  assert.ok(short.sessions[0].exercises.length<base.sessions[0].exercises.length);
  assert.match(short.sessions[0].exercises.find(e=>e.id==='bench').name,/suelo/);
  assert.ok(light.sessions[0].exercises[0].sets<base.sessions[0].exercises[0].sets);
  const box=generateTrainingPlan({...c,sport:'boxing',days:[0,1,3,5],medicineBall:true});
  assert.match(box.sessions[0].exercises[1].name,/balón/);
});

function log(){return {id:'plan:0:2026-11-03',planId:'plan',day:0,date:'2026-11-03',title:'Sesión de prueba',sport:'hypertrophy',minutes:45,rpe:7,notes:'',entries:[{exerciseId:'squat',name:'Sentadilla',prescribed:'2 × 8',sets:2,actual:'8 / 8',kg:20}]}}
test('editing a workout replaces it and adjusts minutes once, keeping manual activity',()=>{
  const first=reconcileWorkout([],log(),20);assert.equal(first.minutes,65);
  const changed=reconcileWorkout(first.logs,{...log(),minutes:50},first.minutes);
  assert.equal(changed.logs.length,1);assert.equal(changed.minutes,70);
  assert.equal(first.logs[0].minutes,45);
  assert.throws(()=>reconcileWorkout(changed.logs,{...log(),date:'2026-11-04'},70),/identidad/);
  assert.throws(()=>reconcileWorkout([],log(),580),/600/);
});

test('legacy profiles remain valid and new training survives validation/export roundtrip',()=>{
  const state=initialState();assert.ok(stateSchema.safeParse(state).success);
  const plan=generateTrainingPlan(defaultTrainingConfig());
  state.profiles[0].workouts={plans:[plan],logs:[log()]};
  const roundtrip=stateSchema.parse(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(roundtrip.profiles[0].workouts,state.profiles[0].workouts);
  assert.equal(workoutLogSchema.safeParse({...log(),date:'2026-02-31'}).success,false);
  assert.equal(trainingDataSchema.safeParse({plans:[plan],logs:[log(),log()]}).success,false);
});
