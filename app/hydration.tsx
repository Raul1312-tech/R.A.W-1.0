'use client';
import {useState,useEffect} from 'react';
import SelectField from './select-field';
import type {Profile,Day} from './model';

import {hydrationReference} from './hydration-model';
export default function Hydration({profile:p,date,day,disabled,onDay,onProfile}:{profile:Profile;date:string;day:Day;disabled:boolean;onDay:(d:Day)=>void;onProfile:(p:Profile)=>void}){
 const ref=hydrationReference(p,date),[last,setLast]=useState(0);
 useEffect(()=>{setLast(0)},[p.id,date]);
 function add(amount:number){const water=Math.min(15000,Math.max(0,day.water+amount));onDay({...day,water});setLast(water-day.water)}
 return <section className="card water-card"><h2>Agua y bebidas de hoy</h2>
 <p><strong>{(day.water/1000).toLocaleString('es-ES')} de {(ref.goal/1000).toLocaleString('es-ES')} litros</strong></p>
 <progress aria-label="Bebidas registradas" value={Math.min(day.water,ref.goal)} max={ref.goal}/>
 <p>Referencia inicial de {(ref.base/1000).toLocaleString('es-ES')} l para el día{ref.exercise?' y '+(ref.exercise/1000).toLocaleString('es-ES')+' l orientativos por actividad y calor':''}. Reparte las tomas y ajusta a sed, sudor y tolerancia. Las bebidas deportivas marcadas como tomadas también se suman aquí.</p>
 <div className="raw-actions">{[250,500,750].map(ml=><button key={ml} className="button outline" disabled={disabled||day.water>=15000} onClick={()=>add(ml)}>+ {ml} ml</button>)}</div>
 <div className="raw-actions"><button className="text-button" disabled={disabled||last<=0||day.water<last} onClick={()=>{onDay({...day,water:day.water-last});setLast(0)}}>Deshacer última toma</button><button className="text-button" disabled={disabled||!day.water} onClick={()=>add(-250)}>Corregir −250 ml</button></div>
 <details className="raw-disclosure"><summary>Ajustar mi referencia</summary>
 <SelectField label="Referencia de hidratación" value={p.preparation?.hydration?.mode??'auto'} disabled={disabled} onValueChange={mode=>onProfile({...p,preparation:{...p.preparation,hydration:{...p.preparation?.hydration,mode:mode as 'auto'|'manual',manualGoal:ref.goal}}})}><option value="auto">Calcular según peso y actividad</option><option value="manual">Referencia acordada con mi profesional</option></SelectField>
 {p.preparation?.hydration?.mode==='manual'&&<label className="field">Referencia diaria en ml<input type="number" min={1000} max={6000} step={250} defaultValue={ref.goal} onBlur={e=>{if(e.currentTarget.validity.valid)onProfile({...p,preparation:{...p.preparation,hydration:{...p.preparation?.hydration,mode:'manual',manualGoal:Number(e.target.value)}}})}}/></label>}
 <label className="checkbox"><input type="checkbox" checked={p.preparation?.hydration?.heat??false} disabled={disabled} onChange={e=>onProfile({...p,preparation:{...p.preparation,hydration:{...p.preparation?.hydration,mode:p.preparation?.hydration?.mode??'auto',heat:e.target.checked}}})}/> Entreno con calor o sudo bastante</label>
 <p>Estimación práctica de la app. Una pauta médica de líquidos tiene prioridad. El pesaje conserva esta referencia habitual.</p>
 <a href="https://www.ausport.gov.au/ais/nutrition/education-modules/modules/hydration" target="_blank" rel="noreferrer">Referencia AIS de hidratación</a></details></section>;
}
