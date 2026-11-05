'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Sparkles,ArrowRight,Check,ShieldCheck} from 'lucide-react';
import {coachContext,validateCoachChoice,type CoachFact} from './coach-model';
import {dateKey,type Profile} from './model';
import './coach.css';
import LateralCarousel from './lateral-carousel';
type Review={choice:{priority:string[];action:'keep'|'ease'};signature:string;reviewedAt:string};
function Fact({fact}:{fact:CoachFact}){return <article className={'coach-bubble '+fact.status}><span>{fact.status==='review'?'PARA REVISAR':fact.status==='missing'?'NOS FALTA CONTEXTO':'EN TU PLAN'}</span><h3>{fact.title}</h3><p>{fact.text}</p><details><summary>Por qué aparece</summary><p>{fact.why}</p></details></article>}
export function CoachNote({profile,date,area}:{profile:Profile;date:string;area:'food'|'training'}){
 const facts=coachContext(profile,date).facts;
 const fact=area==='food'?facts.find(f=>f.id==='menu-gap')??facts.find(f=>f.id==='nutrition'):facts.find(f=>f.id==='accepted')??facts.find(f=>f.id==='taper')??facts.find(f=>f.id==='sessions');
 return fact?<aside className="coach-inline"><Sparkles size={18}/><div><b>{fact.title}</b><p>{fact.text}</p><details><summary>Entender mi plan</summary><p>{fact.why}</p></details></div></aside>:null;
}
export default function CoachPanel({profile:p,date,demo,disabled,unsaved,onToggle,onApply}:{profile:Profile;date:string;demo:boolean;disabled:boolean;unsaved:boolean;onToggle:(enabled:boolean)=>void;onApply:(signature:string)=>void}){
 const context=useMemo(()=>coachContext(p,date),[p,date]);
 const [review,setReview]=useState<Review|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false),[confirm,setConfirm]=useState(false);
 const attempted=useRef('');const enabled=p.preparation?.coach?.enabled===true;
 const current=review?.signature===context.signature?review:null;
 useEffect(()=>{setConfirm(false)},[context.signature]);
 useEffect(()=>{
  if(!enabled||demo||disabled||unsaved||!p.confirmed||date!==dateKey()||attempted.current===context.signature)return;
  const controller=new AbortController();const id=setTimeout(()=>{
   attempted.current=context.signature;setBusy(true);setError('');
   fetch('/api/coach',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({profile:p.id,date,signature:context.signature})}).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error||'Revisión no disponible.');validateCoachChoice(body.choice,context);if(body.signature!==context.signature)throw new Error('La revisión corresponde a un plan anterior.');setReview(body)}).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setBusy(false)});
  },1400);return()=>{clearTimeout(id);controller.abort();setBusy(false)};
 },[enabled,demo,disabled,unsaved,p.confirmed,p.id,date,context.signature]);
 const ordered=current?[...current.choice.priority.map(id=>context.facts.find(f=>f.id===id)!),...context.facts.filter(f=>!current.choice.priority.includes(f.id))]:[...context.facts].sort((a,b)=>Number(b.status==='review')-Number(a.status==='review'));
 const selected=ordered.slice(0,3);
 return <section className="coach-panel" aria-label="Tu preparación conectada"><header><div><span className="eyebrow"><Sparkles size={16}/> TU PREPARACIÓN, CON SENTIDO</span><h2>{context.evidence.daysToFight!==null&&context.evidence.daysToFight>=0?`${context.evidence.daysToFight} días para competir. Cada decisión cuenta.`:'Lo que haces hoy tiene un porqué.'}</h2><p>Calendario, alimentación y recuperación, leídos juntos.</p></div><span className="coach-state">{busy?'Revisando con IA…':current?'Prioridades revisadas con IA':'Lectura del plan actual'}</span></header>
 <LateralCarousel label="Claves de tu preparación" slides={selected.map(f=>({id:f.id,label:f.title,content:<Fact fact={f}/>}))}/>
 <details className="coach-details"><summary>Ver la conexión completa <ArrowRight size={15}/></summary><div className="coach-bubbles">{ordered.slice(3).map(f=><Fact key={f.id} fact={f}/>)}</div><p>Las explicaciones reflejan el plan actual. La IA puede priorizar estas señales y proponer una reducción revisable de series; todavía no prescribe cambios de calorías, hidratación o suplementos.</p><p>Los cambios manuales y sesiones iniciadas tienen prioridad. La revisión no es una valoración clínica.</p></details>
 {current?.choice.action==='ease'&&context.canEase&&<div className="coach-proposal"><b>Propuesta: aliviar el volumen pendiente de esta fecha</b><p>Una serie menos por ejercicio, con un mínimo de una. Se mantienen peso, repeticiones y descansos. La alimentación y la lista de compra no cambian. Se aplicará tanto al calendario como al checklist.</p>{!confirm?<button className="button outline" disabled={disabled||unsaved||date!==dateKey()} onClick={()=>setConfirm(true)}>Revisar ajuste</button>:<div className="button-row"><button className="button orange" disabled={disabled||unsaved} onClick={()=>{onApply(context.signature);setConfirm(false)}}><Check size={16}/> Aceptar ajuste de hoy</button><button className="text-button" onClick={()=>setConfirm(false)}>Mantener mi plan</button></div>}</div>}
 {error&&<p role="status" className="coach-message">{error}</p>}
 <details className="coach-details"><summary><ShieldCheck size={16}/> {enabled?'Revisión IA activada · gestionar':'Activar revisión IA'}</summary>{demo?<p>En la demo ves las explicaciones del plan. Para usar la IA, entra en tu cuenta privada.</p>:<><p>Al activar, OpenAI recibirá un resumen de sesiones, recuperación, objetivos nutricionales y proximidad de la competición. No enviamos nombre, correo, fotos ni notas libres. Las revisiones se guardan en tu cuenta. Hasta tres revisiones por cuenta y día (UTC), sin chat ni peticiones continuas.</p><p>Se revisa automáticamente el día actual al abrir Mi día o cambiar información relevante y guardarla. La IA no modifica el plan sin tu aceptación. <a href="/privacidad">Ver privacidad</a>.</p>{enabled?<button className="text-button" disabled={disabled} onClick={()=>onToggle(false)}>Desactivar nuevas revisiones IA</button>:<><label className="checkbox"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Acepto enviar ese resumen a OpenAI para revisar mi preparación.</label><button className="button orange" disabled={!consent||disabled||!p.confirmed} onClick={()=>onToggle(true)}>Activar mi coordinador</button>{!p.confirmed&&<p>Completa y guarda tu perfil primero.</p>}</>}</>}</details>
 {current&&<small>Revisión: {new Date(current.reviewedAt).toLocaleString('es-ES')}. Los datos nuevos sustituyen esta lectura; nunca reescriben lo que ya has hecho.</small>}
 </section>;
}
