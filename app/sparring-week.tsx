'use client';
import {useMemo,useRef,useState} from 'react';
import SelectField from './select-field';
import type {Profile} from './model';
import {addDays} from './preparation-engine';
import {clubForDate,dailySessions,planForDate,weekdayOf} from './training-calendar-model';
import {reorganizeSparringWeek} from './sparring-week-model';

const dayName=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'});
export default function SparringWeek({profile,date,today,disabled,onChange}:{profile:Profile;date:string;today:string;disabled:boolean;onChange:(p:Profile)=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [open,setOpen]=useState(false),[week,setWeek]=useState(date),[target,setTarget]=useState('');
 const [error,setError]=useState(''),[available,setAvailable]=useState([0,1,2,3,4,5,6]);
 const monday=addDays(week,-weekdayOf(week));
 const days=Array.from({length:7},(_,i)=>addDays(monday,i));
 const data=profile.workouts??{plans:[],logs:[]};
 const result=useMemo(()=>{
  if(!open||!target)return null;
  try{return {profile:reorganizeSparringWeek(profile,week,target==='pending'?null:target,today,available)}}
  catch(e){return {error:e instanceof Error?e.message:'No se pudo preparar la semana.'}}
 },[open,profile,week,target,today,available]);
 const preview=result?.profile;
 return <><button className="button orange" disabled={disabled} onClick={()=>{setWeek(date);setTarget('');setAvailable([0,1,2,3,4,5,6]);setError('');setOpen(true);dialog.current?.showModal()}}>Cambiar sparring de esta semana</button>
 <dialog ref={dialog} className="raw-dialog sparring-week-dialog" onClose={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
  <h2>¿Qué día haces sparring?</h2>
  <p>Elige el día y te proponemos dónde colocar el físico y la carrera. El cambio es solo para esta semana.</p>
  <p>Semana del {dayName(monday)} al {dayName(days[6])}.</p>
  <SelectField label="Día de sparring" value={target} onValueChange={v=>{setTarget(v);setError('')}}>
   <option value="">Elige el día…</option>
   {days.filter(dt=>dt>=today).map(dt=><option value={dt} key={dt}>{dayName(dt)}</option>)}
   <option value="pending">Todavía por confirmar</option>
  </SelectField>
  {preview&&<section aria-label="Propuesta de esta semana" className="sparring-week-preview">
   <h3>Así queda tu semana</h3>
   <p>Conservamos tus ejercicios y lo ya registrado. Las comidas pendientes se adaptan al nuevo reparto.</p>
   <ul>{days.map(dt=>{
    const before=dailySessions(data,dt),after=dailySessions(preview.workouts!,dt);
    const club=clubForDate(planForDate(preview.workouts!,dt),dt);
    const changed=JSON.stringify(before.map(e=>e.session))!==JSON.stringify(after.map(e=>e.session))||club!==clubForDate(planForDate(data,dt),dt);
    return <li key={dt}><strong>{dayName(dt)}</strong><span>{club==='sparring'?'Sparring':club==='technique'?'Boxeo técnico':''}{club&&after.length?' + ':''}{after.map(e=>(e.session.kind==='lift'?'Físico':'Carrera')+' · '+e.session.minutes+' min').join(' + ')}{!club&&!after.length?'Descanso':''}</span>
     <small>{dt<today?'Sin cambios · día pasado':after.some(e=>e.pinned)?'Se conserva lo iniciado':changed?'Cambio solo para esta semana':'Se mantiene'}</small>
     {after.length>0&&<details><summary>Ver sesiones</summary>{after.map(e=><p key={e.key}>{e.session.title}</p>)}</details>}
    </li>;
   })}</ul>
   {days.some(dt=>addDays(dt,1)===target&&dailySessions(preview.workouts!,dt).length>0)&&<p className="notice">Hay entrenamiento la víspera del sparring. Revisa la intensidad con tu entrenador; puedes guardar la propuesta.</p>}
  </section>}
  {(error||result?.error)&&<p role="alert" className="notice error">{error||result?.error}</p>}
  <details className="raw-disclosure"><summary>Hay un día en el que no puedo entrenar</summary>
   <p>Desmarca los días que no tienes libres. Recalcularemos la propuesta automáticamente. Puedes usar un día de descanso habitual como excepción.</p>
   <div className="routine-kit-options">{days.map((dt,day)=>{
    const locked=dt<today||dt===target||dailySessions(data,dt).some(s=>s.pinned)||!!profile.preparation?.clubRecords?.[dt];
    return <label className="checkbox" key={dt}><input type="checkbox" disabled={locked} checked={!locked&&available.includes(day)} onChange={e=>{setAvailable(e.target.checked?[...available,day]:available.filter(d=>d!==day));setError('')}}/>{dayName(dt)}{dt<today?' · pasado':dt===target?' · sparring':locked?' · ya registrado':''}</label>;
   })}</div>
   <label className="field">Elegir otra semana<input type="date" value={week} min={today} onChange={e=>{if(e.target.value){setWeek(e.target.value);setTarget('');setError('')}}}/></label>
  </details>
  <div className="raw-actions"><button className="button orange" disabled={disabled||!preview} onClick={()=>{
   if(!preview)return;
   try{onChange(preview);dialog.current?.close()}catch(e){setError(e instanceof Error?e.message:'No se pudo aplicar la semana. Tu selección se conserva.')}
  }}>Guardar esta semana</button><button className="button outline" onClick={()=>dialog.current?.close()}>Cancelar</button></div>
 </dialog></>;
}
