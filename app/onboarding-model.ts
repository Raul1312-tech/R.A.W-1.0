import {choices,emptyAnswers,selectedEquipment,stepProblem,type OnboardingAnswers,type OnboardingDraft} from './onboarding-schema.ts';
import {saveProfileSetup} from './profile-setup-model.ts';
import type {Profile} from './model.ts';
import {competitionSchema,type Competition} from './preparation-schema.ts';
import {allTrainingSessions,defaultTrainingConfig,generateTrainingPlan,recommendBoxing,type TrainingConfig} from './training-model.ts';
import {planForDate} from './training-calendar-model.ts';
import {replanCompetition} from './competition-plan.ts';
import {stateSchema} from './validation.ts';

const activityFactors={seated:1.2,mixed:1.4,active:1.6,physical:1.8};

export function startOnboarding(p:Profile):OnboardingDraft{
  if(p.onboarding?.draft)return p.onboarding.draft;
  if(p.onboarding?.completed)return {step:0,answers:structuredClone(p.onboarding.completed.answers)};
  const answers=emptyAnswers();
  const sport=p.athlete?.sport;
  answers.basics=p.confirmed?{
    name:p.name,age:p.age,sex:p.sex,height:p.height,weight:p.weight,
    sport:sport==='boxing'||sport==='strength'?sport:undefined,goal:p.athlete?.goal,
    goalWeight:p.goal>p.weight?p.goal:undefined,
  }:{name:p.name==='Nuevo perfil'?undefined:p.name};
  answers.nutrition={mealCount:p.mealCount,schedule:p.athlete?.schedule};
  answers.food={preferences:p.preparation?.foodPreferences,allergies:p.allergens,intolerances:[],excluded:p.excluded,preferred:[]};
  const competition=p.preparation?.competition;
  const pending=p.athlete?.competitionWeight;
  if(competition){
    const timeZone=competition.timeZone??'Europe/Madrid';
    const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
    const clock=new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    const weighIn=new Date(competition.weighIn),fight=new Date(competition.fight);
    answers.competition={status:'confirmed',categoryStatus:'confirmed',category:competition.weight,timeZone,
      weighDate:dateFormat.format(weighIn),weighTime:clock.format(weighIn),fightDate:dateFormat.format(fight),fightTime:clock.format(fight)};
  }else if(pending?.mode==='target'){
    answers.competition={status:'possible',categoryStatus:'estimated',category:pending.weight,weighDate:pending.date};
  }
  if(answers.basics.sport==='strength')answers.competition={status:'none'};
  answers.availability={slots:[],restDays:[],coachPhysicalDays:[],mode:'auto'};
  answers.boxing={club:[]};
  return {step:0,answers};
}

