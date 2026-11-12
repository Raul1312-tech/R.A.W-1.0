import test from 'node:test';
import assert from 'node:assert/strict';
import {updateTrainingConfig,boxingSchedule,defaultTrainingConfig,generateTrainingPlan,recommendBoxing,reconcileWorkout,trainingDataSchema,workoutLogSchema} from '../app/training-model.ts';
import {findExerciseRecord} from '../app/exercise-catalog.ts';
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

test('boxing uses 2 strength/power days plus 0–2 separate interval days',()=>{
  for(const count of [0,1,2]){
    const days=count===0?[0,3]:count===1?[0,2,4]:[0,1,3,5];
    const p=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',level:'intermediate',days,conditioningDays:count});
    const lifts=p.sessions.filter(s=>s.kind==='lift');
    assert.equal(lifts.length,2);assert.equal(p.sessions.filter(s=>s.kind==='conditioning').length,count);
    for(const s of lifts){assert.ok(s.exercises.some(e=>e.block==='power'));assert.ok(s.exercises.some(e=>e.block==='strength'));assert.ok(s.exercises.every(e=>e.group));}
  }
});

test('recommendation responds to experience, technical workload and sparring',()=>{
  const c={...defaultTrainingConfig(),sport:'boxing',level:'intermediate'};
  assert.equal(recommendBoxing(c).conditioningDays,2);
  assert.equal(recommendBoxing({...c,level:'beginner'}).conditioningDays,1);
  assert.equal(recommendBoxing({...c,technicalDays:[0,2,4]}).conditioningDays,1);
  assert.equal(recommendBoxing({...c,sparringDays:[2,5]}).conditioningDays,0);
});

test('load and limitations warn without blocking valid calendars; invalid weekdays still fail',()=>{
  assert.ok(generateTrainingPlan({...defaultTrainingConfig(),limitation:true}).warnings.some(w=>w.includes('profesional')));
  assert.ok(generateTrainingPlan({...defaultTrainingConfig(),days:[0,6]}).warnings.some(w=>w.includes('separar')));
  assert.equal(generateTrainingPlan({...defaultTrainingConfig(),days:[0,1,3,4]}).sessions.filter(s=>s.kind==='lift').length,4);
  assert.throws(()=>generateTrainingPlan({...defaultTrainingConfig(),days:[7]}),/Revisa/);
});

test('physical and running calendars preserve exactly the selected days regardless of chronological order',()=>{
  const p=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',physicalDays:[3,6],runningDays:[0,2]});
  assert.deepEqual(p.sessions.filter(s=>s.kind==='lift').map(s=>s.day),[3,6]);
  assert.deepEqual(p.sessions.filter(s=>s.kind==='conditioning').map(s=>s.day),[0,2]);
  assert.match(p.sessions[3].title,/Físico A/);assert.match(p.sessions[6].title,/Físico B/);
  assert.match(p.sessions[0].title,/cortos/);assert.match(p.sessions[2].title,/sostenidos/);
  assert.deepEqual(p.config.days,[0,2,3,6]);assert.equal(p.config.conditioningDays,2);
  assert.equal(generateTrainingPlan({...p.config,runningDays:[0,3]}).extraSessions.length,1);
  assert.equal(generateTrainingPlan({...p.config,runningDays:[0,1,2]}).config.runningDays.length,3);
});

test('explicit 2+2 calendars ignore stale derived fields and permit every disjoint weekday assignment',()=>{
  let count=0;
  for(let a=0;a<7;a++)for(let b=a+1;b<7;b++)for(let c=0;c<7;c++)for(let d=c+1;d<7;d++){
    if([a,b].includes(c)||[a,b].includes(d))continue;
    const p=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',physicalDays:[a,b],runningDays:[c,d],days:[],conditioningDays:7,sparringDays:[0,3]});
    assert.equal(p.sessions.filter(s=>s.kind==='lift').length,2);assert.equal(p.sessions.filter(s=>s.kind==='conditioning').length,2);count++;
  }
  assert.equal(count,210);
});

