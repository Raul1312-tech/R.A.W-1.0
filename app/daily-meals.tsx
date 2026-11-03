'use client';
import {useState} from 'react';
import {Check,Utensils,Undo2,ArrowRight} from 'lucide-react';
import {total,type Day,type Plan,type Profile} from './model';
import {displayMeal,foodDayView,recordMeal,undoMeal} from './daily-food-model';
import FoodGrid from './food-grid';
import {MenuMacros} from './weekly-menu';

export default function DailyMeals({day,plan,date,profile,disabled,onChange,onMenu}:{day:Day;plan?:Plan;date:string;profile:Profile;disabled:boolean;onChange:(day:Day)=>void;onMenu:()=>void}){
  const [editor,setEditor]=useState<number|null>(null);const [message,setMessage]=useState('');const [error,setError]=useState('');
  const view=foodDayView(day,plan,date);
  function run(action:()=>Day,text:string){try{onChange(action());setError('');setMessage(text)}catch(e){setError(e instanceof Error?e.message:'No se pudo registrar.')}}
  if(!view)return <section className="card" id="daily-food-log"><h2>Tu dieta, lista para marcar.</h2><p>Genera un menú compatible desde Mi alimentación para verlo aquí.</p><button className="button outline" onClick={onMenu}>Ver mi alimentación <ArrowRight size={16}/></button></section>;
  const {snapshot,meals,adjustments}=view;
  return <section className="daily-meals" id="daily-food-log" aria-label="Registro fácil de comidas">
    <div className="section-head"><div><span className="eyebrow">MI DÍA / ALIMENTACIÓN</span><h2>Tu dieta. Un toque por comida.</h2><p>¿Has comido lo previsto? Marca y sigue. Si has cambiado el plato, registra lo que has comido.</p></div><span className="meal-progress-pill">{snapshot.records.length}/{meals.length} comidas registradas</span></div>
    <div className="meal-adjustment-control"><label className="checkbox"><input type="checkbox" checked={snapshot.autoAdjust} disabled={disabled} onChange={e=>onChange({...day,foodPlan:{...snapshot,autoAdjust:e.target.checked}})}/> Ajustar automáticamente las comidas pendientes</label><p>Cambios suaves en cantidades, hasta un 20 %. Se mantiene la composición de los platos. No se elimina ninguna comida ni se traslada nada a mañana.</p></div>
    {adjustments.length>0&&<div className="meal-adjustment-note" role="status"><b>He ajustado las cantidades que quedan por delante.</b><p>Solo para {date}. Lo ya registrado se mantiene.</p><details><summary>Ver qué ha cambiado</summary>{adjustments.map((a,i)=><p key={i}>{displayMeal(snapshot.labels[a.slot])} · {a.name}: <s>{a.before} g</s> → <b>{a.after} g</b></p>)}</details></div>}
    {view.finished&&<p className="notice">Cena registrada. No se ajustan comidas anteriores ni se compensa mañana.</p>}
    {message&&<p className="meal-status" role="status"><Check size={16}/>{message}</p>}{error&&<p className="notice error" role="alert">{error}</p>}
    <div className="daily-meal-list">{meals.map((meal,slot)=>{
      const record=snapshot.records.find(r=>r.slot===slot),label=displayMeal(snapshot.labels[slot]);const actual=day.items.filter(it=>record?.itemIds.includes(it.id));
      const adjusted=adjustments.some(a=>a.slot===slot);const compatible=meal.items.every(it=>!profile.excluded.includes(it.food.id)&&!it.food.allergens.some(a=>profile.allergens.includes(a)));
      const description=<><MenuMacros m={total(record?actual:meal.items)}/><ul className="ingredients">{(record?actual:meal.items).map((it,i)=><li key={i}><div><b>{it.food.name}</b><small>{it.food.unit}</small></div><strong>{it.grams} {it.food.unit.includes('ml')?'ml':'g'}</strong></li>)}</ul>{!record&&<details className="meal-prep"><summary>Cómo prepararlo</summary><p>{meal.prep??'Prepara cada alimento en el estado indicado.'}</p></details>}</>;
      return <article key={slot} className={'daily-meal-card '+(record?'is-recorded':'')}>
        <header><span className="daily-meal-number">{record?<Check size={22}/>:String(slot+1).padStart(2,'0')}</span><div><span className="eyebrow">{label}{adjusted&&!record?' · CANTIDADES AJUSTADAS':''}</span><h3>{record?.status==='skipped'?'No realizada':record?.status==='alternative'?'Tu comida registrada':meal.name}</h3></div>{record&&<span className="meal-state">{record.status==='planned'?'Como estaba previsto':record.status==='skipped'?'Sin alimentos registrados':'Con cambios'}</span>}</header>
        {editor===slot?<FoodGrid initial={record?actual:[]} planned={compatible?meal.items:undefined} disabled={disabled} onCancel={()=>setEditor(null)} onSave={items=>{const next=recordMeal(day,plan,date,slot,'alternative',items);onChange(next);setEditor(null);setMessage('Comida guardada. He revisado las cantidades pendientes.')}}/>:<>
          {record?<details className="meal-recorded-details"><summary>Ver lo registrado</summary>{description}</details>:description}
          {!compatible&&!record&&<p className="notice">Este plato guardado no encaja con tus exclusiones actuales. Registra una alternativa o revisa tu menú.</p>}
          <div className="daily-meal-actions">{record?<><button className="text-button" disabled={disabled} onClick={()=>setEditor(slot)}>Editar lo que he comido</button><button className="text-button" disabled={disabled} onClick={()=>run(()=>undoMeal({...day,foodPlan:snapshot},slot),'Registro deshecho. Se han recalculado las comidas pendientes.')}><Undo2 size={15}/> Deshacer</button></>:<><button className="button orange" disabled={disabled||!compatible} onClick={()=>run(()=>recordMeal(day,plan,date,slot,'planned'),label+' registrada.')}><Check size={20}/> Lo he comido</button><button className="button outline" disabled={disabled} onClick={()=>setEditor(slot)}><Utensils size={17}/> He comido otra cosa</button><button className="text-button" disabled={disabled} onClick={()=>run(()=>recordMeal(day,plan,date,slot,'skipped'),label+' marcada como no realizada.')}>No he hecho esta comida</button></>}</div>
        </>}
      </article>;
    })}</div>
    <div className="meal-projection card"><div><span className="eyebrow">REGISTRADO HASTA AHORA</span><MenuMacros m={view.recorded}/></div><div><span className="eyebrow">SI COMPLETAS LO PENDIENTE</span><MenuMacros m={view.projected}/></div><p>Referencia del día: {Math.round(day.target.k)} kcal · {Math.round(day.target.p)} g proteína. Proyección aproximada; no exige acertar cada cifra. Los ajustes tienen un límite, así que puede quedar diferencia.</p></div>
  </section>;
}
