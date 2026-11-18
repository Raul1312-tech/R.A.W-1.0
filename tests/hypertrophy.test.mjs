import test from 'node:test';
import assert from 'node:assert/strict';
import {generateTrainingPlan,defaultTrainingConfig,trainingDataSchema} from '../app/training-model.ts';
import {muscleVolume,gymIds,progressionFor} from '../app/hypertrophy-model.ts';
import {modalityOf} from '../app/modality.ts';
import {newProfile} from '../app/model.ts';
import {clubForDate,sessionsForDate} from '../app/training-calendar-model.ts';
import {makeDraft,toggleSet,finishWorkout} from '../app/workout-progress.ts';
import {moveGymDay,gymSubstitute} from '../app/gym-actions.ts';
import {coordinateGymWorkouts} from '../app/gym-coordination.ts';
import {reviewState} from '../app/review-state.ts';
import {previewNutritionSituation} from '../app/nutrition-situations-model.ts';
import {daySettings} from '../app/preparation-engine.ts';
import {strategyProposal} from '../app/coach-strategy.ts';
import {stateSchema} from '../app/validation.ts';
const config={...defaultTrainingConfig(),sport:'hypertrophy',level:'intermediate',phase:'build',duration:75,days:[0,1,2,3,4,5]};
test('six days have distinct A/B gym sessions, balanced major muscles and no combat or running',()=>{
 const plan=generateTrainingPlan({...config,sparringDays:[2],technicalDays:[3],runningDays:[1],competition:{fight:'2026-11-15T20:00:00Z',weighIn:'2026-11-14T08:00:00Z',weight:65,taper:true,notes:''}});
 assert.equal(plan.sessions.filter(s=>s.kind==='lift').length,6);assert.equal(plan.extraSessions.length,0);
 assert.equal(clubForDate(plan,'2026-11-12'),undefined);assert.equal(plan.config.competition,undefined);
 assert.notDeepEqual(plan.sessions[2].exercises.map(e=>e.catalogId),plan.sessions[5].exercises.map(e=>e.catalogId));
 assert.ok(plan.sessions.flatMap(s=>s.exercises).every(e=>gymIds.has(e.catalogId)&&e.block!=='power'&&e.block!=='interval'));
 for(const m of muscleVolume(plan.sessions))assert.ok(m.direct>0,m.name);
 assert.ok(sessionsForDate(plan,'2026-11-12').length);
});
test('each daily time limit is honored and priorities increase focused volume without universal extra series',()=>{
 const base=generateTrainingPlan(config),focus=generateTrainingPlan({...config,muscleFocus:['chest']});
 assert.ok(muscleVolume(focus.sessions).find(m=>m.id==='chest').direct>muscleVolume(base.sessions).find(m=>m.id==='chest').direct);
 const timed=generateTrainingPlan({...config,sessionLimits:[{day:0,minutes:30},{day:1,minutes:90}]});
 assert.equal(timed.sessions[0].minutes,30);assert.equal(timed.sessions[1].minutes,90);
 assert.ok(timed.sessions[0].exercises.length<timed.sessions[1].exercises.length);
 const light=generateTrainingPlan({...config,phase:'deload'});assert.ok(light.sessions[0].exercises[0].sets<base.sessions[0].exercises[0].sets);
});
test('modality inference preserves legacy boxers and isolates explicit gym profiles',()=>{
 const p=newProfile();assert.equal(modalityOf(p),null);
 p.workouts={plans:[generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing'})],logs:[]};assert.equal(modalityOf(p),'boxing');
 p.athlete={sport:'strength'};assert.equal(modalityOf(p),'hypertrophy');
});
test('measured checked sets persist; unchecked values never become performed work; progression needs measured data',()=>{
 const plan=generateTrainingPlan(config),session=plan.sessions[0],ex=session.exercises[0];
 let d={...makeDraft('test',session),elapsedMs:3600000,rpe:7,measurements:{[ex.id]:[{index:0,reps:12,kg:20,rir:3},{index:1,reps:12,kg:20,rir:3}]}};
 d=toggleSet(d,session,ex.id,0);const log=finishWorkout(plan,session,'2026-11-11',d,0);
 assert.equal(log.entries[0].measures.length,1);
 assert.match(log.entries[0].actual,/12 reps · 20 kg/);
 const parsed=trainingDataSchema.parse({plans:[plan],logs:[log],drafts:[d]});assert.equal(parsed.logs[0].entries[0].measures[0].kg,20);
 assert.doesNotMatch(progressionFor(ex,[log],'2026-11-12').text,/menor incremento/);
 const full={...log,entries:[{...log.entries[0],measures:Array.from({length:ex.sets},(_,index)=>({index,reps:12,kg:20,rir:3}))}]};
 assert.match(progressionFor(ex,[full],'2026-11-12').text,/menor incremento/);
});

test('moving a gym day updates automatic nutrition but preserves completed and explicit diets',()=>{
 const p=reviewState('2026-11-12').profiles[0];
 for(const date of ['2026-11-12','2026-11-13','2026-11-14','2026-11-15'])p.days[date]=previewNutritionSituation(p,daySettings(p,date),date,5);
 p.days['2026-11-13'].complete=true;
 p.days['2026-11-15'].nutrition.situationId='manual';
 const old=structuredClone(p),workouts=moveGymDay(p.workouts,'2026-11-12','2026-11-14','2026-11-12');
 const next=coordinateGymWorkouts(p,workouts,'2026-11-12');
 assert.ok(next.days['2026-11-12'].target.k<old.days['2026-11-12'].target.k);
 assert.ok(next.days['2026-11-14'].target.k>old.days['2026-11-14'].target.k);
 assert.deepEqual(next.days['2026-11-13'],old.days['2026-11-13']);
 assert.deepEqual(next.days['2026-11-15'],old.days['2026-11-15']);
 assert.deepEqual(p,old);
 assert.ok(stateSchema.safeParse({active:next.id,profiles:[next]}).success);
 assert.throws(()=>moveGymDay(p.workouts,'2026-11-12','2026-11-13','2026-11-12'),/ya tiene sesión/);
});

test('gym weekly load progression needs two measured performances and never creates actual work',()=>{
 const p=reviewState('2026-11-12').profiles[0],plan=p.workouts.plans[0],session=plan.sessions[0],ex=session.exercises[0];
 plan.config.loadIncrement=1;
 const log=date=>({id:date,planId:plan.id,date,day:0,title:session.title,session,sport:'hypertrophy',minutes:60,rpe:7,notes:'',entries:[{exerciseId:ex.id,name:ex.name,prescribed:'3 × 8–12',sets:ex.sets,setIndexes:[0,1,2],actual:'',kg:20,measures:Array.from({length:ex.sets},(_,index)=>({index,reps:12,kg:20,rir:3}))}]});
 p.workouts.logs=[log('2026-11-02')];
 assert.ok(!strategyProposal(p,'2026-11-12').training.flatMap(d=>d.after.flatMap(s=>s.exercises)).some(e=>e.id===ex.id&&e.plannedKg!=null));
 p.workouts.logs.push(log('2026-11-09'));
 const before=structuredClone(p),proposal=strategyProposal(p,'2026-11-12');
 assert.ok(proposal.training.flatMap(d=>d.after.flatMap(s=>s.exercises)).some(e=>e.id===ex.id&&e.plannedKg===21));
 assert.deepEqual(p,before);
 assert.match(proposal.reasons.join(' '),/dos registros/);
});

test('exercise replacements keep the movement pattern and clear the old load',()=>{
 const ex=generateTrainingPlan(config).sessions[0].exercises[0];
 assert.throws(()=>gymSubstitute(ex,'run-walk'),/alternativa/);
 const same=gymSubstitute({...ex,plannedKg:80},ex.catalogId);
 assert.equal(same.plannedKg,null);assert.equal(same.sets,ex.sets);
});
