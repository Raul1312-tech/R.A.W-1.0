import {targets,weekdays,type Profile,type Day,type Plan} from './model.ts';
import {competitionPhase,competitionStatus} from './competition-phase.ts';
import {previewNutritionSituation,hasNutritionRecords} from './nutrition-situations-model.ts';
import {situationEnergy} from './nutrition-estimates.ts';
import {mealTimes,mealSlots} from './meal-layout.ts';
import {foodDayView} from './daily-food-model.ts';
import {outsideMealEstimate} from './nutrition-estimates.ts';
const shift=(date:string,n:number)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const stamp=(input:unknown)=>{let h=2166136261;for(const char of JSON.stringify(input))h=Math.imul(h^char.charCodeAt(0),16777619);return (h>>>0).toString(36)};

/** Competition takes precedence over ordinary pending plans. Actual records remain immutable. */
export function replanCompetition(p:Profile,today:string):Profile{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(today))return p;
 const c=p.preparation?.competition,days={...p.days};let changed=false;
 for(const [dt,d] of Object.entries(days))if(dt>=today&&d.competition&&(!c||!competitionPhase(c,dt).active)&&!hasNutritionRecords(d)){
  days[dt]={...d,foodPlan:undefined,nutrition:undefined,competition:undefined,target:targets(p)};changed=true;
 }
 const workouts=p.workouts&&{...p.workouts,plans:p.workouts.plans.map(plan=>JSON.stringify(plan.config.competition)===JSON.stringify(c)?plan:{...plan,config:{...plan.config,competition:c}})};
 if(workouts&&workouts.plans.some((plan,i)=>plan!==p.workouts!.plans[i]))changed=true;
 if(!c||!p.confirmed)return changed?{...p,days,workouts}:p;
 const current=competitionStatus(p,today)!;
 if(!current.active)return changed?{...p,days,workouts}:p;
 // Stop an ordinary mass-gain surplus while a lower competition category is the active objective.
 // Acute dehydration and last-minute deficits are never inferred from the gap to the category.
 const source:Profile={...p,surplus:c.weight<p.weight?0:p.surplus,workouts};
 const baseKey=stamp({c,weight:current.weight,profileWeight:p.weight,schedule:p.athlete?.schedule,age:p.age,height:p.height,sex:p.sex,activity:p.activity,surplus:source.surplus,energy:p.preparation?.energyTarget,allergens:p.allergens,excluded:p.excluded,count:p.mealCount,supplements:p.preparation?.supplements,seed:p.plans.at(-1)?.seed});
 const cache=new Map<string,Plan|null>();
 for(let offset=0;offset<90;offset++){
  const date=shift(today,offset),phase=competitionPhase(c,date);if(!phase.active)break;
  const old=days[date];if(old?.complete)continue;
  const training=phase.daysToFight<=2||phase.phase==='weigh-in'||phase.phase==='recovery'?'rest' as const:'usual' as const;
  const target=situationEnergy(source,{training},date).target;
  const key=baseKey+':'+phase.phase+':'+target.k;
  if(old?.competition?.key===key&&old.target.k===target.k&&old.nutrition?.situationId.startsWith('competition-'))continue;
  const count=p.mealCount??5;
  const supplements=(p.preparation?.supplements??[]).map(s=>({id:s.id,amount:s.amount,timing:s.timing}));
  try{
   const prepared=previewNutritionSituation({...source,days,preparation:{...source.preparation,energyTarget:target.k}},
    {id:'competition-'+phase.phase,name:phase.label+' · competición',mealCount:count,times:old?.nutrition?.mealCount===count?old.nutrition.times:mealTimes(count,p.athlete?.schedule??'regular'),training,supplements,outsideMeals:old?.nutrition?.outsideMeals?.filter(x=>mealSlots(count).includes(x.slot))},date,(p.plans.at(-1)?.seed??0)+1,cache);
   days[date]={...prepared,competition:{key,phase:phase.phase,review:current.gap>0}};
  }catch{
   const fallback=old??{items:[],water:0,weight:null,steps:null,minutes:0,training:'',sleep:null,notes:'',complete:false,target};
   days[date]={...fallback,competition:{key,phase:phase.phase,review:true,error:'No se ha podido construir una dieta compatible. Revisa las restricciones con tu equipo.'}};
  }
  changed=true;
 }
 return changed?{...p,days,workouts}:p;
}
export function competitionWeek(p:Profile,date:string):{plan:Plan;dates:string[]}|undefined{
 const c=p.preparation?.competition;if(!c||!date||!competitionPhase(c,date).active)return;
 const weekday=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7,monday=shift(date,-weekday),dates=Array.from({length:7},(_,i)=>shift(monday,i));
 const reference=p.plans.at(-1);if(!reference)return;
 const week=dates.map((dt,i)=>{
  const day=p.days[dt],view=day?.foodPlan?foodDayView(day,reference,dt):undefined;
  if(!view)return {day:weekdays[i],meals:reference.week?.[i].meals??reference.meals};
  const estimates:Record<number,Plan['target']>={};
  const meals=view.meals.map((meal,slot)=>{
   const record=view.snapshot.records.find(r=>r.slot===slot);
   if(record)return {...meal,name:record.status==='skipped'?'No realizada':record.status==='alternative'?'Tu comida registrada':meal.name,items:day.items.filter(it=>record.itemIds.includes(it.id))};
   const estimate=!meal.items.length?outsideMealEstimate(day,slot):undefined;if(estimate)estimates[slot]=estimate;
   return meal;
  });
  return {day:weekdays[i],meals,estimates};
 });
 // A historical day's saved count can differ; the UI accepts dated rows without persisting this view as a plan.
 return {dates,plan:{id:'competition-week-'+monday,created:date+'T12:00:00Z',seed:reference.seed,target:p.days[date]?.target??reference.target,meals:week[0].meals,week}};
}