test('legacy calendar editing materializes both lists and remains valid after temporary over-selection',()=>{
  const legacy={...defaultTrainingConfig(),sport:'boxing',days:[0,1,4,5]};
  let c=updateTrainingConfig(legacy,{physicalDays:[2,4]});
  assert.deepEqual(c.runningDays,[1,5]);
  c=updateTrainingConfig(c,{runningDays:[1,3,5]});
  assert.equal(generateTrainingPlan(c).config.runningDays.length,3);
  c=updateTrainingConfig(c,{runningDays:[1,3]});
  const plan=generateTrainingPlan(c);assert.deepEqual(plan.config.physicalDays,[2,4]);assert.deepEqual(plan.config.runningDays,[1,3]);
  assert.throws(()=>generateTrainingPlan({...c,duration:55}),/45, 60, 75, 90 o 120/);
  assert.throws(()=>generateTrainingPlan({...c,notes:'a'.repeat(801)}),/800 caracteres/);
});

test('sparring coincidences warn but never block, including Sunday before Monday',()=>{
  const p=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',physicalDays:[3,6],runningDays:[1,4],sparringDays:[0,2,3]});
  assert.ok(p.warnings.some(w=>w.includes('Domingo')&&w.includes('víspera')&&w.includes('Lunes')));
  assert.ok(p.warnings.some(w=>w.includes('Martes')&&w.includes('Carrera')&&w.includes('víspera')));
  assert.ok(p.warnings.some(w=>w.includes('Jueves')&&w.includes('mismo día')));
  assert.equal(p.sessions[6].kind,'lift');assert.equal(p.sessions[1].kind,'conditioning');
});

test('legacy plans derive their original assignments and retain their stored sessions',()=>{
  const legacy={...defaultTrainingConfig(),sport:'boxing',days:[0,1,3,5]};
  assert.deepEqual(boxingSchedule(legacy),{physicalDays:[0,3],runningDays:[1,5]});
  assert.deepEqual(boxingSchedule({...legacy,days:[0,3],conditioningDays:0}),{physicalDays:[0,3],runningDays:[]});
  const p=generateTrainingPlan(legacy);delete p.config.physicalDays;delete p.config.runningDays;
  const original=JSON.stringify(p.sessions);
  const parsed=trainingDataSchema.parse({plans:[p],logs:[]});
  assert.equal(JSON.stringify(parsed.plans[0].sessions),original);
});

test('every new boxing exercise has a matching illustrated execution guide at every level and duration',()=>{
  for(const level of ['beginner','intermediate','advanced'])for(const medicineBall of [true,false])for(const duration of [45,60,75]){
    const p=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',level,medicineBall,duration,physicalDays:[0,3],runningDays:[1,5]});
    for(const s of p.sessions)for(const ex of s.exercises){const guide=findExerciseRecord(ex);assert.ok(guide,ex.name);assert.ok(guide.steps.length>=3);assert.ok(guide.image.tile>=0);}
  }
});

test('equipment, session duration and phase change the prescription',()=>{
  const c={...defaultTrainingConfig(),level:'intermediate',phase:'build'};
  const base=generateTrainingPlan(c);
  const short=generateTrainingPlan({...c,duration:45,equipment:'dumbbells'});
  const light=generateTrainingPlan({...c,phase:'deload'});
  assert.ok(short.sessions[0].exercises.length<base.sessions[0].exercises.length);
  assert.ok(short.sessions[0].exercises.some(e=>e.catalogId==='dumbbell-bench'||e.catalogId==='floor-press'));
  assert.ok(light.sessions[0].exercises[0].sets<base.sessions[0].exercises[0].sets);
  const box=generateTrainingPlan({...c,sport:'boxing',days:[0,1,3,5],medicineBall:true});
  assert.ok(box.sessions[0].exercises.some(ex=>ex.name.includes('balón')));
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
