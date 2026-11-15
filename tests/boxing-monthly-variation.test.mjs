import test from 'node:test';
import assert from 'node:assert/strict';
import {generateTrainingPlan,defaultTrainingConfig,trainingPlanSchema,workoutKey} from '../app/training-model.ts';
import {sessionsForDate,editCalendarDay,dailySessions} from '../app/training-calendar-model.ts';
import {findExerciseRecord} from '../app/exercise-catalog.ts';
import {makeDraft,toggleSet} from '../app/workout-progress.ts';
const config=()=>({...defaultTrainingConfig(),sport:'boxing',catalogVersion:2,variation:17,level:'advanced',phase:'build',days:[1,3],physicalDays:[1,3],runningDays:[],duration:90,priority:'punch',boxingKit:['trapBar','landmine','box','kettlebell'],additionalKit:['cones','ladder'],medicineBall:true});
const monthly=(c=config())=>({...generateTrainingPlan(c),month:'2026-11'});
const dates=['2026-11-03','2026-11-10','2026-11-17','2026-11-24'];
test('same weekday rotates compatible illustrated movements deterministically while retaining the prescription',()=>{
 const p=monthly(),before=JSON.stringify(p),sessions=dates.map(d=>sessionsForDate(p,d)[0]);
 assert.equal(new Set(sessions.map(s=>s.exercises.map(e=>e.catalogId).join(','))).size,4);
 for(const [i,s] of sessions.entries()){
  assert.equal(s.title,sessions[0].title);assert.equal(s.minutes,sessions[0].minutes);
  assert.equal(new Set(s.exercises.map(e=>e.id)).size,s.exercises.length);
  for(const [j,e] of s.exercises.entries()){
   const r=findExerciseRecord(e),base=findExerciseRecord(sessions[0].exercises[j]);
   assert.ok(r.image.src);assert.equal(r.category,base.category);assert.equal(r.pattern,base.pattern);
   assert.equal(e.sets,sessions[0].exercises[j].sets);assert.equal(e.rest,sessions[0].exercises[j].rest);
  }
  assert.equal(JSON.stringify(s),JSON.stringify(sessionsForDate(JSON.parse(before),dates[i])[0]));
  assert.ok(trainingPlanSchema.safeParse({...p,overrides:[{date:dates[i],sessions:[s]}]}).success);
 }
 assert.equal(JSON.stringify(p),before);
});
test('rotation respects available equipment, difficulty, exclusions and deload impact',()=>{
 for(const equipment of ['bodyweight','dumbbells','gym']){
  const c={...config(),equipment,level:'beginner',phase:'deload',boxingKit:[],additionalKit:[],medicineBall:false,excludedExercises:['chin-retraction']},p=monthly(c);
  for(const date of dates)for(const e of sessionsForDate(p,date)[0].exercises){
   const r=findExerciseRecord(e);assert.ok(r.minLevel<=1);assert.notEqual(r.impact,'high');
   assert.ok(!r.equipment.some(k=>['landmine','trapBar','box','medicineBall','ladder','cones'].includes(k)));
   if(date!==dates[0])assert.notEqual(r.id,'chin-retraction');
  }
 }
});
test('manual overrides, loaded prescriptions and started sessions remain pinned; hypertrophy stays stable',()=>{
 const p=monthly(),date=dates[1],session=structuredClone(sessionsForDate(p,date)[0]);session.exercises[0].plannedKg=12;
 const edited=editCalendarDay(p,p.month,date,[session],'date');assert.deepEqual(sessionsForDate(edited,date),[session]);
 let draft={...makeDraft(workoutKey(p.id,session,date),session),planId:p.id,date,session};draft=toggleSet(draft,session,session.exercises[0].id,0);
 assert.deepEqual(dailySessions({plans:[p],logs:[],drafts:[draft]},date)[0].session,session);
 p.sessions[1].exercises[0].plannedKg=15;
 assert.deepEqual(sessionsForDate(p,dates[2])[0].exercises[0],p.sessions[1].exercises[0]);
 const gym=monthly({...defaultTrainingConfig(),days:[1,3]});assert.deepEqual(sessionsForDate(gym,dates[0]),sessionsForDate(gym,dates[2]));
});
