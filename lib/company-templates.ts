import {z} from 'zod';
import {trainingConfigSchema,trainingPlanSchema,generateTrainingPlan} from '../app/training-model.ts';
import {saveProfileSetup} from '../app/profile-setup-model.ts';
import {monthDates,sessionsForDate,planForDate} from '../app/training-calendar-model.ts';
import type {Profile,State} from '../app/model.ts';
export const nutritionTemplateSchema=z.object({mealCount:z.number().int().min(3).max(6),schedule:z.enum(['regular','early','late','variable'])}).strict();
export const templateInput=z.discriminatedUnion('kind',[
 z.object({organization_id:z.string().uuid(),title:z.string().trim().min(1).max(100),kind:z.literal('nutrition'),payload:nutritionTemplateSchema}).strict(),
 z.object({organization_id:z.string().uuid(),title:z.string().trim().min(1).max(100),kind:z.literal('training'),payload:trainingPlanSchema}).strict()
]);
export type CompanyTemplate={id:string;organization_id:string;title:string;created_at:string}&({kind:'nutrition';payload:z.infer<typeof nutritionTemplateSchema>}|{kind:'training';payload:z.infer<typeof trainingPlanSchema>});
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
