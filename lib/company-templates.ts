import {z} from 'zod';
import {allTrainingSessions,trainingPlanSchema} from '../app/training-model.ts';
import {saveProfileSetup} from '../app/profile-setup-model.ts';
import {monthDates,sessionsForDate,planForDate,clubForDate} from '../app/training-calendar-model.ts';
import type {Profile,State} from '../app/model.ts';
export const nutritionTemplateSchema=z.object({mealCount:z.number().int().min(3).max(6),schedule:z.enum(['regular','early','late','variable'])}).strict();
export const templateInput=z.discriminatedUnion('kind',[
 z.object({organization_id:z.string().uuid(),title:z.string().trim().min(1).max(100),kind:z.literal('nutrition'),payload:nutritionTemplateSchema}).strict(),
 z.object({organization_id:z.string().uuid(),title:z.string().trim().min(1).max(100),kind:z.literal('training'),payload:trainingPlanSchema}).strict()
]);
export type CompanyTemplate={id:string;organization_id:string;title:string;created_at:string}&({kind:'nutrition';payload:z.infer<typeof nutritionTemplateSchema>}|{kind:'training';payload:z.infer<typeof trainingPlanSchema>});
/** A company template contains prescriptions only, with no dated competition or client history. */
export function normalizeTrainingTemplate(input:unknown,referenceDate:string){
 const parsed=trainingPlanSchema.parse(input);
 if(!z.string().date().safeParse(referenceDate).success)throw Error('Selecciona una fecha válida para la semana de referencia.');
 if(parsed.month&&parsed.month!==referenceDate.slice(0,7))throw Error('Elige una semana del mes del borrador.');
 const clean={...parsed,config:{...parsed.config,competition:undefined}};
 const start=new Date(referenceDate+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);
 const dates=Array.from({length:7},(_,day)=>new Date(start.valueOf()+day*86400000).toISOString().slice(0,10));
 const base=allTrainingSessions(clean);
 const week=dates.map((date,day)=>clean.month&&!date.startsWith(clean.month)?base.filter(s=>s.day===day&&s.kind!=='rest'):sessionsForDate(clean,date));
 const sessions=week.map((list,day)=>list.find(s=>s.kind==='lift')??list[0]??{day,title:'Descanso',kind:'rest',minutes:0,focus:'',warmup:'',exercises:[]});
 const technicalDays=dates.flatMap((date,day)=>clubForDate(clean,date)==='technique'?[day]:[]),sparringDays=dates.flatMap((date,day)=>clubForDate(clean,date)==='sparring'?[day]:[]);
 if(!week.some(day=>day.length)&&!technicalDays.length&&!sparringDays.length)throw Error('Añade al menos una sesión antes de guardar la plantilla.');
 const physicalDays=week.flatMap((list,day)=>list.some(s=>s.kind==='lift')?[day]:[]),runningDays=week.flatMap((list,day)=>list.some(s=>s.kind==='conditioning')?[day]:[]);
 const config={...clean.config,exerciseRotation:'fixed' as const,days:week.flatMap((list,day)=>list.length?[day]:[]),physicalDays,runningDays,conditioningDays:runningDays.length,technicalDays,sparringDays};
 return trainingPlanSchema.parse({...clean,config,id:crypto.randomUUID(),created:new Date().toISOString(),month:undefined,overrides:undefined,clubOverrides:undefined,sessions,extraSessions:week.flatMap(list=>list.some(s=>s.kind==='lift')?list.filter(s=>s.kind==='conditioning'):[])});
}
export function templateSummary(template:CompanyTemplate){
 if(template.kind==='nutrition')return {sessions:0,exercises:0,minutes:0};
 const rows=allTrainingSessions(template.payload).filter(s=>s.kind!=='rest');
 return {sessions:rows.length,exercises:rows.reduce((n,s)=>n+s.exercises.length,0),minutes:rows.reduce((n,s)=>n+s.minutes,0)};
}
export function applyCompanyTemplate(state:State,profileId:string,template:CompanyTemplate,today:string):State{
 const p=state.profiles.find(p=>p.id===profileId);if(!p||!p.confirmed)throw Error('El usuario debe completar primero su perfil.');
 let next:Profile;
 if(template.kind==='nutrition'){
  const plan=nutritionTemplateSchema.parse(template.payload);
  if(!p.athlete)throw Error('Completa el perfil deportivo antes de aplicar este reparto.');
  next=saveProfileSetup(p,{...p,mealCount:plan.mealCount,athlete:{...p.athlete,schedule:plan.schedule}},today);
 }else{
  const source=trainingPlanSchema.parse(template.payload),config=source.config;
  if(p.onboarding?.completed?.answers.recovery.limitation&&p.onboarding.completed.answers.recovery.limitation!=='none')throw Error('Hay una limitación declarada. Revisa el plan individual antes de asignar una plantilla.');
  if(p.preparation?.competition)throw Error('Hay una competición planificada. Ajusta su calendario individual antes de usar una plantilla general.');
  const old=planForDate(p.workouts??{plans:[],logs:[]},today),month=today.slice(0,7);
  const generated={...structuredClone(source),id:crypto.randomUUID(),created:new Date().toISOString(),month,config:{...config,technicalDays:old?.config.technicalDays??config.technicalDays,sparringDays:old?.config.sparringDays??config.sparringDays},clubOverrides:old?.clubOverrides,
   overrides:old?monthDates(month).filter(d=>d<today).map(date=>({date,sessions:structuredClone(sessionsForDate(old,date))})):[]};
  next={...p,workouts:{...p.workouts,plans:[...(p.workouts?.plans??[]),generated].slice(-12),logs:p.workouts?.logs??[]}};
 }
 return {...state,profiles:state.profiles.map(p=>p.id===profileId?next:p)};
}
