import {z} from 'zod';
import type {Profile} from './model.ts';
import {dailySessions} from './training-calendar-model.ts';
import {trainingPlanSchema} from './training-model.ts';

const date=z.string().date();
export const strategyVersionSchema=z.object({
 date,trainingDates:z.array(date).max(7),training:z.array(trainingPlanSchema).max(12).optional(),trainingAfter:z.string().optional(),
 food:z.array(z.object({date,target:z.object({k:z.number(),p:z.number(),c:z.number(),f:z.number()}),after:z.string()})).max(7),
 menuId:z.string().max(100).optional(),energyBefore:z.number().optional(),energyAfter:z.number().optional(),
}).strict();
export type StrategyVersion=z.infer<typeof strategyVersionSchema>;
export function versionStamp(value:unknown){
 const json=JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 let hash=2166136261;
 for(const ch of json??'')hash=Math.imul(hash^ch.charCodeAt(0),16777619);
 return (hash>>>0).toString(36);
}
export function undoStrategy(p:Profile,today:string):Profile{
 const v=p.strategyVersion;
 if(!v)throw new Error('No hay una revisión para deshacer.');
 const workouts=p.workouts??{plans:[],logs:[]};
 if(v.training&&versionStamp(workouts.plans)!==v.trainingAfter||v.trainingDates.some(date=>date<today||dailySessions(workouts,date).some(x=>x.pinned)))throw new Error('El calendario cambió o ya hay una sesión iniciada.');
 if(v.menuId&&(p.plans.at(-1)?.id!==v.menuId||p.preparation?.energyTarget!==v.energyAfter))throw new Error('El menú o su objetivo ya han cambiado.');
 const days={...p.days};
 for(const entry of v.food){
  const day=days[entry.date];
  if(entry.date<today||!day||day.items.length||day.foodPlan?.records.length||day.nutrition||day.complete||versionStamp(day.foodPlan)!==entry.after)throw new Error('Hay comidas editadas o registradas que se deben conservar.');
  days[entry.date]={...day,foodPlan:undefined,target:entry.target};
 }
 const coach=p.preparation?.coach;
 return {...p,strategyVersion:undefined,days,plans:v.menuId?p.plans.filter(x=>x.id!==v.menuId):p.plans,
  workouts:v.training?{...workouts,plans:v.training}:p.workouts,
  preparation:{...p.preparation,...(v.menuId?{energyTarget:v.energyBefore}:{}),coach:coach?{...coach,events:[...coach.events,{date:today,at:new Date().toISOString(),before:0,after:0,reason:'Revisión semanal deshecha.',strategy:true}].slice(-30)}:undefined},
 };
}
