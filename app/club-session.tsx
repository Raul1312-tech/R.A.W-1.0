'use client';

import {useState} from 'react';
import type {Profile} from './model';
import SelectField from './select-field';
import {clubForDate,planForDate,weekdayOf} from './training-calendar-model';

import {saveClubRecord} from './club-session-model';
export default function ClubSession({profile:p,date,disabled,onChange,onClose}:{profile:Profile;date:string;disabled:boolean;onChange:(p:Profile)=>void;onClose:()=>void}){
 const old=p.preparation?.clubRecords?.[date];
 const sparring=clubForDate(planForDate(p.workouts??{plans:[],logs:[]},date),date)==='sparring';
 const club=p.onboarding?.completed?.answers.boxing.club?.find(s=>s.day===weekdayOf(date));
 const defaults={name:sparring?'Sparring':'Boxeo habitual',kind:sparring?'sparring' as const:'technique' as const,minutes:club?.minutes??60,rounds:6,roundMinutes:3};
 const templates=p.preparation?.clubTemplates??[];
 const [value,setValue]=useState(old??{...defaults,rpe:0,notes:''}),[saveTemplate,setSaveTemplate]=useState(false),[error,setError]=useState('');
 return <section><h2>{old?'Revisar mi sesión de boxeo':'Mi sesión de boxeo'}</h2>
 <p>Elige una sesión habitual o ajusta lo que has hecho hoy. Puedes guardar esta estructura para repetirla.</p>
 <SelectField label="Partir de una sesión" value="" disabled={disabled} onValueChange={id=>{
 const template=id==='club'?defaults:id==='sparring'?{...defaults,name:'Sparring',kind:'sparring' as const,minutes:75}:templates.find(t=>t.id===id);
 if(template)setValue({...value,...template});
 }}><option value="">Elegir una sesión</option><option value="club">Boxeo habitual</option><option value="sparring">Sparring</option>{templates.map(t=><option key={t.id} value={t.id}>Guardada · {t.name}</option>)}</SelectField>
 <form onSubmit={e=>{e.preventDefault();if(!value.rpe){setError('Indica cómo de exigente fue la sesión.');return}
 try{let next=saveClubRecord(p,date,value);
 if(saveTemplate){const {notes,rpe,...template}=value;next={...next,preparation:{...next.preparation,clubTemplates:[...templates.filter(t=>t.name!==template.name),{...template,id:crypto.randomUUID()}].slice(-12)}}}
 onChange(next);onClose();}catch(e){setError((e as Error).message)}
 }}>
 <label className="field">Nombre de la sesión<input required maxLength={80} value={value.name} onChange={e=>setValue({...value,name:e.target.value})}/></label>
 <div className="form-grid"><SelectField label="Trabajo principal" value={value.kind} onValueChange={kind=>setValue({...value,kind:kind as typeof value.kind})}><option value="technique">Técnica, saco o manoplas</option><option value="sparring">Sparring</option><option value="circuit">Circuito físico del club</option><option value="mixed">Sesión mixta</option></SelectField>
 <label className="field">Duración total en minutos<input required type="number" min={10} max={180} value={value.minutes} onChange={e=>setValue({...value,minutes:Number(e.target.value)})}/></label>
 <label className="field">Asaltos realizados<input type="number" required min={0} max={20} value={value.rounds} onChange={e=>setValue({...value,rounds:Number(e.target.value)})}/></label>
 <SelectField label="Minutos por asalto" value={value.roundMinutes} onValueChange={v=>setValue({...value,roundMinutes:Number(v)})}>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v} minutos</option>)}</SelectField>
 <SelectField label="Esfuerzo de la sesión" value={value.rpe||''} onValueChange={v=>setValue({...value,rpe:Number(v)})}><option value="">Elige el esfuerzo</option><option value="3">Suave</option><option value="5">Moderado</option><option value="7">Exigente</option><option value="9">Muy exigente</option></SelectField></div>
 <label className="field">Qué hiciste o cómo te sentiste · opcional<textarea maxLength={600} value={value.notes} onChange={e=>setValue({...value,notes:e.target.value})}/></label>
 <label className="checkbox"><input type="checkbox" checked={saveTemplate} onChange={e=>setSaveTemplate(e.target.checked)}/> Guardar como sesión habitual</label>
 {error&&<p role="alert">{error}</p>}
 <button className="button orange" disabled={disabled}>{old?'Actualizar sesión':'Guardar sesión realizada'}</button>
 </form></section>;
}
