import type {Profile} from './model.ts';
import {addDays,daySettings} from './preparation-engine.ts';
import {clubForDate,dailySessions,editCalendarDay,planForDate,weekdayOf} from './training-calendar-model.ts';
import {generateTrainingPlan,type TrainingSession} from './training-model.ts';
import {previewNutritionSituation} from './nutrition-situations-model.ts';
import {competitionPhase} from './competition-phase.ts';
import {stateSchema} from './validation.ts';

export function reorganizeSparringWeek(p:Profile,week:string,target:string|null,today:string,availableDays?:number[]):Profile{
 const monday=addDays(week,-weekdayOf(week));
 const dates=Array.from({length:7},(_,i)=>addDays(monday,i));
 if(target&&(!dates.includes(target)||target<today))throw new Error('Elige un día pendiente de esta semana.');
 const competition=p.preparation?.competition;
 if(target&&competition){
  const phase=competitionPhase(competition,target);
  if(phase.active&&phase.daysToFight<=7)throw new Error('El sparring cerca del combate requiere un ajuste acordado con tu entrenador.');
 }
 const data=p.workouts??{plans:[],logs:[]};
 const base=planForDate(data,today)??data.plans.at(-1);
 if(!base)throw new Error('Guarda primero una rutina.');
 const future=dates.filter(date=>date>=today);
 if(target&&(dailySessions(data,target).some(s=>s.pinned)||(p.preparation?.clubRecords?.[target]?.minutes??0)>0))throw new Error('Hay una sesión ya iniciada o registrada en ese día.');
 const occupied=new Set(future.filter(date=>dailySessions(data,date).some(s=>s.pinned)||!!p.preparation?.clubRecords?.[date]));
 if(future.some(date=>occupied.has(date)&&clubForDate(planForDate(data,date),date)==='sparring'&&date!==target))throw new Error('El sparring de esa semana ya está registrado o en curso.');
 let next=structuredClone(p);
 for(const date of future){
  const month=date.slice(0,7);
  if(!planForDate(next.workouts??data,date)){
   const generated={...generateTrainingPlan(base.config),month};
   next.workouts={...data,...next.workouts,plans:[...(next.workouts?.plans??data.plans),generated].slice(-12)};
  }
 }
 const pending:TrainingSession[]=[];
 for(const date of future)for(const entry of dailySessions(data,date))if(!entry.pinned&&!occupied.has(date))pending.push(entry.session);
 function update(date:string,sessions:TrainingSession[]){
  const old=planForDate(next.workouts!,date)!;
  let updated=editCalendarDay(old,date.slice(0,7),date,sessions,'date');
  const kind=clubForDate(old,date);
  if(!occupied.has(date))updated={...updated,clubOverrides:{...updated.clubOverrides,[date]:date===target?'sparring':kind==='sparring'?'none':kind??'none'}};
  next.workouts={...next.workouts!,plans:[...next.workouts!.plans.filter(x=>x.id!==updated.id),updated].slice(-12)};
 }
 for(const date of future)if(!occupied.has(date))update(date,[]);
 const rest=p.onboarding?.completed?.answers.availability.restDays??[];
 const availability=availableDays??[0,1,2,3,4,5,6];
 // An explicit selection is an exception for this week, including usual rest days.
 const slots=future.filter(date=>availability.includes(weekdayOf(date))&&date!==target&&!occupied.has(date));
 if(pending.length>slots.length)throw new Error(`Faltan huecos: quedan ${pending.length} sesiones y ${slots.length} días disponibles. Marca más días pendientes; el día de sparring y las sesiones ya iniciadas no cuentan como huecos libres.`);
 const assigned=new Set<string>();
 const limitFor=(date:string)=>p.onboarding?.completed?.answers.availability.slots?.find(slot=>slot.day===weekdayOf(date))?.minutes??base.config.sessionLimits?.find(slot=>slot.day===weekdayOf(date))?.minutes??120;
 // Place long sessions first so a short run cannot take the only slot that fits strength.
 for(const session of [...pending].sort((a,b)=>b.minutes-a.minutes)){
  const choices=slots.filter(date=>!assigned.has(date)&&session.minutes<=limitFor(date)).sort((a,b)=>{
   const load=(date:string)=>Number(clubForDate(planForDate(next.workouts!,date),date)==='technique')*2+
     Number(target===addDays(date,1))*5+
     Number(rest.includes(weekdayOf(date)))*4+
     Number(weekdayOf(date)!==session.day)*3+
     Number([...assigned].some(other=>Math.abs(Date.parse(other)-Date.parse(date))===86400000))*2;
   return load(a)-load(b)||a.localeCompare(b);
  });
  const destination=choices[0];
  if(!destination)throw new Error(`No hay un hueco de ${session.minutes} minutos para «${session.title}». Marca otro día disponible o amplía su duración en tu rutina. No se ha cambiado ninguna sesión.`);
  assigned.add(destination);
  update(destination,[{...session,day:weekdayOf(destination)}]);
 }
 for(const date of future){
  if(next.days[date]?.complete)continue;
  const old=next.days[date]?.nutrition;
  const settings=daySettings(next,date);
  const day=previewNutritionSituation(next,{...settings,id:'sparring-week',name:target?'Semana con sparring el '+target:'Semana con sparring pendiente',mealCount:old?.mealCount??settings.mealCount,times:old?.times??settings.times,outsideMeals:old?.outsideMeals},date,p.plans.at(-1)?.seed??0);
  next.days={...next.days,[date]:day};
 }
 next.preparation={...next.preparation,sparringWeeks:Object.fromEntries(Object.entries({...next.preparation?.sparringWeeks,[monday]:target}).sort(([a],[b])=>a.localeCompare(b)).slice(-52))};
 const checked=stateSchema.safeParse({active:next.id,profiles:[next]});
 if(!checked.success)throw new Error('La propuesta no se puede guardar con la configuración actual. Tu semana anterior se conserva; revisa el perfil y la rutina.');
 return next;
}
