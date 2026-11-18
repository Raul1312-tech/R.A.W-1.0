import {z} from 'zod';
import {nutritionForDate} from './client-followup.ts';
import {monthDates,weekdayOf,dailySessions,planForDate,sessionsForDate,clubForDate} from '../app/training-calendar-model.ts';
import {trainingPlanSchema,type TrainingPlan} from '../app/training-model.ts';
import {foodAllowed} from '../app/preparation-engine.ts';
import {foodSnapshot} from '../app/daily-food-model.ts';
import {replanCompetition} from '../app/competition-plan.ts';
import {mealSlots} from '../app/meal-layout.ts';
import type {Profile,State} from '../app/model.ts';
const date=z.string().date(),month=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const num=(min:number,max:number)=>z.number().finite().min(min).max(max);
const food=z.object({id:z.string().min(1).max(100),name:z.string().min(1).max(120),unit:z.string().max(120),k:num(0,10000),p:num(0,1000),c:num(0,2000),f:num(0,1000),allergens:z.array(z.string().max(60)).max(20),group:z.string().max(60).optional()}).strict();
export const plannedMealSchema=z.object({name:z.string().trim().min(1).max(150),prep:z.string().max(1000).optional(),items:z.array(z.object({food,grams:num(.1,3000)}).strict()).min(1).max(20)}).strict();
export const clientPlanCommand=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('meal'),date,slot:z.number().int().min(0).max(5),scope:z.enum(['date','weekday','month']),meal:plannedMealSchema,autoAdjust:z.boolean()}).strict(),
 z.object({kind:z.literal('publish-nutrition'),month}).strict(),
 z.object({kind:z.literal('training'),month,plan:trainingPlanSchema}).strict()
]);
export type ClientPlanCommand=z.infer<typeof clientPlanCommand>;
export type PlanChange={kind:ClientPlanCommand['kind'];month:string;dates:string[];protectedDates:string[];message:string};
export function monthFollowup(profile:Profile,month:string,today:string){
 const dates=monthDates(month);let prepared=replanCompetition(profile,today);if(dates[0]>today)prepared=replanCompetition(prepared,dates[0]);
 return dates.map(date=>{
  const source=date<today?profile:prepared;
  const nutrition=nutritionForDate(profile,date,today,source),sessions=dailySessions(source.workouts??{plans:[],logs:[]},date),plan=planForDate(source.workouts??{plans:[],logs:[]},date);
  return {date,nutrition,sessions,club:clubForDate(plan,date),foodSaved:!!profile.days[date]?.foodPlan,trainingSaved:!!plan,lockedTraining:date<today||sessions.some(s=>s.pinned)||!!profile.preparation?.clubRecords?.[date]};
 });
}
export function applyClientPlanCommand(state:State,profileId:string,input:unknown,today:string):{state:State;change:PlanChange}{
 const command=clientPlanCommand.parse(input),profile=state.profiles.find(p=>p.id===profileId);
 if(!profile?.confirmed)throw Error('El deportista debe confirmar primero su perfil.');
 const month=command.kind==='meal'?command.date.slice(0,7):command.month;
 const dates=monthDates(month);
 if(dates.at(-1)!<today)throw Error('Los meses pasados son de consulta. Elige una fecha pendiente.');
 let next=structuredClone(profile);const changed:string[]=[],protectedDates:string[]=[];
 if(command.kind==='meal'){
  if(command.date<today)throw Error('Las comidas de fechas pasadas se conservan.');
  if(command.meal.items.some(it=>!foodAllowed(profile,it.food)))throw Error('La comida incluye un alimento excluido o un alérgeno declarado del deportista.');
  const source=nutritionForDate(profile,command.date,today);
  if(!source.meals[command.slot])throw Error('Esta comida no existe en la fecha elegida.');
  const identity=mealSlots(source.meals.length)[command.slot];
  const selected=dates.filter(d=>d>=command.date&&(command.scope==='month'||command.scope==='weekday'&&weekdayOf(d)===weekdayOf(command.date)||d===command.date));
  for(const d of selected){
   const view=nutritionForDate(profile,d,today),slot=mealSlots(view.meals.length).indexOf(identity);
   if(view.day.complete||slot<0||!view.meals.length||view.meals[slot]?.status!=='pending'){protectedDates.push(d);continue}
   const snapshot=view.snapshot;
   // nutritionForDate may produce a weekly view without materializing a snapshot.
   const effective=snapshot??{planId:'admin-'+month,labels:view.meals.map(m=>m.label==='Desayuno'?'Primera comida':m.label==='Almuerzo'?'Tentempié':m.label),meals:view.meals.map(m=>({name:m.name,items:m.items,prep:m.prep})),records:[],autoAdjust:false};
   next.days[d]={...view.day,foodPlan:{...effective,autoAdjust:command.autoAdjust,meals:effective.meals.map((m,i)=>i===slot?structuredClone(command.meal):m)}};
   changed.push(d);
  }
 }else if(command.kind==='publish-nutrition'){
  for(const d of dates){
   if(d<today||profile.days[d]?.complete||profile.days[d]?.foodPlan){protectedDates.push(d);continue}
   const view=nutritionForDate(profile,d,today);
   if(!view.meals.length){protectedDates.push(d);continue}
   const snapshot=view.snapshot??{planId:'admin-'+month,labels:view.meals.map(m=>m.label==='Desayuno'?'Primera comida':m.label==='Almuerzo'?'Tentempié':m.label),meals:view.meals.map(m=>({name:m.name,items:m.items,prep:m.prep})),records:[],autoAdjust:false};
   next.days[d]={...view.day,foodPlan:{...snapshot,autoAdjust:false}};changed.push(d);
  }
 }else{
  const discipline=profile.athlete?.sport==='boxing'?'boxing':profile.athlete?.sport==='strength'?'hypertrophy':command.plan.config.sport;
  if(command.plan.config.sport!==discipline)throw Error('La rutina debe corresponder al deporte del perfil.');
  const old=planForDate(profile.workouts??{plans:[],logs:[]},month+'-01');
  let plan:TrainingPlan={...structuredClone(command.plan),id:crypto.randomUUID(),created:new Date().toISOString(),month,config:{...command.plan.config,competition:discipline==='boxing'?profile.preparation?.competition:undefined}};
  const overrides=new Map((plan.overrides??[]).map(o=>[o.date,o]));
  const clubOverrides={...plan.clubOverrides};
  for(const d of dates){
   const locked=d<today||dailySessions(profile.workouts??{plans:[],logs:[]},d).some(s=>s.pinned)||!!profile.preparation?.clubRecords?.[d];
   if(locked){
    const previous=old?sessionsForDate(old,d):[];
    overrides.set(d,{date:d,source:'manual',sessions:structuredClone(previous)});
    clubOverrides[d]=old?clubForDate(old,d)??'none':'none';protectedDates.push(d);
   }else if(!old||JSON.stringify(old?sessionsForDate(old,d):[])!==JSON.stringify(sessionsForDate(plan,d))||clubForDate(old,d)!==clubForDate(plan,d))changed.push(d);
  }
  plan=trainingPlanSchema.parse({...plan,overrides:[...overrides.values()].sort((a,b)=>a.date.localeCompare(b.date)),clubOverrides});
  next.workouts={...profile.workouts,plans:[...(profile.workouts?.plans??[]),plan].slice(-12),logs:profile.workouts?.logs??[]};
 }
 if(!changed.length)throw Error('No hay fechas pendientes que se puedan modificar con esta propuesta.');
 // Keep the active profile, completed records and every other athlete in this account.
 return {state:{...state,profiles:state.profiles.map(p=>p.id===profileId?next:p)},change:{kind:command.kind,month,dates:changed,protectedDates,message:command.kind==='meal'?'Comida prevista actualizada':command.kind==='training'?'Rutina mensual actualizada':'Dieta mensual guardada'}};
}

