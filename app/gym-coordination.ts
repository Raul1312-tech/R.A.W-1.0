import type {Profile} from './model.ts';
import type {TrainingData} from './training-model.ts';
import {dailySessions} from './training-calendar-model.ts';
import {daySettings} from './preparation-engine.ts';
import {previewNutritionSituation} from './nutrition-situations-model.ts';

/** Refresh automatic pending menus only; explicit diets and actual records remain authoritative. */
export function coordinateGymWorkouts(profile:Profile,workouts:TrainingData,today:string):Profile{
 let next:Profile={...profile,workouts,days:{...profile.days}};
 const previous=profile.workouts??{plans:[],logs:[]};
 const signature=(data:TrainingData,date:string)=>JSON.stringify(dailySessions(data,date).map(s=>[s.session.kind,s.session.minutes]));
 const changedWeeks=new Set<string>();
 for(const date of Object.keys(profile.days)){
  const monday=new Date(date+'T12:00:00Z');monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
  const key=monday.toISOString().slice(0,10);
  for(let i=0;i<7;i++){
   const dt=new Date(monday.getTime()+i*86400000).toISOString().slice(0,10);
   if(signature(previous,dt)!==signature(workouts,dt)){changedWeeks.add(key);break;}
  }
 }
 for(const [date,old] of Object.entries(profile.days)){
  if(date<today||old.complete||old.competition)continue;
  const monday=new Date(date+'T12:00:00Z');monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
  if(!changedWeeks.has(monday.toISOString().slice(0,10)))continue;
  if(profile.preparation?.monthlyMenus?.some(m=>m.month===date.slice(0,7)))continue;
  if(old.nutrition?.situationId!=='coordinated')continue;
  const {situationId,energyTarget,...settings}=old.nutrition;
  // Preserves recorded meals and manually entered food through the existing reconciler.
  next.days[date]=previewNutritionSituation(next,{...daySettings(next,date),...settings,id:situationId},date,profile.plans.at(-1)?.seed??0);
 }
 return next;
}
