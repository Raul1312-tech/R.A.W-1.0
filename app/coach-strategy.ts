import {mealLabelsFor} from './meal-layout.ts';
import {emptyDay,targets,total,generatePlan,type Profile} from './model.ts';
import {dailySessions,planForDate,editCalendarDay,sessionsForDate} from './training-calendar-model.ts';
import {generateTrainingPlan,type TrainingSession} from './training-model.ts';
import {applyRepeats} from './preparation-model.ts';
import {versionStamp} from './strategy-version.ts';
import {competitionPhase} from './competition-phase.ts';
const shift=(date:string,n:number)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const mean=(v:number[])=>v.reduce((a,b)=>a+b,0)/v.length;
export function strategyProposal(p:Profile,date:string){
 const data=p.workouts??{plans:[],logs:[]},plan=planForDate(data,date),competition=p.preparation?.competition??plan?.config.competition;
 const daysToFight=competition?Math.ceil((Date.parse(competition.fight)-Date.parse(date+'T12:00:00Z'))/86400000):null;
 const daysToWeigh=competition?Math.ceil((Date.parse(competition.weighIn)-Date.parse(date+'T12:00:00Z'))/86400000):null;
 const recent=Object.entries(p.days).filter(([d])=>d>=shift(date,-13)&&d<=date);
 const weights=(start:number,end:number)=>recent.filter(([d,v])=>d>=shift(date,start)&&d<=shift(date,end)&&v.weight!==null).map(([,v])=>v.weight!);
 const a=weights(-13,-7),b=weights(-6,0),trend=a.length>=3&&b.length>=3?(mean(b)-mean(a))/mean(a)*100:null;
 const noisy=[a,b].some(v=>v.length>1&&(Math.max(...v)-Math.min(...v))/mean(v)>.04);
 const currentWeight=b.length?mean(b):p.weight,goal=p.goal,current=targets(p);
 const poorSleep=recent.filter(([d,v])=>d>=shift(date,-6)&&v.sleep!==null&&v.sleep<6).length;
 const hard=data.logs.filter(l=>l.date>=shift(date,-6)&&l.date<=date&&l.rpe>=8).length+Object.entries(p.preparation?.clubRecords??{}).filter(([dt,r])=>dt>=shift(date,-6)&&dt<=date&&r.rpe>=8).length;
 const readiness=Object.entries(p.preparation?.readiness??{}).filter(([d])=>d>=shift(date,-6)&&d<=date);
 const pain=p.preparation?.readiness?.[date]?.pain==='present';
 const fatigue=poorSleep>=2||hard>=3||readiness.filter(([,r])=>r.fatigue==='high'||r.sleep==='poor').length>=2;
 const complete=recent.filter(([,d])=>d.complete);
 const adherence=complete.length>=10&&complete.filter(([,d])=>Math.abs(d.target.k-current.k)<=current.k*.05&&Math.abs(total(d.items).k-d.target.k)<=d.target.k*.15).length>=10;
 const cooldown=p.preparation?.coach?.events.some(e=>e.strategy&&e.date>shift(date,-7)&&e.date<=date);
 const reasons:string[]=[],warnings:string[]=[];
 let delta=0;
 const direction=Math.abs(goal-currentWeight)<.5?'maintain':goal>currentWeight?'gain':'lose';
 const conflict=!!competition&&daysToFight!==null&&daysToFight>=0&&goal>competition.weight+.5;
 const required=competition&&daysToWeigh!==null&&daysToWeigh>0?Math.max(0,currentWeight-competition.weight)/currentWeight*100/(daysToWeigh/7):null;
 if(trend===null)warnings.push('Para ajustar calorías faltan al menos tres pesos en cada una de las dos últimas semanas.');
 if(!adherence)warnings.push('Para ajustar calorías hacen falta diez días completos de alimentación en catorce días, cercanos a su objetivo.');
 if(noisy)warnings.push('Los pesos fluctúan mucho dentro de una semana. Comprueba unidades y condiciones de medición antes de ajustar calorías.');
 if(conflict)warnings.push('Tu objetivo de peso supera la categoría de combate. Acuerda cuál priorizar y actualiza el perfil antes de cambiar calorías.');
 if(required!==null&&required>.5)warnings.push('La categoría exigiría perder más del 0,5 % del peso semanal. No se acelera el déficit: revisa objetivo y fecha con un dietista deportivo.');
 if(daysToWeigh!==null&&daysToWeigh>=0&&daysToWeigh<=14)warnings.push('Pesaje próximo: no se propone profundizar el déficit ni manipular líquidos.');
 if(trend!==null&&adherence&&!conflict&&!noisy){
  if(direction==='gain')delta=trend<.1?150:trend>.3?-150:0;
  if(direction==='lose')delta=trend>-.25?-150:trend<-.5?150:0;
  if(direction==='maintain')delta=trend>.15?-150:trend<-.15?150:0;
 }
 if(delta<0&&(fatigue||(daysToWeigh!==null&&daysToWeigh>=0&&daysToWeigh<=14)||(required!==null&&required>.5)||currentWeight/(p.height/100)**2<20))delta=0;
 const step=Math.min(150,Math.floor(current.k*.05/25)*25);
 const floor=Math.max(1500,current.bmr*1.2,current.maintenance*.8);
 const energy=delta?Math.max(Math.ceil(floor/25)*25,Math.min(6500,current.k+Math.sign(delta)*step)):current.k;
 const newEnergy=delta&&Math.sign(energy-current.k)===Math.sign(delta)&&Math.abs(energy-current.k)<=150?energy:current.k;
 if(newEnergy!==current.k)reasons.push(`Tendencia ${trend!.toFixed(2)} %/semana con registros suficientes: ${Math.round(current.k)} → ${newEnergy} kcal para ${direction==='gain'?'ganar peso':direction==='lose'?'perder peso progresivamente':'estabilizar el peso'}.`);
 const progressing=data.logs.filter(l=>l.date>=shift(date,-13)&&l.date<=date&&l.rpe<=7&&l.session?.exercises.length&&l.session.exercises.every(e=>(l.entries.find(v=>v.exerciseId===e.id)?.sets??0)>=e.sets)).length>=3;
 const phase=fatigue||(daysToFight!==null&&daysToFight>=0&&daysToFight<=14)?'deload':plan?.config.level==='beginner'?'base':progressing?'build':plan?.config.phase??'base';
 const training:{date:string;before:TrainingSession[];after:TrainingSession[]}[]=[];
 if(plan&&!plan.config.limitation&&!pain){
  for(let n=1;n<=7;n++){
   const dt=shift(date,n),source=planForDate(data,dt);if(!source||source.overrides?.some(o=>o.date===dt)||dailySessions(data,dt).some(s=>s.pinned))continue;
   const until=competition?Math.ceil((Date.parse(competition.fight)-Date.parse(dt+'T12:00:00Z'))/86400000):null;
   const chosen=until!==null&&until>=0&&until<=14?'deload':phase;
   const generated=generateTrainingPlan({...source.config,phase:chosen,competition:competition?{...competition,taper:true}:undefined});
   const before=sessionsForDate(source,dt),after=sessionsForDate(generated,dt);
   for(const s of after){const old=before.find(v=>v.kind===s.kind);if(!old)continue;let budget=Math.floor(old.exercises.reduce((n,e)=>n+e.sets,0)*1.2);const sum=()=>s.exercises.reduce((n,e)=>n+e.sets,0);while(sum()>budget&&s.exercises.some(e=>e.sets>1)){for(const e of [...s.exercises].reverse()){if(sum()<=budget)break;if(e.sets>1)e.sets--;}}}
   // Prescriptions are regenerated for the declared sport, level, equipment and priority.
   if(chosen==='build'){
    for(const s of after){
     const old=before.find(x=>x.kind===s.kind);
     if(old&&chosen!==source.config.phase){
      const eligible=old.kind==='lift'&&old.exercises.reduce((sum,e)=>sum+e.sets,0)>=5&&s.minutes>=old.minutes+3;
      const last=data.logs.filter(l=>l.date<=date&&l.rpe<=7&&l.session?.kind==='lift').sort((a,b)=>b.date.localeCompare(a.date));
      const index=eligible?old.exercises.findIndex(e=>e.block==='strength'&&e.sets<4&&last.some(l=>l.entries.some(r=>r.exerciseId===e.id&&r.sets>=e.sets))):-1;
      Object.assign(s,old,{exercises:old.exercises.map((e,i)=>i===index?{...e,sets:e.sets+1}:e),minutes:index>=0?Math.min(s.minutes,old.minutes+3):old.minutes});
     }
    }
   }
   if(JSON.stringify(before)!==JSON.stringify(after))training.push({date:dt,before,after});
  }
 }
 if(training.length)reasons.push(`Rediseño de ${training.length} fechas futuras: fase ${phase==='deload'?'de descarga / puesta a punto':phase==='build'?'de desarrollo':'de base'}, respetando deporte, nivel, material y días seleccionados.`);
 const profileForFood={...p,preparation:{...p.preparation,energyTarget:newEnergy}};
 const menu=newEnergy!==current.k?generatePlan(profileForFood,Number(date.replaceAll('-',''))%100001,p.plans.at(-1)):null;
 const foodDates=menu?Array.from({length:7},(_,i)=>shift(date,i+1)).filter(d=>!p.days[d]?.foodPlan&&!p.days[d]?.items.length&&!p.days[d]?.complete):[];
 const foodPreview=menu?foodDates.map(dt=>{const meals=applyRepeats(p,structuredClone(menu.week?.[(new Date(dt+'T12:00:00Z').getUTCDay()+6)%7]?.meals??menu.meals));return {date:dt,meals,macro:total(meals.flatMap(m=>m.items))};}):[];
 if(foodPreview.some(d=>Math.abs(d.macro.k-newEnergy)>newEnergy*.1))warnings.push('Al conservar platos habituales, algún menú se aleja más del 10 % del objetivo nuevo. Revisa sus cantidades antes de aceptar.');
 if(newEnergy!==current.k&&!foodDates.length)warnings.push('No hay fechas de alimentación libres para regenerar; conserva y revisa tus menús manuales.');
 const enabled=p.confirmed&&!cooldown&&!plan?.config.limitation&&!(competition&&competitionPhase(competition,date).active)&&(training.length>0||!!menu&&foodDates.length>0);
 if(cooldown)warnings.push('Ya aceptaste una estrategia esta semana. Se esperan nuevos datos antes de volver a ajustarla.');
 return {enabled,trend,currentWeight,direction,daysToFight,daysToWeigh,required,phase,reasons,warnings,training,foodDates,foodPreview,menu,energyBefore:current.k,energyAfter:menu&&foodDates.length?newEnergy:current.k};
}
export function applyStrategy(p:Profile,date:string):Profile{
 const proposal=strategyProposal(p,date);if(!proposal.enabled)throw new Error('No hay una estrategia aplicable con los datos actuales.');
 let next=structuredClone(p);
 for(const entry of proposal.training){
  const plan=planForDate(next.workouts!,entry.date)??planForDate(p.workouts!,entry.date)!;
  const changed=editCalendarDay(plan,entry.date.slice(0,7),entry.date,entry.after,'date');
  next.workouts={...next.workouts!,plans:[...next.workouts!.plans.filter(x=>x.id!==changed.id),changed].slice(-12)};
 }
 if(proposal.menu&&proposal.foodDates.length){
  const menu=proposal.menu;
  next.plans=[...next.plans,menu].slice(-36);
  next.preparation={...next.preparation,energyTarget:proposal.energyAfter};
  if(!next.days[date])next.days[date]=emptyDay(p);
  for(const dt of proposal.foodDates){
   const meals=applyRepeats(p,structuredClone(menu.week?.[(new Date(dt+'T12:00:00Z').getUTCDay()+6)%7]?.meals??menu.meals));
   next.days[dt]={...(next.days[dt]??emptyDay(next)),target:menu.target,foodPlan:{planId:menu.id,meals,labels:mealLabelsFor(meals.length),records:[],autoAdjust:true}};
  }
 }
 next.preparation={...next.preparation,coach:{...p.preparation?.coach,enabled:p.preparation?.coach?.enabled??false,events:[...(p.preparation?.coach?.events??[]),{date,at:new Date().toISOString(),before:0,after:0,strategy:true,reason:proposal.reasons.join(' ').slice(0,300)}].slice(-30)}};
 next.strategyVersion={
  date,trainingDates:proposal.training.map(e=>e.date),
  ...(proposal.training.length?{training:p.workouts!.plans,trainingAfter:versionStamp(next.workouts!.plans)}:{}),
  food:proposal.foodDates.map(dt=>({date:dt,target:p.days[dt]?.target??targets(p),after:versionStamp(next.days[dt].foodPlan)})),
  ...(proposal.menu&&proposal.foodDates.length?{menuId:proposal.menu.id,energyBefore:p.preparation?.energyTarget,energyAfter:proposal.energyAfter}:{}),
 };
 return next;
}
