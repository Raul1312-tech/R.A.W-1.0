import {targets,type Profile,type Day,type Macro} from './model.ts';
import {mealSlots,mealFractions} from './meal-layout.ts';
import {dailySessions,planForDate,weekdayOf} from './training-calendar-model.ts';
import type {NutritionSituation} from './nutrition-situation-schema.ts';

const shift=(date:string,n:number)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
/** Net MET estimate; total daily activity already includes the average training load. */
function calendarLoad(p:Profile,date:string){
 const data=p.workouts??{plans:[],logs:[]},plan=planForDate(data,date);
 const sessions=dailySessions(data,date);
 let minutes=0,net=0;
 for(const {session} of sessions){const met=session.kind==='conditioning'?5:3.5;minutes+=session.minutes;net+=(met-1)*p.weight*session.minutes/60}
 const wd=weekdayOf(date),technical=plan?.config.sparringDays.includes(wd)?7.8:plan?.config.technicalDays.includes(wd)?5.8:0;
 if(technical){
   const club=plan?.config.sport==='boxing'?p.onboarding?.completed?.answers.boxing.club?.find(session=>session.day===wd):undefined;
   const clubMinutes=club?.minutes??60;
   minutes+=clubMinutes;net+=(technical-1)*p.weight*clubMinutes/60;
 }
 return {minutes,net,known:!!plan||sessions.length>0};
}
export function situationEnergy(p:Profile,s:Pick<NutritionSituation,'training'|'trainingMinutes'|'trainingIntensity'>,date:string){
 const base=targets(p),today=calendarLoad(p,date),monday=shift(date,-weekdayOf(date));
 const week=Array.from({length:7},(_,i)=>calendarLoad(p,shift(monday,i)));
 const average=week.some(d=>d.known)?week.reduce((n,d)=>n+d.net,0)/7:Math.max(0,p.activity-1.4)*base.bmr*.5;
 const fallbackMet=p.athlete?.sport==='boxing'||p.athlete?.sport==='kickboxing'||p.athlete?.sport==='mma'?5.8:3.5;
 const met=s.trainingIntensity==='light'?3.5:s.trainingIntensity==='hard'?7.5:fallbackMet;
 const completedMinutes=Math.max(p.days[date]?.minutes??0,(p.workouts?.logs??[]).filter(l=>l.date===date).reduce((n,l)=>n+l.minutes,0));
 const completedNet=(fallbackMet-1)*p.weight*completedMinutes/60;
 const custom=s.training==='training'&&(s.trainingMinutes!==undefined||s.trainingIntensity!==undefined||!today.minutes);
 const minutes=Math.max(completedMinutes,s.training==='rest'?0:custom?s.trainingMinutes??(today.minutes||60):today.minutes);
 const desired=Math.max(completedNet,s.training==='rest'?0:custom?(met-1)*p.weight*minutes/60:today.net);
 const change=s.training==='usual'&&!today.known?0:desired-average;
 const cap=Math.min(300,base.k*.1),floor=Math.min(base.k,Math.max(1500,base.bmr*1.2));
 // An explicit professional target remains authoritative. Meal count and eating out do not reduce needs.
 let energy=p.preparation?.energyTarget?base.k:Math.max(Math.ceil(floor/50)*50,Math.min(6500,Math.round(Math.max(base.k-cap,Math.min(base.k+cap,base.k+change))/50)*50));
 const makeTarget=(k:number):Macro=>{const f=Math.round(k*.27/9);return {k,p:base.p,f,c:(k-4*base.p-9*f)/4}};
 if(makeTarget(energy).c<100)energy=base.k;
 return {target:makeTarget(energy),base:base.k,adjustment:energy-base.k,minutes,completedMinutes,source:today.known?'calendar':'profile',agreed:!!p.preparation?.energyTarget};
}
/** A reservation is an estimate of a pending outside meal, never a consumption record. */
export function outsideMealEstimate(day:Day,slot:number):Macro|undefined{
 const situation=day.nutrition;if(!situation)return;
 const outside=situation.outsideMeals?.find(m=>m.slot===mealSlots(situation.mealCount)[slot]);
 if(!outside)return;
 const fraction=mealFractions(situation.mealCount)[slot]*(outside.size==='large'?1.2:1);
 return {k:day.target.k*fraction,p:day.target.p*fraction,c:day.target.c*fraction,f:day.target.f*fraction};
}
