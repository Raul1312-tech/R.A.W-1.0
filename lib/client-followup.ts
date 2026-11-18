import {z} from 'zod';
import {emptyDay,total,targets,type Profile,type Macro,type Item} from '../app/model.ts';
import {foodDayView,displayMeal} from '../app/daily-food-model.ts';
import {planForFoodDate} from '../app/preparation-model.ts';
import {withCoordinatedDay} from '../app/preparation-engine.ts';
import {replanCompetition} from '../app/competition-plan.ts';
import {mealTimes} from '../app/meal-layout.ts';
import type {Activity} from './platform-model.ts';
export type ClientInteractions={activity:Activity[];reviews:{request_day:string;profile:string;choice:unknown;created_at:string}[];weekly:{week:string;profile:string;review:unknown;reviewed_at:string;dismissed:boolean}[];foodPhotos:{request_day:string;choice:unknown;created_at:string}[]};
export const emptyInteractions=():ClientInteractions=>({activity:[],reviews:[],weekly:[],foodPhotos:[]});
export const coachChoice=z.object({action:z.enum(['keep','ease','fuel','coordinate','strategy']),priority:z.array(z.string()).max(20)});
export const actionNames={keep:'Mantener el plan',ease:'Revisar la carga',fuel:'Ajustar la alimentación',coordinate:'Coordinar comidas y entreno',strategy:'Revisar la estrategia'};
export const eventNames:Record<string,string>={'session.active':'Acceso a la app','journal.saved':'Registro guardado','member.joined':'Incorporación a la empresa','invitation.accepted':'Invitación aceptada','client.viewed':'Consulta de seguimiento','client.supervision_viewed':'Consulta de supervisión del propietario','client.plan_updated':'Plan actualizado por el equipo','consent.changed':'Permiso de seguimiento actualizado',member:'Acceso o entrenador actualizado',note:'Nota de seguimiento añadida'};
export function nutritionForDate(profile:Profile,date:string,today:string){
 if(!z.string().date().safeParse(date).success)throw Error('Fecha no válida.');
 // Same deterministic view as the athlete app; never save a preview as a record.
 let p=date>=today?replanCompetition(profile,today):profile;if(date>today)p=replanCompetition(p,date);
 const eligible=p.plans.filter(plan=>plan.created.slice(0,10)<=date);
 const source=eligible.at(-1);
 const prepared=date>=today?withCoordinatedDay(p,date,source):p;
 const saved=prepared.days[date],day=saved??emptyDay(prepared);
 const plan=planForFoodDate(prepared,source,date),view=foodDayView(day,plan,date);
 const times=day.nutrition?.times??mealTimes(view?.meals.length??p.mealCount??5,p.athlete?.schedule??'regular');
 const meals=view?.meals.map((meal,slot)=>{
  const record=view.snapshot.records.find(r=>r.slot===slot),items=record?day.items.filter(it=>record.itemIds.includes(it.id)):meal.items;
  return {slot,label:displayMeal(view.snapshot.labels[slot]),time:times[slot]??'',name:record?.status==='alternative'?'Comida registrada':meal.name,status:record?.status??'pending',items,macro:total(items),prep:meal.prep};
 })??[];
 return {day,meals,consumed:total(day.items),target:day.target??targets(p),projected:view?.projected??null,hasSavedDay:!!profile.days[date],derived:!profile.days[date]?.foodPlan&&meals.length>0,unassigned:day.items.filter(it=>!view?.snapshot.records.some(r=>r.itemIds.includes(it.id)))};
}
export function recordedDates(p:Profile){return [...new Set([...Object.entries(p.days).filter(([,d])=>d.items.length>0||d.minutes>0||d.water>0||d.weight!==null||d.steps!==null||d.sleep!==null||!!d.notes||d.complete||!!d.foodPlan?.records.length).map(([date])=>date),...Object.keys(p.preparation?.readiness??{}),...Object.keys(p.preparation?.clubRecords??{}),...(p.workouts?.logs??[]).map(l=>l.date)])].sort().reverse()}
export function groupedIntake(items:(Item&{meal:string})[]){return [...new Set(items.map(i=>i.meal))].map(label=>({label:displayMeal(label),items:items.filter(i=>i.meal===label)}))}
export const macroText=(m:Macro)=>Math.round(m.k)+' kcal · '+Math.round(m.p)+' g P · '+Math.round(m.c)+' g HC · '+Math.round(m.f)+' g G';

export function priorityName(id:string){
 const names:Record<string,string>={athlete:'Perfil deportivo',nutrition:'Alimentación',accepted:'Ajustes aceptados','no-training':'Calendario pendiente',sessions:'Sesiones previstas','missing-sleep':'Descanso por registrar',recovery:'Recuperación','weight-priority':'Peso de competición',competition:'Competición','competition-weight':'Categoría pendiente',taper:'Puesta a punto','menu-gap':'Ajuste del menú','gym-volume':'Volumen de entrenamiento','gym-measurements':'Rendimiento y cargas'};
 return names[id]??'Otra referencia del plan';
}
