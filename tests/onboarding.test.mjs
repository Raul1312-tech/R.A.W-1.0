import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyAnswers,stepProblem,stepIssues} from '../app/onboarding-schema.ts';
import {prepareOnboarding,startOnboarding} from '../app/onboarding-model.ts';
import {emptyDay,newProfile} from '../app/model.ts';
import {stateSchema} from '../app/validation.ts';
import {allTrainingSessions,defaultTrainingConfig,generateTrainingPlan} from '../app/training-model.ts';
import {dailySessions,upcomingTrainingWeek} from '../app/training-calendar-model.ts';

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
  assert.equal(startOnboarding(saved).step,2);
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
 p.workouts.plans.push({...original,id:'boxing-december',month:'2026-12'});
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
