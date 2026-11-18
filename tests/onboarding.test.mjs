import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyAnswers,stepProblem,stepIssues,onboardingStepIssues,draftSchema} from '../app/onboarding-schema.ts';
import {prepareOnboarding,startOnboarding} from '../app/onboarding-model.ts';
import {emptyDay,newProfile} from '../app/model.ts';
import {stateSchema} from '../app/validation.ts';
import {allTrainingSessions,defaultTrainingConfig,generateTrainingPlan} from '../app/training-model.ts';
import {configuredTrainingMonth} from '../app/onboarding-training.ts';
import {makeDraft} from '../app/workout-progress.ts';
import {dailySessions,upcomingTrainingWeek,planForDate,sessionsForDate} from '../app/training-calendar-model.ts';

function athleteAnswers(sport){
  return {...emptyAnswers(),
    basics:{sport,name:'Perfil de prueba',age:30,sex:'male',height:175,weight:72,goal:'performance',trend:'steady',activity:'mixed'},
    nutrition:{schedule:'regular',currentMeals:3,mealCount:3,difficultMeal:'none',firstMeal:'08:07',lastMeal:'20:32'},
    food:{reviewedRestrictions:true,allergies:[],intolerances:['leche'],excluded:[],preferred:['rice'],cook:'quick',access:'home',menuStyle:'flexible'},
    competition:{status:'none'},
    boxing:sport==='boxing'?{experience:'regular',club:[{day:0,kind:'technique',minutes:60},{day:4,kind:'sparring',minutes:75}],roundLimit:'breath'}:{},
    strength:{frequency:'none',practice:'none',confidence:'guided',equipment:'bodyweight'},
    muscle:sport==='strength'?{goal:'start',priority:'balanced'}:{},
    running:sport==='boxing'?{frequency:'occasional',mode:'walkRun',effort:'easy',place:'outside'}:{},
    availability:{slots:[{day:1,kind:'auto',minutes:20},{day:5,kind:'auto',minutes:30}],restDays:[6],mode:'auto'},
    recovery:{state:'ready',limitation:'none',tracking:'simple'},
  };
}

test('the persisted journal round-trips a partial onboarding and its step without confirming the profile',()=>{
  const profile=newProfile();
  profile.onboarding={version:1,draft:{step:2,answers:{...emptyAnswers(),basics:{sport:'boxing',age:29}}}};
  const payload=JSON.stringify({active:profile.id,profiles:[profile]});
  const saved=stateSchema.parse(JSON.parse(payload)).profiles[0];
  assert.equal(saved.confirmed,false);
  assert.equal(startOnboarding(saved).step,1);
  assert.equal(startOnboarding(saved).flowVersion,2);
  assert.equal(startOnboarding(saved).answers.basics.age,29);
  assert.ok(!stateSchema.safeParse({active:profile.id,profiles:[{...profile,onboarding:{version:1,draft:{...profile.onboarding.draft,step:8}}}]}).success);
});

test('a beginner boxer gets short equipment-free strength and walk-run around club sessions',()=>{
  const p=newProfile();
  const a=athleteAnswers('boxing');
  const next=prepareOnboarding(p,a,'2026-11-30');
  const plan=next.workouts.plans[0];
  assert.equal(next.confirmed,true);
  assert.equal(next.plans.at(-1).meals.length,3);
  assert.ok(next.plans.at(-1).week.every(day=>day.meals.every(meal=>meal.items.every(item=>!item.food.allergens.includes('leche')))));
  assert.equal(plan.config.equipment,'bodyweight');
  assert.equal(plan.config.level,'beginner');
  assert.deepEqual(plan.config.sparringDays,[4]);
  assert.deepEqual(plan.config.physicalDays,[1]);
  assert.deepEqual(plan.config.runningDays,[5]);
  const sessions=allTrainingSessions(plan).filter(day=>day.kind!=='rest');
  assert.deepEqual(sessions.map(s=>s.minutes),[20,30]);
  assert.equal(sessions[1].exercises[0].catalogId,'run-walk');
  assert.ok(dailySessions(next.workouts,'2026-12-05').length);
  const saved=stateSchema.parse(JSON.parse(JSON.stringify({active:next.id,profiles:[next]}))).profiles[0];
  assert.deepEqual(saved.onboarding.completed.answers,{...a,strength:{...a.strength,equipment:['bodyweight']}});
  assert.equal(saved.onboarding.draft,undefined);
});

