import {dateKey,emptyDay,foodById,generatePlan,type Day,type Food,type Plan,type Profile} from './model.ts';
import {foodSnapshot} from './daily-food-model.ts';
import {mealSlots,mealTimes} from './meal-layout.ts';
import {previewNutritionSituation} from './nutrition-situations-model.ts';
import {clubForDate,dailySessions,editCalendarDay,planForDate} from './training-calendar-model.ts';
import {baseConditioning,type TrainingPlan} from './training-model.ts';
import {foodPreferenceIds,foodPreferencesSchema,type FoodPreferences,type Readiness} from './preparation-preferences.ts';
import type {Supplement} from './preparation-schema.ts';
import {situationEnergy} from './nutrition-estimates.ts';
import {competitionPhase} from './competition-phase.ts';

export const addDays=(date:string,n:number)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
export const foodAllowed=(p:Profile,f:Food)=>!p.excluded.includes(f.id)&&p.preparation?.foodPreferences?.foods[f.id]!=='avoid'&&!f.allergens.some(a=>p.allergens.includes(a));
export function saveFoodPreferences(p:Profile,foodPreferences:FoodPreferences):Profile{
 foodPreferences=foodPreferencesSchema.parse(foodPreferences);
 let next={...p,preparation:{...p.preparation,foodPreferences}};
 const previous=p.plans.at(-1);
 const plan=p.confirmed?generatePlan(next,(previous?.seed??0)%100000+1):null;
 if(p.confirmed&&!plan)throw new Error('No hemos encontrado un menú compatible. Revisa los alimentos marcados como evitar.');
 next={...next,plans:plan?[...p.plans,plan].slice(-36):p.plans};
 if(plan){
  next={...next,days:{...next.days}};
  for(const [date,day] of Object.entries(p.days)){
   if(date<dateKey()||day.complete||day.competition||p.preparation?.monthlyMenus?.some(m=>m.month===date.slice(0,7)))continue;
   if(day.nutrition?.situationId==='coordinated')next.days[date]=previewNutritionSituation(next,{...daySettings(next,date),...day.nutrition,id:'coordinated'},date,plan.seed);
  }
 }
 return next;
}
export function supplementChoices(p:Profile,date:string){
 const active=situationEnergy(p,{training:p.days[date]?.nutrition?.training??'usual'},date).minutes>0;
 return (p.preparation?.supplements??[]).filter(s=>(s.kind!=='sportsDrink'||active)&&!s.allergens.some(a=>p.allergens.includes(a))&&p.preparation?.supplementFeedback?.[date]?.[s.id]===undefined).map(({id,amount,timing})=>({id,amount,timing}));
}
export function daySettings(p:Profile,date:string){
 const mealCount=p.mealCount??5;
 const schedule=p.athlete?.schedule;
 const weekend=[0,6].includes(new Date(date+'T12:00:00Z').getUTCDay());
 return {id:'coordinated',name:'Alimentación según tu carga',mealCount,
  times:mealTimes(mealCount,(!schedule||schedule==='variable')&&weekend?'weekend':schedule??'regular',p.onboarding?.completed?.answers.nutrition),
  training:'usual' as const,supplements:supplementChoices(p,date)};
}
export function savePlannedSupplement(p:Profile,s:Supplement,date:string):Profile{
 const next={...p,preparation:{...p.preparation,supplements:[...(p.preparation?.supplements??[]),s]}};
 const old=p.days[date],nutrition=old?.nutrition;
 if(!old||old.complete||old.competition||!old.foodPlan||nutrition&&nutrition.situationId!=='coordinated'&&!nutrition.situationId.startsWith('quick-'))return next;
 const base=daySettings(next,date),count=old.foodPlan.meals.length;
 const day=previewNutritionSituation(next,{...base,...nutrition,id:nutrition?.situationId??base.id,mealCount:count,
  times:nutrition?.times??mealTimes(count,p.athlete?.schedule??'regular',p.onboarding?.completed?.answers.nutrition),
  supplements:[...(nutrition?.supplements??base.supplements.filter(x=>x.id!==s.id)),...base.supplements.filter(x=>x.id===s.id)],
 },date,p.plans.at(-1)?.seed??0);
 return {...next,days:{...next.days,[date]:day}};
}
export function withCoordinatedDay(p:Profile,date:string,sourcePlan?:Plan):Profile{
 const old=p.days[date];
 const fixed=p.preparation?.monthlyMenus?.some(m=>m.month===date.slice(0,7));
 const training=planForDate(p.workouts??{plans:[],logs:[]},date);
 if(!p.confirmed||!sourcePlan||fixed||old?.competition||old?.complete||old?.nutrition||old?.foodPlan||!training&&!p.preparation?.supplements?.length)return p;
 try{
  const day=previewNutritionSituation(p,daySettings(p,date),date,sourcePlan.seed);
  return {...p,days:{...p.days,[date]:day}};
 }catch{return p}
}
export function alternatives(p:Profile,f:Food){
 const ids=Object.values(foodPreferenceIds).find(ids=>(ids as readonly string[]).includes(f.id));
 const rank=(food:Food)=>p.preparation?.foodPreferences?.foods[food.id]==='usual'?0:p.preparation?.foodPreferences?.foods[food.id]==='like'?1:2;
 return ids?.filter(id=>id!==f.id).map(foodById).filter(food=>foodAllowed(p,food)).sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name,'es'))??[];
}
export function swapPendingIngredient(p:Profile,day:Day,plan:Plan|undefined,date:string,slot:number,index:number,id:string):Day{
 const snapshot=foodSnapshot(day,plan,date),meal=snapshot?.meals[slot],from=meal?.items[index];
 if(!snapshot||!meal||!from||snapshot.records.some(r=>r.slot===slot))throw new Error('Solo puedes cambiar ingredientes pendientes.');
 const to=alternatives(p,from.food).find(f=>f.id===id);
 if(!to)throw new Error('Elige un alimento compatible del mismo grupo.');
 const metric=(foodPreferenceIds.carbs as readonly string[]).includes(from.food.id)?'c':'p';
 const grams=Math.round(from.grams*from.food[metric]/to[metric]);
 if(grams<1||grams>600)throw new Error('La ración equivalente quedaría fuera del rango del menú. Elige otra alternativa.');
 const meals=snapshot.meals.map((m,i)=>i!==slot?m:{...m,name:m.name.slice(0,135)+' · adaptado',prep:undefined,items:m.items.map((it,j)=>j===index?{food:to,grams}:it)});
 return {...day,foodPlan:{...snapshot,meals}};
}
export function readinessAdvice(r:Readiness){
 return r.pain==='present'?{action:'review',label:'Revisar la sesión',reason:'Has indicado molestias. Revisa el trabajo pendiente con tu entrenador antes de iniciarlo.'} as const:
 r.sleep==='poor'||r.fatigue==='high'||r.fatigue==='mid'&&r.motivation==='low'?{action:'shorten',label:'Acortar la sesión',reason:'Tu descanso o cansancio aconsejan una sesión más corta y cómoda.'} as const:
 {action:'keep',label:'Mantener la sesión',reason:'Según tus respuestas puedes mantener el trabajo previsto y valorar cómo te encuentras al empezar.'} as const;
}
export type DayChange='rest'|'shorten'|'outside'|'move-sparring';
export function applyDayChange(p:Profile,date:string,today:string,action:DayChange,arg?:number|string):Profile{
 if(date<today||!p.confirmed)throw new Error('Elige el día actual o una fecha futura.');
 let next=p;
 const data=p.workouts??{plans:[],logs:[]},plan=planForDate(data,date),sessions=dailySessions(data,date);
 const active=p.preparation?.competition&&competitionPhase(p.preparation.competition,date).active;
 function setPlan(changed:TrainingPlan){
  const previous=next.workouts??data;
  next={...next,workouts:{...previous,plans:[...previous.plans.filter(x=>x.id!==changed.id),changed].slice(-12)}};
 }
 function club(dt:string,kind:'none'|'sparring'){
  const source=planForDate(next.workouts??data,dt);
  if(!source)throw new Error('La fecha de destino necesita un calendario guardado.');
  const month=dt.slice(0,7);
  setPlan({...source,id:source.month?source.id:crypto.randomUUID(),month,clubOverrides:{...source.clubOverrides,[dt]:kind}});
 }
 if(action==='move-sparring'){
  const dest=typeof arg==='string'?arg:'';
  if(dest<=date||dest>addDays(date,14)||clubForDate(plan,date)!=='sparring')throw new Error('Elige un destino posterior, dentro de 14 días.');
  if(sessions.some(x=>x.pinned)||(p.days[date]?.minutes??0)>0||dailySessions(data,dest).some(x=>x.pinned)||(p.days[dest]?.minutes??0)>0)throw new Error('Ya hay actividad registrada en una de esas fechas.');
  const destination=planForDate(data,dest);
  if(!destination||clubForDate(destination,dest))throw new Error('Elige un día libre de sesiones de club con calendario guardado.');
  if(active||p.preparation?.competition&&competitionPhase(p.preparation.competition,dest).active)throw new Error('Revisa el cambio de sparring con tu equipo desde el calendario de competición.');
  club(date,'none');club(dest,'sparring');
  const target=planForDate(next.workouts!,dest)!;
  setPlan(editCalendarDay(target,dest.slice(0,7),dest,[],'date'));
 }else if(action==='rest'||action==='shorten'){
  if(action==='shorten'&&(!plan||sessions.every(s=>s.pinned)))throw new Error('No hay sesiones pendientes que se puedan acortar.');
  const first=sessions.find(x=>!x.pinned);
  const short=first&&first.session.kind==='conditioning'?baseConditioning(first.session.day,first.plan.config.conditioningMode==='walk-run'?'walk-run':'easy',Math.min(first.session.minutes,25)):first?{...first.session,minutes:Math.min(25,first.session.minutes),title:first.session.title.slice(0,105)+' · breve',exercises:first.session.exercises.slice(0,3).map(e=>({...e,sets:Math.min(e.sets,2),plannedKg:null,effort:'Mantén una ejecución cómoda con margen.'}))}:undefined;
  if(plan)setPlan(editCalendarDay(plan,date.slice(0,7),date,action==='shorten'&&short?[short]:[],'date'));
  if(action==='rest'&&plan&&clubForDate(plan,date)&&!(p.days[date]?.minutes??0))club(date,'none');
 }
 const dates=action==='move-sparring'?[date,String(arg)]:[date];
 for(const dt of dates){
  const old=next.days[dt]??emptyDay(next);
  if(old.complete)continue;
  const base=daySettings(next,dt);
  const prior=old.nutrition;
  const {situationId,...existing}=prior??{situationId:undefined};
  const count=prior?.mealCount??old.foodPlan?.meals.length??base.mealCount;
  const outside=prior?.outsideMeals??[];
  const slot=typeof arg==='number'?arg:2;
  if(action==='outside'&&(!mealSlots(count).includes(slot)||old.foodPlan?.records.some(r=>mealSlots(count)[r.slot]===slot)))throw new Error('Elige una comida pendiente de esta fecha.');
  const day=previewNutritionSituation(next,{...base,...existing,id:action==='outside'&&prior?.situationId==='quick-rest'?'quick-rest':'quick-'+action,name:action==='rest'?'Día sin entreno':action==='shorten'?'Entreno breve':action==='outside'?'Comida fuera':'Cambio de sparring',
    mealCount:count,times:prior?.times??mealTimes(count,p.athlete?.schedule??'regular',p.onboarding?.completed?.answers.nutrition),
    training:action==='rest'?'rest':action==='outside'?(prior?.training??'usual'):'usual',
    outsideMeals:action==='outside'?[...outside.filter(x=>x.slot!==slot),{slot,size:'normal'}]:outside,
    supplements:(prior?.supplements??base.supplements).filter(s=>base.supplements.some(x=>x.id===s.id)),
  },dt,p.plans.at(-1)?.seed??0);
  next={...next,days:{...next.days,[dt]:day}};
 }
 return next;
}