function instant(date:string|undefined,time:string|undefined,timeZone:string){
  if(!date||!time)return;
  const format=new Intl.DateTimeFormat('sv-SE',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const local=date+'T'+time;
  const clock=Date.parse(local+'Z');
  let timestamp=clock;
  for(let pass=0;pass<3;pass++){
    const shown=format.format(new Date(timestamp)).replace(' ','T');
    if(shown===local)return new Date(timestamp).toISOString();
    timestamp+=clock-Date.parse(shown+'Z');
  }
  throw new Error('Revisa las horas del pesaje y el combate en la zona horaria indicada.');
}

function competitionFor(a:OnboardingAnswers,p:Profile):Competition|undefined{
  const c=a.competition;
  if(c.status!=='confirmed'||c.categoryStatus!=='confirmed'||c.category===undefined)return;
  const timeZone=c.timeZone??'Europe/Madrid';
  const weighIn=instant(c.weighDate,c.weighTime,timeZone),fight=instant(c.fightDate,c.fightTime,timeZone);
  if(!weighIn||!fight)return;
  const existing=p.preparation?.competition;
  return competitionSchema.parse({weight:c.category,weighIn,fight,timeZone,rounds:existing?.rounds,roundMinutes:existing?.roundMinutes,taper:existing?.taper??true,notes:existing?.notes??'',
    weighInResult:existing?.weighIn===weighIn&&existing.fight===fight?existing.weighInResult:undefined});
}

function trainingFor(a:OnboardingAnswers,competition?:Competition):TrainingConfig{
  const boxing=a.basics.sport==='boxing';
  const {slots=[],restDays=[],coachPhysicalDays=[],mode}=a.availability;
  const club=a.boxing.club??[];
  const sparringDays=club.filter(day=>day.kind==='sparring').map(day=>day.day);
  const technicalDays=club.filter(day=>day.kind!=='sparring').map(day=>day.day);
  const available=slots.filter(slot=>!restDays.includes(slot.day)&&(!boxing||!coachPhysicalDays.includes(slot.day)));
  const learning=a.strength.confidence!=='confident'||a.strength.frequency==='none'||a.strength.frequency==='occasional'||a.muscle.goal==='return';
  const level=learning?'beginner':'intermediate';
  const equipment=selectedEquipment(a.strength.equipment);
  const settings:TrainingConfig={
    ...defaultTrainingConfig(),sport:boxing?'boxing':'hypertrophy',level,intensity:learning?'gentle':a.strength.intensity,
    phase:a.recovery.state==='low'?'deload':'base',equipment:equipment.includes('gym')?'gym':equipment.includes('dumbbells')?'dumbbells':'bodyweight',
    days:available.map(slot=>slot.day),duration:45,sessionLimits:available.map(({day,minutes})=>({day,minutes})),
    technicalDays:boxing?technicalDays:[],sparringDays:boxing?sparringDays:[],
    limitation:a.recovery.limitation!=='none',competition,
    ...(boxing?{}:{musclePriority:a.muscle.priority,strengthGoal:a.muscle.goal}),
  };
  if(!boxing)return settings;
  const load=(day:number)=>Number(club.some(session=>session.day===day))*2+
    Number(sparringDays.includes((day+1)%7))*4+Number(sparringDays.includes(day))*6;
  const ranked=available.slice().sort((a,b)=>load(a.day)-load(b.day)||a.day-b.day);
  const runAvailable=a.running.effort!=='pain'&&!a.running.preferBike&&a.running.place!=='bike';
  const runMode=a.running.frequency==='none'||a.running.frequency==='occasional'||a.running.mode==='walk'||a.running.mode==='walkRun'||a.running.effort==='stop'
    ?'walk-run':a.boxing.experience==='compete'&&a.recovery.state==='ready'&&a.running.frequency==='often'&&a.running.effort==='easy'?'mixed':'easy';
  const guided=ranked.filter(slot=>!sparringDays.includes(slot.day));
  const physical=mode==='manual'?ranked.filter(slot=>slot.kind==='physical'):
    guided.slice(0,guided.length>2&&a.recovery.state==='ready'?2:1);
  const runCap=a.recovery.state==='low'?0:recommendBoxing(settings).conditioningDays;
  const running=runAvailable?(mode==='manual'?ranked.filter(slot=>slot.kind==='running'):
    guided.filter(slot=>!physical.some(day=>day.day===slot.day)).slice(0,runCap)):[];
  return {...settings,physicalDays:physical.map(slot=>slot.day),runningDays:running.map(slot=>slot.day),conditioningDays:running.length,conditioningMode:runMode};
}

export function prepareOnboarding(profile:Profile,answers:OnboardingAnswers,today:string):Profile{
  answers={...answers,strength:{...answers.strength,equipment:selectedEquipment(answers.strength.equipment)}};
  if(answers.basics.sport==='boxing'){
    const {goalWeight,success,...basics}=answers.basics;
    answers={...answers,basics:{...basics,goal:answers.competition.status==='confirmed'||answers.competition.status==='possible'?'competition':'performance'}};
  }
  for(let step=0;step<8;step++){
    const problem=stepProblem(answers,step);
    if(problem)throw new Error(problem);
  }
  const {basics,nutrition,food,competition:answersCompetition}=answers;
  const competition=competitionFor(answers,profile);
  const config=trainingFor(answers,competition);
  const active=planForDate(profile.workouts??{plans:[],logs:[]},today);
  const sessionTotal=answers.boxing.club?.reduce((n,day)=>n+day.minutes,0)??0;
  const savedClub=basics.sport==='boxing'?sessionTotal:0;
  const scheduled=new Set(config.sport==='boxing'?[...(config.physicalDays??[]),...(config.runningDays??[])]:config.days);
  const timeToTrain=config.limitation?0:(config.sessionLimits??[]).filter(slot=>scheduled.has(slot.day)).reduce((n,slot)=>n+slot.minutes,0);
  const activity=Math.min(2.2,activityFactors[basics.activity!]+(savedClub+timeToTrain>=180?.2:savedClub+timeToTrain>=60?.1:0));
  const athleteGoal=basics.goal==='unsure'||basics.goal==='competition'?'performance':basics.goal!;
  const category=answersCompetition.status==='none'||answersCompetition.categoryStatus==='pending'?undefined:answersCompetition.category;
  const level=answers.boxing.experience==='compete'&&basics.sport==='boxing'?'competitive':config.level==='beginner'?'beginner':'recreational';
  const next=saveProfileSetup({...profile,
    onboarding:{version:1,completed:{at:new Date().toISOString(),answers}},
    preparation:{...profile.preparation,competition,foodPreferences:food.preferences??profile.preparation?.foodPreferences},
  },{
    name:basics.name,age:basics.age,sex:basics.sex,height:basics.height,weight:basics.weight,
    goal:basics.goalWeight??basics.weight,activity,waterGoal:profile.waterGoal,
    health:profile.health,budget:food.budget===undefined?profile.budget:food.budget+' € / semana',
    allergens:[...new Set([...food.allergies!,...food.intolerances!])],excluded:food.excluded,
    mealCount:nutrition.mealCount,confirmed:true,
    athlete:{sport:basics.sport,level,goal:athleteGoal,schedule:nutrition.schedule,
      competitionWeight:category===undefined?{mode:'none'}:{mode:'target',weight:category,date:answersCompetition.weighDate}},
  },today);
  if(!active&&!config.limitation&&(config.days.length||config.technicalDays.length||config.sparringDays.length)){
    const routine={...generateTrainingPlan(config),month:today.slice(0,7)};
    if(allTrainingSessions(routine).some(day=>day.kind!=='rest')||config.technicalDays.length||config.sparringDays.length){
      next.workouts={...next.workouts,plans:[...(next.workouts?.plans??[]),routine].slice(-12),logs:next.workouts?.logs??[]};
    }
  }
  const lastPreviewDate=new Date(Date.parse(today+'T12:00:00Z')+6*86400000).toISOString().slice(0,10);
  const currentMonth=today.slice(0,7),nextMonth=lastPreviewDate.slice(0,7);
  if(next.workouts&&!active&&currentMonth!==nextMonth&&!planForDate(next.workouts,lastPreviewDate)){
    const first=planForDate(next.workouts,today);
    if(first)next.workouts={...next.workouts,plans:[...next.workouts.plans,{...first,id:crypto.randomUUID(),month:nextMonth}].slice(-12)};
  }
  const prepared=replanCompetition(next,today);
  stateSchema.parse({active:prepared.id,profiles:[prepared]});
  return prepared;
}

export const onboardingSportName=(answers:OnboardingAnswers)=>answers.basics.sport?choices.sport[answers.basics.sport]:'Elige deporte';
