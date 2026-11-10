'use client';
import SelectField from './select-field';

import {useState} from 'react';
import {CalendarDays,Check} from 'lucide-react';
import {mealLabels,mealSlots,mealTimes} from './meal-layout';
import {applyNutritionSettings,clearNutritionSituation,hasNutritionRecords,previewNutritionSituation} from './nutrition-situations-model';
import {type NutritionSituation} from './nutrition-situation-schema';
import {dateKey,emptyDay,type Profile} from './model';
import {foodSnapshot} from './daily-food-model';
import {planForFoodDate} from './preparation-model';
import {MenuMacros} from './weekly-menu';

export default function ChangeDayPlan({profile,date,disabled,onChange}:{
  profile:Profile;date:string;disabled:boolean;onChange:(profile:Profile)=>void;
}){
  const day=profile.days[date]??emptyDay(profile);
  const applied=day.nutrition;
  const plan=planForFoodDate(profile,profile.plans.at(-1),date);
  const snapshot=foodSnapshot(day,plan,date);
  const count=applied?.mealCount??snapshot?.meals.length??profile.mealCount??5;
  const slots=mealSlots(count).filter((_,i)=>!snapshot?.records.some(record=>record.slot===i));
  const [choice,setChoice]=useState<'rest'|'outside'|null>(null);
  const [chosenSlot,setSlot]=useState<number>();
  const slot=chosenSlot!==undefined&&slots.includes(chosenSlot)?chosenSlot:slots.includes(2)?2:slots[0];
  const [size,setSize]=useState<'normal'|'large'>('normal');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const weekday=new Date(date+'T12:00:00Z').getUTCDay();
  const schedule=profile.athlete?.schedule==='variable'&&(weekday===0||weekday===6)?'weekend':profile.athlete?.schedule??'regular';
  const settings:NutritionSituation={
    id:applied?.situationId??'cambio-del-dia',
    name:choice==='rest'?'Día de descanso':'Comida fuera',
    training:choice==='rest'?'rest':applied?.training??'usual',
    trainingMinutes:choice==='rest'?undefined:applied?.trainingMinutes,
    trainingIntensity:choice==='rest'?undefined:applied?.trainingIntensity,
    mealCount:count,
    times:applied?.times??mealTimes(count,schedule,profile.onboarding?.completed?.answers.nutrition),
    supplements:applied?.supplements??(profile.preparation?.supplements??[]).map(({id,amount,timing})=>({id,amount,timing})),
    outsideMeals:choice==='outside'&&slot!==undefined?[...(applied?.outsideMeals??[]).filter(x=>x.slot!==slot),{slot,size}]:applied?.outsideMeals,
  };

  function preview(){
    if(!choice)return null;
    try{return {day:previewNutritionSituation(profile,settings,date)}}
    catch(e){return {error:e instanceof Error&&e.name!=='ZodError'?e.message:'Revisa la comida que quieres cambiar.'}}
  }
  const result=preview();

  return <details className="card raw-disclosure raw-change-plan">
    <summary><CalendarDays size={20}/> Cambiar el plan de {date===dateKey()?'hoy':'este día'}</summary>
    {applied&&<p className="raw-situation-tag">{applied.name} · {applied.mealCount} comidas</p>}
    <div className="raw-actions" role="group" aria-label="Qué cambia en el día">
      <button className="button outline" aria-pressed={choice==='outside'} disabled={disabled||!slots.length} onClick={()=>{setChoice('outside');setError('');setMessage('')}}>Como fuera</button>
      <button className="button outline" aria-pressed={choice==='rest'} disabled={disabled} onClick={()=>{setChoice('rest');setError('');setMessage('')}}>Hoy descanso</button>
    </div>
    {choice==='outside'&&slot!==undefined&&<div className="form-grid">
      <SelectField label="¿Qué comida harás fuera?" value={slot} onValueChange={selection=>setSlot(Number(selection))}>{slots.map(slot=><option key={slot} value={slot}>{mealLabels[slot]}</option>)}</SelectField>
      <SelectField label="¿Qué tamaño tendrá?" value={size} onValueChange={selection=>setSize(selection as typeof size)}><option value="normal">Ración habitual</option><option value="large">Más abundante</option></SelectField>
    </div>}
    {result?.day&&<section className="raw-plan-preview" aria-label="Vista previa del cambio">
      <h3>Así quedaría tu día</h3>
      <p>{choice==='rest'?'Las sesiones pendientes quedan en descanso para este día.':'Reservamos la comida fuera y ajustamos las cantidades del resto.'} Tus registros se conservan.</p>
      <ol>{result.day.foodPlan?.meals.map((meal,i)=><li key={i}><details><summary>{result.day.nutrition?.times[i]} · {meal.name}</summary>{meal.items.length?<ul>{meal.items.map((it,j)=><li key={j}>{it.food.name} · {it.grams} {it.food.unit.includes('ml')?'ml':'g'}</li>)}</ul>:<p>Registra lo que comas al volver.</p>}</details></li>)}</ol>
      <details className="raw-disclosure"><summary>Ver cálculo nutricional</summary><MenuMacros m={result.day.target}/></details>
      <button className="button orange" disabled={disabled} onClick={()=>{
        try{onChange(applyNutritionSettings(profile,settings,date));setChoice(null);setError('');setMessage('Plan del día actualizado.')}
        catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar el plan.')}
      }}><Check size={18}/> Aplicar cambio</button>
    </section>}
    {applied&&<button className="text-button" disabled={disabled||hasNutritionRecords(day)} onClick={()=>{
      try{onChange(clearNutritionSituation(profile,date,profile.plans.at(-1)));setChoice(null);setError('');setMessage('Plan habitual restaurado.')}
      catch(e){setError(e instanceof Error?e.message:'No se pudo restaurar el plan.')}
    }}>Volver al plan habitual</button>}
    {(error||result?.error)&&<p className="notice error" role="alert">{error||result?.error}</p>}
    {message&&<p role="status">{message}</p>}
  </details>;
}
