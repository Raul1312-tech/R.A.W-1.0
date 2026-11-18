'use client';
import type {Profile} from './model';
import {planForDate} from './training-calendar-model';
import {muscleVolume,progressionFor} from './hypertrophy-model';
export default function HypertrophySummary({profile,date}:{profile:Profile;date:string}){
 const data=profile.workouts??{plans:[],logs:[]},plan=planForDate(data,date);
 if(!plan||plan.config.sport!=='hypertrophy')return null;
 const since=new Date(Date.parse(date+'T12:00:00Z')-6*86400000).toISOString().slice(0,10);
 const logged=data.logs.filter(l=>l.sport==='hypertrophy'&&l.date>=since&&l.date<=date);
 const measured=logged.flatMap(l=>l.entries).filter(e=>e.measures?.some(m=>m.reps!==null&&m.kg!==null)).length;
 const unique=[...new Map(plan.sessions.flatMap(s=>s.exercises).map(e=>[e.id,e])).values()];
 return <details className="card raw-disclosure"><summary>Mi progresión de gimnasio · {logged.length} sesiones registradas en 7 días</summary><p>{measured} ejercicios con carga y repeticiones anotadas. Marcar una serie confirma que la has realizado; por sí solo no demuestra progresión de fuerza.</p><div className="muscle-volume">{muscleVolume(logged.flatMap(l=>l.session?[{...l.session,exercises:l.session.exercises.map(e=>({...e,sets:l.entries.find(x=>x.exerciseId===e.id)?.sets??0}))}]:[])).filter(m=>m.direct).map(m=><div key={m.id}><strong>{m.name}</strong><b>{m.direct} series realizadas</b></div>)}</div>{unique.map(e=>{const advice=progressionFor(e,data.logs,date);return <details key={e.id}><summary>{e.name}{advice.kg!==null?' · última carga '+advice.kg+' kg':''}</summary><p>{advice.text}</p></details>})}</details>;
}
