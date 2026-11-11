'use client';
import {useRef,useState,useEffect} from 'react';
import SelectField from './select-field';
import type {Profile} from './model';
import {addDays} from './preparation-engine';
import {clubForDate,dailySessions,planForDate,weekdayOf} from './training-calendar-model';

import {reorganizeSparringWeek} from './sparring-week-model';
export default function SparringWeek({profile,date,today,disabled,onChange}:{profile:Profile;date:string;today:string;disabled:boolean;onChange:(p:Profile)=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [week,setWeek]=useState(date),[target,setTarget]=useState<string>(''),[error,setError]=useState(''),[preview,setPreview]=useState<Profile|null>(null);
 useEffect(()=>{setPreview(null)},[profile]);
 const [available,setAvailable]=useState(profile.onboarding?.completed?.answers.availability.slots?.map(slot=>slot.day)??planForDate(profile.workouts??{plans:[],logs:[]},date)?.config.days??[0,1,2,3,4,5,6]);
 const monday=addDays(week,-weekdayOf(week)),days=Array.from({length:7},(_,i)=>addDays(monday,i));
 return <><button className="button orange" disabled={disabled} onClick={()=>{setPreview(null);setError('');dialog.current?.showModal()}}>Cambiar sparring de esta semana</button>
 <dialog ref={dialog} className="raw-dialog"><h2>Organizar mi semana de sparring</h2>
 <p>Elige cuándo haces sparring. Revisaremos los días pendientes de físico, carrera y sus comidas.</p>
 <label className="field">Semana que quiero organizar<input type="date" value={week} onChange={e=>{if(e.target.value){setWeek(e.target.value);setTarget('');setPreview(null)}}}/></label>
 <SelectField label="Día de sparring" value={target} onValueChange={v=>{setTarget(v);setPreview(null)}}><option value="">Todavía por confirmar</option>{days.filter(dt=>dt>=today).map(dt=><option value={dt} key={dt}>{new Date(dt+'T12:00:00Z').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'})}</option>)}</SelectField>
 <fieldset><legend>Huecos disponibles esta semana para físico o carrera</legend><div className="routine-kit-options">{['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((label,day)=><label className="checkbox" key={day}><input type="checkbox" checked={available.includes(day)} onChange={e=>{setAvailable(e.target.checked?[...available,day]:available.filter(d=>d!==day));setPreview(null)}}/>{label}</label>)}</div></fieldset>
 {preview&&<ul>{days.map(dt=><li key={dt}><strong>{dt}</strong> · {clubForDate(planForDate(preview.workouts!,dt),dt)==='sparring'?'Sparring · ':''}{dailySessions(preview.workouts!,dt).map(e=>e.session.title).join(' y ')||'Sin físico ni carrera'}</li>)}</ul>}
 {error&&<p role="alert" className="notice error">{error}</p>}
 <div className="raw-actions">{preview?<button className="button orange" disabled={disabled} onClick={()=>{onChange(preview);dialog.current?.close()}}>Aplicar semana reorganizada</button>:<button className="button orange" disabled={disabled} onClick={()=>{try{setPreview(reorganizeSparringWeek(profile,week,target||null,today,available));setError('')}catch(e){setError((e as Error).message)}}}>Ver propuesta de la semana</button>}
 <button className="button outline" onClick={()=>dialog.current?.close()}>Cerrar</button></div>
 </dialog></>;
}
