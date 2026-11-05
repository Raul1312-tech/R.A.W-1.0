'use client';
import {useEffect,useState} from 'react';
import {coachContext,type CoachAction} from './coach-model';
import {currentWeeklyAction,type WeeklyReview} from '../lib/coach-weekly';
import type {Profile} from './model';
import CoachPreview from './coach-preview';
type Saved={id:string;review:WeeklyReview;reviewed_at:string};
export default function WeeklyCoach({profile:p,date,disabled,onApply}:{profile:Profile;date:string;disabled:boolean;onApply:(signature:string,action:CoachAction)=>void}){
 const [saved,setSaved]=useState<Saved|null>(null),[status,setStatus]=useState('Cargando revisión semanal…'),[preview,setPreview]=useState(false);
 const context=coachContext(p,date);
 useEffect(()=>{const c=new AbortController();fetch('/api/coach/weekly?profile='+encodeURIComponent(p.id),{signal:c.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);setSaved(data.review);setStatus(data.review?'':'La próxima revisión se prepara el lunes a las 08:00, hora de Madrid, aunque no abras la app.')}).catch(e=>{if(!c.signal.aborted)setStatus(e.message||'No se pudo cargar la revisión.')});return()=>c.abort()},[p.id]);
 useEffect(()=>setPreview(false),[context.signature]);
 if(!saved)return <aside className="coach-message" role="status">{status}</aside>;
 const review=saved.review,action=currentWeeklyAction(review,p,date);
 async function dismiss(){const r=await fetch('/api/coach/weekly',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:saved!.id})});if(r.ok){setSaved(null);setStatus('Revisión archivada. La próxima se prepara el lunes a las 08:00, hora de Madrid.')}else setStatus('No se pudo archivar. Puedes reintentarlo.');}
 return <section className="coach-proposal" aria-label="Revisión semanal pendiente"><span className="eyebrow">TU REVISIÓN SEMANAL ESTÁ LISTA</span><h3>Esto es lo que he revisado para ti</h3><p>Preparada el {new Date(saved.reviewed_at).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})}, sin que tuvieras que abrir la app.</p>{review.source==='rules'&&<p>La IA no estuvo disponible. Esta revisión usa las reglas del plan y no propone cambios automáticos.</p>}<p>{review.summary}</p><details><summary>Qué quiere cambiar y por qué</summary>{review.choice.priority.map(id=>review.facts.find(f=>f.id===id)).filter(f=>!!f).map(f=><article key={f!.id}><h4>{f!.title}</h4><p>{f!.text}</p><p>{f!.why}</p></article>)}</details><p>Esta es la lectura guardada de esa fecha. Antes de aceptar, volveremos a comprobar la propuesta con tus datos actuales y te mostraremos las fechas y cantidades actualizadas.</p>{action&&action!=='keep'?<button className="button outline" disabled={disabled} onClick={()=>setPreview(true)}>Revisar con mis datos actuales</button>:<p>{action==='keep'?'No hay cambios propuestos.':'La propuesta ha caducado o ya no encaja con tu plan actual. No se aplicará.'}</p>}{preview&&action&&<CoachPreview key={context.signature} profile={p} date={date} action={action} disabled={disabled} onApply={()=>onApply(context.signature,action)}/>}<button className="text-button" disabled={disabled} onClick={dismiss}>Marcar revisada y archivar</button>{status&&!status.startsWith('Cargando')&&<p role="status">{status}</p>}</section>;
}