test('finishing musculación retains existing routines and historical records',()=>{
  const p=newProfile();
  const old={...generateTrainingPlan(defaultTrainingConfig()),month:'2026-11'};
  p.workouts={plans:[old],logs:[]};
  p.days['2026-11-01']={...emptyDay(p),weight:72,complete:true};
  const a=athleteAnswers('strength');
  assert.equal(stepProblem(a,4),null);
  const next=prepareOnboarding(p,a,'2026-11-10');
  assert.equal(next.athlete.sport,'strength');
  assert.equal(next.workouts.plans[0].id,old.id);
  assert.deepEqual(next.days['2026-11-01'],p.days['2026-11-01']);
});

test('changing boxing to gym keeps past plans and records while replacing future combat calendars',()=>{
 const p=prepareOnboarding(newProfile(),athleteAnswers('boxing'),'2026-11-10');
 const original=structuredClone(p.workouts.plans[0]);
 p.workouts.plans.push({...original,id:'boxing-december',month:'2026-12',overrides:[],clubOverrides:{}});
 p.days['2026-11-01']={...emptyDay(p),weight:72,complete:true};
 const next=prepareOnboarding(p,athleteAnswers('strength'),'2026-11-12');
 assert.deepEqual(next.workouts.plans.find(plan=>plan.id===original.id),original);
 assert.equal(next.workouts.plans.filter(plan=>plan.month==='2026-12').at(-1).config.sport,'hypertrophy');
 assert.deepEqual(next.days['2026-11-01'],p.days['2026-11-01']);
 assert.equal(next.preparation.competition,undefined);
 assert.ok(stateSchema.safeParse({active:next.id,profiles:[next]}).success);
});

test('confirmed competition dates round-trip as local clock times and preserve the chosen zone',()=>{
  const p=newProfile();
  const a=athleteAnswers('boxing');
  a.competition={status:'confirmed',categoryStatus:'confirmed',category:72,
    weighDate:'2026-11-22',weighTime:'09:00',fightDate:'2026-11-22',fightTime:'17:00',timeZone:'Europe/Madrid'};
  const next=prepareOnboarding(p,a,'2026-11-10');
  assert.equal(next.preparation.competition.weighIn,'2026-11-22T08:00:00.000Z');
  assert.equal(next.preparation.competition.fight,'2026-11-22T16:00:00.000Z');
  assert.equal(next.onboarding.completed.answers.competition.timeZone,'Europe/Madrid');
});


test('boxing derives its goal from competition, removes obsolete goal weight and accepts missing legacy goal',()=>{
  const a=athleteAnswers('boxing');
  delete a.basics.goal;
  assert.equal(stepProblem(a,0),null);
  a.basics.goalWeight=95;a.basics.success='weight';
  a.competition={status:'possible',categoryStatus:'estimated',category:71};
  const next=prepareOnboarding(newProfile(),a,'2026-11-10');
  assert.equal(next.onboarding.completed.answers.basics.goal,'competition');
  assert.equal(next.onboarding.completed.answers.basics.goalWeight,undefined);
  assert.equal(next.onboarding.completed.answers.basics.success,undefined);
  assert.equal(next.athlete.goal,'performance');
  assert.equal(next.athlete.competitionWeight.weight,71);
  assert.equal(next.goal,72);
  const strength=athleteAnswers('strength');delete strength.basics.goal;
  assert.ok(stepIssues(strength,0)['basics.goal']);
});

test('multiple equipment selections survive draft/save/reload and choose an available training template',()=>{
  for(const [equipment,expected] of [[['bodyweight','dumbbells','gym'],'gym'],[['bodyweight','dumbbells'],'dumbbells'],[['bodyweight'],'bodyweight']]){
    const a=athleteAnswers('boxing');a.strength.equipment=equipment;
    const p=newProfile();p.onboarding={version:1,draft:{step:5,answers:a}};
    const reloaded=stateSchema.parse(JSON.parse(JSON.stringify({active:p.id,profiles:[p]}))).profiles[0];
    assert.deepEqual(startOnboarding(reloaded).answers.strength.equipment,equipment);
    const next=prepareOnboarding(reloaded,a,'2026-11-10');
    assert.equal(next.workouts.plans[0].config.equipment,expected);
    const saved=stateSchema.parse(JSON.parse(JSON.stringify({active:next.id,profiles:[next]}))).profiles[0];
    assert.deepEqual(saved.onboarding.completed.answers.strength.equipment,equipment);
  }
});

