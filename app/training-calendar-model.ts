import {competitionPhase} from './competition-phase.ts';
import {allTrainingSessions,boxingSchedule,defaultTrainingConfig,generateTrainingPlan,trainingPlanSchema,updateTrainingConfig,workoutKey,type TrainingConfig,type TrainingData,type TrainingPlan,type TrainingSession,type WorkoutDraft,type WorkoutLog} from './training-model.ts';

export const weekdayOf=(date:string)=>(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;
export function monthDates(month:string){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Mes no válido.');
  const [year,m]=month.split('-').map(Number);
  const count=new Date(Date.UTC(year,m,0)).getUTCDate();
  return Array.from({length:count},(_,i)=>month+'-'+String(i+1).padStart(2,'0'));
}
export function planForDate(data:TrainingData,date:string){
  const monthly=data.plans.filter(p=>p.month===date.slice(0,7)).at(-1);
  return monthly??(data.plans.some(p=>p.month)?undefined:data.plans.at(-1));
}
export function sessionsForDate(plan:TrainingPlan,date:string):TrainingSession[]{
  if(plan.month&&plan.month!==date.slice(0,7))return [];
  const override=plan.overrides?.find(o=>o.date===date);
  const sessions=override?override.sessions:allTrainingSessions(plan).filter(s=>s.day===weekdayOf(date)&&s.kind!=='rest');
  const c=plan.config.competition,phase=c?competitionPhase(c,date):undefined;
  if(!c?.taper||!phase?.active||phase.daysToFight>14)return sessions;
  if(phase.daysToFight<=2||phase.phase==='weigh-in'||phase.phase==='recovery')return [];
  const lastWeek=phase.daysToWeigh<=7,minutes=lastWeek?30:45,sets=lastWeek?2:3;
  // Absolute caps are idempotent, including manually edited days. Started/saved sessions are pinned separately.
  return sessions.map(s=>({...s,title:s.title.replace(/ · (Puesta a punto|Preparación de competición)$/,'')+' · Preparación de competición',minutes:Math.min(s.minutes,minutes),focus:lastWeek?'Activación corta de competición. Prioriza ejecución, recuperación y trabajo técnico acordado con tu entrenador.':'Puesta a punto: menos volumen, sin cargas nuevas ni trabajo al fallo.',exercises:s.exercises.slice(0,lastWeek?4:6).map(e=>({...e,sets:Math.min(e.sets,sets),effort:'RPE 5–6/10; cómodo, sin fatiga acumulada',...(e.block==='interval'?{dose:'60 s de trote cómodo',rest:'90 s caminando'}:{}),plannedKg:null}))}));
}
export function scheduleSignature(config:TrainingConfig){
  const split=config.sport==='boxing'?boxingSchedule(config):{physicalDays:config.days,runningDays:[]};
  return JSON.stringify({...split,technicalDays:config.technicalDays,sparringDays:config.sparringDays});
}
/** Move existing blocks without regenerating the athlete's exercise prescription. */
export function reschedulePlan(plan:TrainingPlan,selection:TrainingConfig,month:string):TrainingPlan{
  if(plan.config.sport!==selection.sport)throw new Error('Para cambiar de deporte, genera una propuesta nueva.');
  const config=updateTrainingConfig(plan.config,{days:selection.days,physicalDays:selection.physicalDays,runningDays:selection.runningDays,technicalDays:selection.technicalDays,sparringDays:selection.sparringDays,conditioningDays:selection.conditioningDays});
  const next={...generateTrainingPlan(config),month};
  const previous=allTrainingSessions(plan).filter(s=>s.kind!=='rest');
  const changedKinds=new Set<TrainingSession['kind']>();
  for(const kind of ['lift','conditioning'] as const){
    const old=previous.filter(s=>s.kind===kind),fresh=allTrainingSessions(next).filter(s=>s.kind===kind);
    if(JSON.stringify(old.map(s=>s.day))!==JSON.stringify(fresh.map(s=>s.day)))changedKinds.add(kind);
    for(const [i,s] of fresh.entries())if(old[i]){
      const moved={...structuredClone(old[i]),day:s.day,slot:s.slot};
      if(next.sessions[s.day].kind===kind)next.sessions[s.day]=moved;
      else next.extraSessions![next.extraSessions!.findIndex(e=>e.day===s.day)]=moved;
    }
  }
  const overrides=plan.month===month?(plan.overrides??[]).map(o=>({date:o.date,sessions:[...o.sessions.filter(s=>!changedKinds.has(s.kind)),...sessionsForDate(next,o.date).filter(s=>changedKinds.has(s.kind))]})):[];
  return trainingPlanSchema.parse({...next,overrides});
}
export function editCalendarDay(plan:TrainingPlan,month:string,date:string,sessions:TrainingSession[],scope:'date'|'weekday'){
  if(!monthDates(month).includes(date))throw new Error('La fecha no pertenece al mes.');
  const dates=scope==='date'?[date]:monthDates(month).filter(d=>weekdayOf(d)===weekdayOf(date));
  // Converting a legacy weekly plan creates a new monthly identity; old session keys remain valid.
  return trainingPlanSchema.parse({...plan,id:plan.month?plan.id:crypto.randomUUID(),month,overrides:[...(plan.overrides??[]).filter(o=>!dates.includes(o.date)),...dates.map(d=>({date:d,sessions:structuredClone(sessions).map(s=>({...s,day:weekdayOf(d)}))}))]});
}
export const sessionSlot=(session:TrainingSession)=>session.kind==='conditioning'?'running':'physical';
export function monthlyLoadWarnings(plan:TrainingPlan,month:string){
  const weeks=new Map<number,{physical:number;running:number;busy:number;overlap:boolean}>();
  const dates=monthDates(month),offset=weekdayOf(dates[0]);
  for(const [i,date] of dates.entries()){
    const key=Math.floor((i+offset)/7),week=weeks.get(key)??{physical:0,running:0,busy:0,overlap:false};
    const sessions=sessionsForDate(plan,date),wd=weekdayOf(date);
    const physical=sessions.some(s=>s.kind==='lift'),running=sessions.some(s=>s.kind==='conditioning');
    week.physical+=Number(physical);week.running+=Number(running);week.busy+=Number(physical||running||plan.config.technicalDays.includes(wd)||plan.config.sparringDays.includes(wd));week.overlap||=physical&&running;weeks.set(key,week);
  }
  const values=[...weeks.values()],warnings:string[]=[];
  if(values.some(w=>w.physical>3))warnings.push('Hay semanas con más de tres días de físico. Revisa volumen, intensidad y recuperación antes de añadir carga. Puedes mantenerlos.');
  if(values.some(w=>w.running>2))warnings.push('Hay semanas con más de dos días de carrera. Acumular tantas sesiones por series no es lo recomendable por carga y desgaste; ajusta la intensidad. Tu selección se permite.');
  if(values.some(w=>w.busy===7))warnings.push('Hay semanas sin un día libre de entrenamiento. No es lo recomendable por fatiga y desgaste. Puedes guardar el calendario, pero conviene revisar la recuperación.');
  if(values.some(w=>w.overlap))warnings.push('Físico y carrera coinciden en algunas fechas. Son sesiones independientes; considera también el trabajo de boxeo al valorar la carga total.');
  return warnings;
}
type DailySession={plan:TrainingPlan;session:TrainingSession;key:string;draft?:WorkoutDraft;saved?:WorkoutLog;pinned:boolean};
/** A date/slot has one execution. Keep its prescription even when the calendar changes. */
export function dailySessions(data:TrainingData,date:string):DailySession[]{
  const plan=planForDate(data,date);
  const chosen=new Map<string,DailySession>();
  if(plan)for(const session of sessionsForDate(plan,date))chosen.set(sessionSlot(session),{plan,session,key:workoutKey(plan.id,session,date),pinned:false});
  const context=(planId:string,session:TrainingSession,sport?:'boxing'|'hypertrophy'):TrainingPlan=>data.plans.find(p=>p.id===planId)??{id:planId,created:date+'T12:00:00Z',config:{...defaultTrainingConfig(),sport:sport??'boxing'},sessions:Array.from({length:7},(_,day)=>({...session,day,kind:'rest',minutes:0,exercises:[]})),warnings:[]};
  for(const saved of data.logs.filter(l=>l.date===date)){
    const original=data.plans.find(p=>p.id===saved.planId);
    const session=saved.session??(original?allTrainingSessions(original).find(s=>workoutKey(original.id,s,date)===saved.id):undefined);
    if(session)chosen.set(sessionSlot(session),{plan:context(saved.planId,session,saved.sport),session,key:saved.id,saved,pinned:true});
  }
  for(const draft of data.drafts??[]){
    const original=data.plans.find(p=>p.id===(draft.planId??draft.id.split(':')[0]));
    const session=draft.session??(original?allTrainingSessions(original).find(s=>workoutKey(original.id,s,date)===draft.id):undefined);
    if(!session||!(draft.date===date||original&&workoutKey(original.id,session,date)===draft.id))continue;
    if(!Object.values(draft.checked).some(a=>a.length)&&!draft.elapsedMs&&draft.runningSince===null&&draft.rpe===null)continue;
    const planId=draft.planId??original?.id;if(!planId)continue;
    chosen.set(sessionSlot(session),{plan:context(planId,session),session,key:draft.id,draft,saved:data.logs.find(l=>l.id===draft.id),pinned:true});
  }
  return [...chosen.values()].sort((a,b)=>sessionSlot(a.session).localeCompare(sessionSlot(b.session)));
}

/** The coming seven dates use the same overrides and pinned sessions as the daily view. */
export function upcomingTrainingWeek(data:TrainingData,date:string){
  const start=Date.parse(date+'T12:00:00Z');
  return Array.from({length:7},(_,index)=>{
    const date=new Date(start+index*86400000).toISOString().slice(0,10);
    const plan=planForDate(data,date),day=weekdayOf(date);
    const club=plan?.config.sparringDays.includes(day)?'Sparring':plan?.config.technicalDays.includes(day)?'Boxeo técnico':undefined;
    return {date,day,planned:!!plan,club,sessions:dailySessions(data,date)};
  });
}
