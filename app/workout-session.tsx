'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Check,Play,Pause,Undo2,Flag} from 'lucide-react';
import type {Exercise,TrainingPlan,TrainingSession,WorkoutDraft,WorkoutLog} from './training-model';
import {workoutKey} from './training-model';
import {makeDraft,toggleSet,elapsedWorkout,completedSets,nextSet,finishWorkout} from './workout-progress';

export default function WorkoutSession({plan,session,date,saved,draft:stored,onDraft,onSave,disabled,explain}:{plan:TrainingPlan;session:TrainingSession;date:string;saved?:WorkoutLog;draft?:WorkoutDraft;onDraft:(d:WorkoutDraft)=>void;onSave:(l:WorkoutLog)=>void;disabled:boolean;explain:(ex:Exercise)=>ReactNode}){
  const [draft,setDraft]=useState(()=>stored??makeDraft(workoutKey(plan.id,session,date),session,saved));
  const [now,setNow]=useState(()=>Date.now());
  const [error,setError]=useState('');const [message,setMessage]=useState('');
  const [leaving,setLeaving]=useState<string|null>(null);const [review,setReview]=useState(false);
  const root=useRef<HTMLDivElement>(null);const latest=useRef(draft);latest.current=draft;
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>{clearInterval(id);if(timer.current)clearTimeout(timer.current)}},[]);
  function update(value:WorkoutDraft){const snapshot={...value,planId:plan.id,date,session:structuredClone(session)};latest.current=snapshot;setDraft(snapshot);onDraft(snapshot);setMessage('');setError('')}
  const total=session.exercises.reduce((n,e)=>n+e.sets,0);const done=session.exercises.reduce((n,e)=>n+completedSets(draft,e),0);
  const next=nextSet(session,draft);const seconds=Math.floor(elapsedWorkout(draft,now)/1000);const minutes=Math.min(240,Math.max(1,Math.round(seconds/60)));
  function mark(ex:Exercise,index:number){
    if(disabled)return;
    const nextDraft=toggleSet(latest.current,session,ex.id,index);update(nextDraft);
    if(completedSets(nextDraft,ex)===ex.sets){
      setLeaving(ex.id);if(timer.current)clearTimeout(timer.current);
      timer.current=setTimeout(()=>{setLeaving(null);root.current?.querySelector<HTMLButtonElement>('[data-next-set="true"]')?.focus({preventScroll:true})},420);
    }
  }
  function clock(){const current=latest.current;const time=Date.now();update(current.runningSince===null?{...current,runningSince:time}:{...current,elapsedMs:elapsedWorkout(current,time),runningSince:null});setNow(time)}
  function finish(){try{const current=latest.current;const time=Date.now();const stopped={...current,elapsedMs:elapsedWorkout(current,time),runningSince:null};const log=finishWorkout(plan,session,date,stopped,time,saved);onSave(log);setDraft(stopped);latest.current=stopped;setMessage('Sesión registrada. Puedes corregir las series y actualizarla sin duplicar minutos.');setError('')}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la sesión.')}}
  function card(ex:Exercise,completed=false){return <article key={ex.id} className={`workout-exercise ${leaving===ex.id?'workout-leaving':''} ${completed?'workout-done':''}`}>
    <div className="workout-card-head"><div><span className="eyebrow">{completed?'COMPLETADO':next?.exerciseId===ex.id?'AHORA TE TOCA':'EN TU SESIÓN'}</span><h3>{ex.name}</h3></div><span className="workout-count">{completedSets(draft,ex)}/{ex.sets}</span></div>
    <div className="workout-dose"><strong>{ex.dose}</strong><span>{ex.effort}</span>{ex.plannedKg!=null&&<b>{ex.plannedKg} kg previstos</b>}</div><p className="workout-rest"><b>Descanso:</b> {ex.rest}</p>
    <div className="workout-set-buttons" role="group" aria-label={`Series de ${ex.name}`}>{Array.from({length:ex.sets},(_,i)=>{const checked=(draft.checked[ex.id]??[]).includes(i);return <button key={i} type="button" disabled={disabled} aria-pressed={checked} aria-label={`${ex.name} · Serie ${i+1}${checked?' realizada':''}`} data-next-set={next?.exerciseId===ex.id&&next.set===i?'true':undefined} onClick={()=>mark(ex,i)}>{checked?<Check size={22}/>:<span className="workout-empty-check"/>}<span>{ex.block==='interval'?'Intervalo':'Serie'} {i+1}</span>{checked&&<small>Hecha</small>}</button>})}</div>
    <details className="workout-details"><summary>Indicaciones y alternativas</summary><p>{ex.cue}</p><p><b>Alternativa:</b> {ex.alternative}</p></details>{explain(ex)}
  </article>}
  const groups=[...new Set(session.exercises.map(ex=>ex.group??ex.id))];
  return <div className="workout-mode" ref={root}>
    <div className="workout-control"><div><span className="eyebrow">MODO ENTRENAMIENTO</span><h3>Una serie. Un toque.</h3><p>Marca solo lo realizado. Tu avance se guarda al marcar.</p></div><button type="button" className="button outline" disabled={disabled} onClick={clock}>{draft.runningSince===null?<Play size={18}/>:<Pause size={18}/>} {draft.runningSince===null?(seconds?'Continuar':'Empezar sesión'):'Pausar'}<span>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</span></button></div>
    <div className="workout-progress" role="progressbar" aria-label="Series realizadas" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}><span style={{width:`${done/total*100}%`}}/></div><p className="workout-progress-label" aria-live="polite">{done} de {total} series · {next?`Siguiente: ${session.exercises.find(ex=>ex.id===next.exerciseId)?.name}, serie ${next.set+1}`:'Todas las series completadas'}</p>
    {groups.map(group=>{const exercises=session.exercises.filter(ex=>(ex.group??ex.id)===group);const active=exercises.filter(ex=>completedSets(draft,ex)<ex.sets||leaving===ex.id);return active.length?<section className="workout-group" key={group}>{exercises[0].group&&<header><h3>{group}</h3><p>{exercises.length>1?'Alterna los ejercicios por vuelta. Respeta el descanso indicado en cada uno.':'Completa las series con el descanso indicado.'}</p></header>}{active.map(ex=>card(ex))}</section>:null})}
    {done===total&&!leaving&&<div className="workout-celebration" role="status"><Check size={32}/><h3>Trabajo completado.</h3><p>Un toque en tu esfuerzo y guarda la sesión.</p></div>}
    {session.exercises.some(ex=>completedSets(draft,ex)===ex.sets)&&<details className="workout-completed"><summary><Check size={18}/> Completados · {session.exercises.filter(ex=>completedSets(draft,ex)===ex.sets).length}<span><Undo2 size={14}/> Revisar / desmarcar</span></summary>{session.exercises.filter(ex=>completedSets(draft,ex)===ex.sets).map(ex=>card(ex,true))}</details>}
    <div className="workout-finish"><h3>{saved?'Actualizar mi sesión':'Terminar y guardar'}</h3><p>Puedes guardar una sesión parcial. Solo cuentan las series marcadas.</p><label className="field"><span>¿Cómo de exigente ha sido? · RPE</span></label><div className="workout-rpe" role="group" aria-label="Esfuerzo de la sesión">{Array.from({length:10},(_,i)=><button type="button" disabled={disabled} key={i} aria-pressed={draft.rpe===i+1} onClick={()=>update({...latest.current,rpe:i+1})}>{i+1}</button>)}</div><p className="muted">1 muy suave · 5 moderada · 8 dura · 10 máxima</p>
    <button className="workout-review-toggle" type="button" onClick={()=>setReview(!review)}>{seconds?`Duración: ${minutes} min`:'Sin reloj · indica la duración'} · {review?'Cerrar ajuste':'Ajustar'}</button>{(review||seconds===0)&&<><div className="workout-set-buttons" role="group" aria-label="Duración de la sesión">{[15,30,45,60,75].map(value=><button type="button" disabled={disabled} key={value} onClick={()=>update({...latest.current,elapsedMs:value*60000,runningSince:null})}>{value} min</button>)}</div><label className="field"><span>Duración real en minutos · reloj en pausa al editar</span><input type="number" min={1} max={240} value={draft.elapsedMs?Math.min(240,Math.max(1,Math.round(draft.elapsedMs/60000))):''} onChange={e=>{const value=Number(e.target.value);if(value>=1&&value<=240)update({...latest.current,elapsedMs:Math.round(value)*60000,runningSince:null})}}/></label></>}
    {error&&<p className="notice error" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}
    <button type="button" className="button orange" disabled={disabled||done===0} onClick={finish}><Flag size={18}/>{saved?'Actualizar sesión':'Guardar sesión'} · {done}/{total} series</button></div>
  </div>;
}