test('field validation identifies the missing answer and clears only corrected errors',()=>{
  const a=athleteAnswers('boxing');
  delete a.strength.confidence;a.strength.equipment=[];
  assert.deepEqual(Object.keys(stepIssues(a,5)),['strength.confidence','strength.equipment']);
  a.strength.confidence='guided';
  assert.deepEqual(Object.keys(stepIssues(a,5)),['strength.equipment']);
  a.strength.equipment=['bodyweight'];
  assert.equal(stepProblem(a,5),null);
  a.availability.mode='manual';
  assert.deepEqual(Object.keys(stepIssues(a,7)),['availability.slots.0.kind','availability.slots.1.kind']);
  a.competition={status:'confirmed',categoryStatus:'confirmed',category:72,weighDate:'2026-12-10',fightDate:'2026-12-09'};
  assert.ok(stepIssues(a,3)['competition.weighDate']);
});

test('legacy completed profiles remain valid including old equipment and unused movement answers',()=>{
  const p=newProfile(),a=athleteAnswers('boxing');a.strength.patterns=['squat','hinge'];
  p.onboarding={version:1,completed:{at:'2026-11-10T12:00:00.000Z',answers:a}};
  const saved=stateSchema.parse(JSON.parse(JSON.stringify({active:p.id,profiles:[p]}))).profiles[0];
  assert.equal(startOnboarding(saved).answers.strength.equipment,'bodyweight');
  assert.deepEqual(saved.onboarding.completed.answers.strength.patterns,['squat','hinge']);
});

test('the visible training week includes club sessions, physical and running across a month boundary',()=>{
  const next=prepareOnboarding(newProfile(),athleteAnswers('boxing'),'2026-11-30');
  const week=upcomingTrainingWeek(next.workouts,'2026-11-30');
  assert.equal(week.length,7);
  assert.equal(week[0].club,'Boxeo técnico');
  assert.equal(week[0].sessions.length,0);
  assert.equal(week[1].date,'2026-12-01');
  assert.equal(week[1].sessions[0].session.kind,'lift');
  assert.equal(week[4].club,'Sparring');
  assert.equal(week[5].sessions[0].session.kind,'conditioning');
  assert.equal(week[6].sessions.length,0);
});

