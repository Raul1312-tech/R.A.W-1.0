'use client';
import SelectField from './select-field';

import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,ChevronDown,PencilLine,RefreshCw,Undo2,X} from 'lucide-react';
import dynamic from 'next/dynamic';
import {mealSlots,mealTimes} from './meal-layout';
import {saveFavorite,useFavorite} from './preparation-model';
import {outsideMealEstimate} from './nutrition-estimates';
import {MealSupplements} from './personal-nutrition';
import {FoodPreferencesButton} from './food-preferences-editor';
import {alternatives,foodAllowed,swapPendingIngredient} from './preparation-engine';
import {foodById,total,type Day,type Plan,type Profile} from './model';
import {displayMeal,foodDayView,recordMeal,undoMeal,refreshDailyMeal} from './daily-food-model';
import {previousFoods} from './food-search';
import {MenuMacros} from './weekly-menu';

const MealEditor=dynamic(()=>import('./meal-editor'),{loading:()=><p role="status">Abriendo alimentos…</p>});

type Props={
  day:Day; plan?:Plan; date:string; profile:Profile; disabled:boolean; compact?:boolean;
  onChange:(day:Day)=>void; onMenu:()=>void; onProfile:(profile:Profile)=>void;
};

export default function DailyMeals({day,plan,date,profile,disabled,compact,onChange,onMenu,onProfile}:Props){
  const [editor,setEditor]=useState<{slot:number;usePlan:boolean}|null>(null);
  const [feedback,setFeedback]=useState<{message:string;undoSlot?:number}|null>(null);
  const [error,setError]=useState('');
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const element=dialog.current;
    if(editor&&element&&!element.open)element.showModal();
  },[editor]);

  const view=foodDayView(day,plan,date);
  function run(action:()=>Day,message:string,undoSlot?:number){
    try{
      onChange(action());
      dialog.current?.close();
      setEditor(null);
      setError('');
      setFeedback({message,undoSlot});
    }catch(e){setError(e instanceof Error?e.message:'No se pudo registrar la comida.')}
  }

  if(!view)return <section className="card raw-empty"><h2>Tu plan de comidas</h2><p>Completa tu perfil para preparar un menú.</p><button className="button orange" onClick={onMenu}>Revisar mi perfil <ArrowRight size={16}/></button></section>;
  const {snapshot,meals,adjustments}=view;
  const records=snapshot.records;
  const schedule=profile.athlete?.schedule;
  const weekday=new Date(date+'T12:00:00Z').getUTCDay();
  const times=day.nutrition?.times??mealTimes(meals.length,(!schedule||schedule==='variable')&&(weekday===0||weekday===6)?'weekend':schedule??'regular',profile.onboarding?.completed?.answers.nutrition);
  const next=meals.findIndex((_,slot)=>!records.some(r=>r.slot===slot));
  const actual=(slot:number)=>day.items.filter(it=>records.find(r=>r.slot===slot)?.itemIds.includes(it.id));
  const undo=(slot:number)=>run(()=>undoMeal({...day,foodPlan:snapshot},slot),'Comida deshecha.');
  function closeEditor(){
    dialog.current?.close();
    setEditor(null);
    setError('');
  }

  return <section className={'raw-meals '+(compact?'raw-meals-compact':'')} aria-label={compact?'Próxima comida':'Comidas del día'}>
    <div className="raw-section-label"><h2>{compact?'Próxima comida':'Tus comidas'}</h2><span>{records.length} de {meals.length} registradas</span></div>
    {feedback&&<div className="raw-feedback"><span role="status"><Check size={16}/>{feedback.message}</span>{feedback.undoSlot!==undefined&&<button className="text-button" disabled={disabled} onClick={()=>undo(feedback.undoSlot!)}><Undo2 size={16}/> Deshacer</button>}</div>}
    {error&&!editor&&<p className="notice error" role="alert">{error}</p>}
    {compact&&next<0&&<div className="card raw-empty"><h3>Comidas del día registradas</h3><button className="text-button" onClick={onMenu}>Revisar comidas <ArrowRight size={16}/></button></div>}
    {meals.map((meal,slot)=>{
      if(compact&&slot!==next)return null;
      const record=records.find(r=>r.slot===slot);
      const label=displayMeal(snapshot.labels[slot]);
      const items=record?actual(slot):meal.items;
      const outside=!record&&!meal.items.length?outsideMealEstimate(day,slot):undefined;
      const compatible=meal.items.every(it=>foodAllowed(profile,it.food));
      const favorites=(profile.preparation?.favorites??[]).filter(f=>f.slot===mealSlots(meals.length)[slot]);
      return <article className={'card raw-meal '+(slot===next?'raw-meal-next':'')} data-status={record?.status==='skipped'?'skipped':record?'recorded':'pending'} key={slot}>
        <header><span className="raw-meal-time">{times[slot]}</span><span>{label}</span><small>{record?.status==='skipped'?'Omitida':record?'Registrada':'Pendiente'}</small></header>
        <h3>{record?.status==='skipped'?'Comida omitida':record?.status==='alternative'?items.map(it=>it.food.name).slice(0,3).join(', ')||'Comida registrada':outside?'Comida fuera':meal.name}</h3>
        {!record&&!compatible&&<p className="notice">Este plato incluye alimentos que has excluido. Elige otra opción.</p>}
        <div className="raw-actions raw-meal-actions">
          {record?<><button className="button outline" disabled={disabled} onClick={()=>setEditor({slot,usePlan:false})}>Editar registro</button><button className="text-button" disabled={disabled} onClick={()=>undo(slot)}>Deshacer</button></>:<>
            <button className={'button '+(slot===next?'orange':'outline')} disabled={disabled||(!outside&&(!compatible||!meal.items.length))} onClick={()=>outside?setEditor({slot,usePlan:false}):run(()=>recordMeal(day,plan,date,slot,'planned'),label+' registrada.',slot)}><Check size={18}/>{outside?'Registrar comida fuera':'Lo he comido'}</button>
            {!outside&&<button className="button soft" disabled={disabled} onClick={()=>setEditor({slot,usePlan:false})}><PencilLine size={16} aria-hidden="true"/> Comí otra cosa</button>}
          </>}
        </div>
        <details className="raw-disclosure">
          <summary>{record?'Ver ingredientes registrados':outside?'Ver reserva estimada':'Ver ingredientes y opciones'}<ChevronDown size={16} aria-hidden="true"/></summary>
          {outside?<><MenuMacros m={outside}/><p>La app ha reservado esta comida y ajustado el resto del día.</p></>:<>
            <ul className="ingredients">{items.map((it,i)=><li key={i}><span>{it.food.name} <small>{it.food.unit}</small></span><b>{it.grams} {it.food.unit.includes('ml')?'ml':'g'}</b></li>)}</ul>
            {!!items.length&&<MenuMacros m={total(items)}/>}
            {!record&&meal.prep&&<p>{meal.prep}</p>}
          </>}
          {!record&&!outside&&meal.items.map((it,i)=>{const options=alternatives(profile,it.food);return options.length>0&&<SelectField key={it.food.id+':'+i} label={'Sustituir '+it.food.name} value="" disabled={disabled} onValueChange={id=>{if(id)run(()=>swapPendingIngredient(profile,day,plan,date,slot,i,id),'Ingrediente sustituido por una ración equivalente.')}}><option value="">Elegir equivalente</option>{options.map(f=><option key={f.id} value={f.id}>{f.name}{profile.preparation?.foodPreferences?.foods[f.id]==='usual'?' · Habitual':profile.preparation?.foodPreferences?.foods[f.id]==='like'?' · Me gusta':''}</option>)}</SelectField>})}
          {!record&&!outside&&<FoodPreferencesButton profile={profile} disabled={disabled} onChange={onProfile}/>}
          {!record&&!outside&&<div className="raw-actions"><button className="text-button" disabled={disabled} onClick={()=>setEditor({slot,usePlan:true})}>Cambiar ingredientes o cantidades</button><button className="text-button" disabled={disabled} onClick={()=>run(()=>refreshDailyMeal(day,plan,date,slot,profile),'Nueva propuesta para '+label.toLowerCase()+'.')}><RefreshCw size={15}/> Proponer otro plato</button></div>}
          {!!items.length&&<button className="text-button" disabled={disabled} onClick={()=>{
            try{onProfile(saveFavorite(profile,record?.status==='alternative'?{name:'Mi '+label.toLowerCase(),items}:meal,slot,meals.length));setFeedback({message:'Guardada en Comidas habituales.'});setError('')}
            catch(e){setError((e as Error).message)}
          }}>Guardar comida</button>}
          {!record&&favorites.length>0&&<SelectField label="Usar una comida guardada" value="" disabled={disabled} onValueChange={selection=>{
            const id=selection;
            if(id)run(()=>useFavorite(day,plan,date,profile,id,slot),'Comida guardada aplicada.');
          }}><option value="">Elegir plato</option>{favorites.map(f=><option key={f.id} value={f.id}>{f.meal.name}</option>)}</SelectField>}
          {!record&&<button className="text-button" disabled={disabled} onClick={()=>run(()=>recordMeal(day,plan,date,slot,'skipped'),label+' omitida.',slot)}>No he hecho esta comida</button>}
        </details>
        <MealSupplements profile={profile} date={date} day={day} slot={slot} times={times} disabled={disabled} onChange={onChange} onProfile={onProfile}/>
      </article>;
    })}
    {!compact&&<details className="raw-disclosure card">
      <summary>Ver ajustes y resumen nutricional</summary>
      <label className="checkbox"><input type="checkbox" checked={snapshot.autoAdjust} disabled={disabled} onChange={e=>onChange({...day,foodPlan:{...snapshot,autoAdjust:e.target.checked}})}/> Ajustar automáticamente las comidas pendientes</label>
      {!!adjustments.length&&<ul>{adjustments.map((a,i)=><li key={i}>{displayMeal(snapshot.labels[a.slot])} · {a.name}: {a.before} → {a.after} g</li>)}</ul>}
      <p>Registrado</p><MenuMacros m={view.recorded}/>
      <p>Proyección al completar el día</p><MenuMacros m={view.projected}/>
    </details>}
    {editor&&<dialog ref={dialog} className="raw-dialog" aria-labelledby="raw-meal-editor-title" onCancel={e=>{e.preventDefault();closeEditor()}}>
      <header><div><span className="eyebrow">{displayMeal(snapshot.labels[editor.slot])}</span><h2 id="raw-meal-editor-title">{records.some(r=>r.slot===editor.slot)?'Editar comida':'¿Qué has comido?'}</h2></div><button className="icon-button" aria-label="Cerrar" onClick={closeEditor}><X size={22}/></button></header>
      {error&&<p className="notice error" role="alert">{error}</p>}
      <MealEditor key={editor.slot+':'+editor.usePlan} onUsePlanned={!editor.usePlan&&!records.some(r=>r.slot===editor.slot)&&meals[editor.slot].items.length>0?()=>setEditor({...editor,usePlan:true}):undefined} initial={editor.usePlan?meals[editor.slot].items:actual(editor.slot)} savedFoods={[...Object.keys(profile.preparation?.foodPreferences?.foods??{}).filter(id=>profile.preparation?.foodPreferences?.foods[id]==='usual').map(id=>foodById(id)).filter(Boolean),...previousFoods(profile)]} disabled={disabled}
        onCancel={closeEditor} saveLabel="Guardar comida"
        onSave={items=>run(()=>recordMeal(day,plan,date,editor.slot,'alternative',items),snapshot.autoAdjust?'Comida registrada. Hemos revisado las cantidades pendientes.':'Comida registrada.',editor.slot)}/>
    </dialog>}
  </section>;
}