/** Preserve legacy fields that the current UI does not interpret; replace prescriptions only. */
export function mergeStoredClientPlan(stored:State,planned:State,profileId:string,change:PlanChange):State{
 const proposal=planned.profiles.find(p=>p.id===profileId)!;
 return {...stored,profiles:stored.profiles.map(p=>{
  if(p.id!==profileId)return p;
  if(change.kind==='training')return {...p,workouts:{...p.workouts,plans:[...(p.workouts?.plans??[]).slice(-11),proposal.workouts!.plans.at(-1)!],logs:p.workouts?.logs??[]}};
  const days={...p.days};
  for(const date of change.dates){
   const next=proposal.days[date],before=p.days[date];
   if(!before){days[date]=next;continue}
   const foodPlan=next.foodPlan&&{...next.foodPlan,records:before.foodPlan?.records??next.foodPlan.records,labels:before.foodPlan?.records.length?before.foodPlan.labels:next.foodPlan.labels,meals:next.foodPlan.meals.map((m,i)=>before.foodPlan?.records.some(r=>r.slot===i)?before.foodPlan.meals[i]:m)};
   days[date]={...before,foodPlan,target:next.target,nutrition:next.nutrition,competition:next.competition,supplementForecast:next.supplementForecast};
  }
  return {...p,days};
 })};
}