test('four-step essentials keep restrictions, preferences and optional legacy answers without requiring extra questionnaires',()=>{
 const a=athleteAnswers('boxing');
 delete a.basics.trend;delete a.nutrition.currentMeals;delete a.nutrition.difficultMeal;
 delete a.food.menuStyle;delete a.boxing.roundLimit;delete a.strength.frequency;delete a.strength.practice;delete a.recovery.tracking;
 a.food.preferences={foods:{bread:'usual',rice:'usual',chicken:'usual',beef:'avoid'},variety:'balanced',certification:'none'};
 for(let step=0;step<4;step++)assert.deepEqual(onboardingStepIssues(a,step),{});
 const p=prepareOnboarding(newProfile(),a,'2026-11-18');
 const saved=stateSchema.parse(JSON.parse(JSON.stringify({active:p.id,profiles:[p]}))).profiles[0];
 assert.deepEqual(saved.preparation.foodPreferences,a.food.preferences);
 assert.deepEqual(saved.onboarding.completed.answers.food.preferences,a.food.preferences);
 assert.ok(saved.plans.at(-1).week.every(d=>d.meals.every(m=>m.items.every(it=>it.food.id!=='beef'&&!it.food.allergens.includes('leche')))));
 const unsafe=structuredClone(a);unsafe.food.reviewedRestrictions=false;delete unsafe.recovery.limitation;
 assert.ok(onboardingStepIssues(unsafe,1)['food.reviewedRestrictions']);
 assert.ok(onboardingStepIssues(unsafe,3)['recovery.limitation']);
});
test('legacy drafts migrate to their matching compact section and retain every saved answer',()=>{
 const a=athleteAnswers('boxing'),mapping=[0,1,1,0,2,2,2,3];
 for(let step=0;step<8;step++){
  const p=newProfile();p.onboarding={version:1,draft:{step,answers:a}};
  const draft=startOnboarding(p);assert.equal(draft.step,mapping[step]);assert.equal(draft.flowVersion,2);assert.deepEqual(draft.answers,a);
  const loaded=stateSchema.parse(JSON.parse(JSON.stringify({active:p.id,profiles:[{...p,onboarding:{version:1,draft}}]}))).profiles[0];
  assert.deepEqual(startOnboarding(loaded),draft);
 }
 assert.equal(draftSchema.safeParse({step:4,flowVersion:2,answers:a}).success,false);
});
test('reviewing the same sport applies chosen days immediately and protects past, started sessions and actual records',()=>{
 const initial=athleteAnswers('boxing'),p=prepareOnboarding(newProfile(),initial,'2026-11-01'),today='2026-11-17';
 const old=planForDate(p.workouts,today),row=dailySessions(p.workouts,today)[0];
 p.workouts.drafts=[{...makeDraft(row.key,row.session),planId:old.id,date:today,session:row.session,elapsedMs:1000}];
 p.days['2026-11-16']={...emptyDay(p),complete:true,water:3000,weight:72};
 const before=structuredClone(p),a=athleteAnswers('boxing');
 a.boxing.club=[{day:1,kind:'technique',minutes:60},{day:3,kind:'technique',minutes:60},{day:5,kind:'sparring',minutes:75}];
 a.availability={mode:'manual',restDays:[6],slots:[{day:0,kind:'physical',minutes:60},{day:2,kind:'physical',minutes:45},{day:1,kind:'running',minutes:30},{day:4,kind:'running',minutes:30}]};
 const next=prepareOnboarding(p,a,today),plan=planForDate(next.workouts,today);
 assert.notEqual(plan.id,old.id);assert.deepEqual(plan.config.physicalDays,[0,2]);assert.deepEqual(plan.config.runningDays,[1,4]);
 assert.deepEqual(plan.config.technicalDays,[1,3]);assert.deepEqual(plan.config.sparringDays,[5]);
 assert.deepEqual(next.workouts.drafts,before.workouts.drafts);assert.deepEqual(next.workouts.logs,before.workouts.logs);
 assert.deepEqual(next.days['2026-11-16'],before.days['2026-11-16']);
 assert.deepEqual(sessionsForDate(plan,'2026-11-10'),sessionsForDate(old,'2026-11-10'));
 assert.deepEqual(sessionsForDate(plan,today),sessionsForDate(old,today));
 assert.equal(dailySessions(next.workouts,today)[0].pinned,true);
 assert.equal(dailySessions(next.workouts,'2026-11-23')[0].session.kind,'lift');
 assert.equal(dailySessions(next.workouts,'2026-11-20')[0].session.kind,'conditioning');
 assert.deepEqual(p,before);
 assert.ok(stateSchema.safeParse({active:next.id,profiles:[next]}).success);
});
test('saved configuration carries to later months without re-entering training days',()=>{
 const p=prepareOnboarding(newProfile(),athleteAnswers('boxing'),'2026-11-18'),last=planForDate(p.workouts,'2026-11-18'),before=structuredClone(p.workouts);
 const december=configuredTrainingMonth(p.workouts,last.config,'2026-12','2026-12-01');
 assert.deepEqual(december.config.physicalDays,last.config.physicalDays);assert.deepEqual(december.config.runningDays,last.config.runningDays);
 assert.deepEqual(december.config.sparringDays,last.config.sparringDays);assert.deepEqual(december.config.sessionLimits,last.config.sessionLimits);
 assert.deepEqual(p.workouts,before);
});
test('a declared limitation pauses new physical prescriptions while retaining the declared club schedule',()=>{
 const a=athleteAnswers('boxing');a.recovery.limitation='pain';
 const p=prepareOnboarding(newProfile(),a,'2026-11-18'),plan=planForDate(p.workouts,'2026-11-18');
 assert.deepEqual(plan.config.physicalDays,[]);assert.deepEqual(plan.config.runningDays,[]);
 assert.deepEqual(plan.config.sparringDays,[4]);assert.ok(allTrainingSessions(plan).every(s=>s.kind==='rest'));
 assert.ok(stateSchema.safeParse({active:p.id,profiles:[p]}).success);
});
