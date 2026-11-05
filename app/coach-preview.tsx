'use client';
import {useState} from 'react';
import {previewCoachAction,type CoachAction} from './coach-model';
import {dateKey,type Profile} from './model';
export default function CoachPreview({profile,date,action,disabled,onApply}:{profile:Profile;date:string;action:CoachAction;disabled:boolean;onApply:()=>void}){
 const [confirm,setConfirm]=useState(false);
 const proposal=previewCoachAction(profile,date,action),food=proposal.food;
 if(action==='keep')return <p className="coach-message">La revisión propone mantener el plan. Las señales que requieren atención aparecen arriba.</p>;
 return <div className="coach-proposal"><h3>Tu propuesta coordinada de hoy</h3><p>Revisa los efectos antes de decidir. Solo se aplica a esta fecha.</p>
 {proposal.training&&<p><b>Entrenamiento:</b> {proposal.training.seriesBefore} → {proposal.training.seriesAfter} series pendientes. Una menos por ejercicio, mínimo una; mismos pesos, repeticiones y descansos. Las sesiones iniciadas se conservan.</p>}
 {food&&<><p><b>Alimentación:</b> cantidades hasta ±10 % sobre las porciones visibles. Mismos alimentos y objetivo guardado; ningún suplemento cambia.</p><div className="coach-macro-preview"><table><caption>Total del día: registrado + pendiente</caption><thead><tr><th>Referencia</th><th>Antes</th><th>Propuesta</th><th>Objetivo</th></tr></thead><tbody>{(['k','p','c','f'] as const).map((k,i)=><tr key={k}><th>{['kcal','Proteína (g)','Hidratos (g)','Grasa (g)'][i]}</th><td>{Math.round(food.before[k])}</td><td>{Math.round(food.after[k])}</td><td>{Math.round(food.target[k])}</td></tr>)}</tbody></table></div><details><summary>Ver cantidades y cambios en la compra</summary><ul>{food.changes.map((c,i)=><li key={i}>{c.meal} · {c.name}: {c.before} → {c.after} g</li>)}</ul><p>La lista del mes fijado usará estas cantidades y tus precios guardados. No es una consulta de precios en tiempo real.</p></details><p>Al aceptar queda fijado el ajuste de hoy y se desactiva el reajuste automático de comidas de esta fecha para evitar duplicarlo. Puedes editar las cantidades después.</p></>}
 {!confirm?<button className="button outline" disabled={disabled||date!==dateKey()} onClick={()=>setConfirm(true)}>Revisar y aplicar</button>:<div className="button-row"><button className="button orange" disabled={disabled||date!==dateKey()} onClick={onApply}>Aceptar estos cambios</button><button className="text-button" onClick={()=>setConfirm(false)}>Mantener mi plan</button></div>}</div>;
}
