'use client';
import SelectField from './select-field';

import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Check,Play,Pause,Undo2,ArrowRight} from 'lucide-react';
import type {Exercise,TrainingPlan,TrainingSession,WorkoutDraft,WorkoutLog} from './training-model';
import {workoutKey} from './training-model';
import {makeDraft,toggleSet,elapsedWorkout,completedSets,nextSet,finishWorkout} from './workout-progress';

export default function WorkoutSession({plan,session,date,saved,draft:stored,onDraft,onSave,disabled,explain}:{
  plan:TrainingPlan;session:TrainingSession;date:string;saved?:WorkoutLog;draft?:WorkoutDraft;
  onDraft:(draft:WorkoutDraft)=>void;onSave:(log:WorkoutLog)=>void;disabled:boolean;explain:(exercise:Exercise)=>ReactNode;
}){
  const [draft,setDraft]=useState(()=>stored??makeDraft(workoutKey(plan.id,session,date),session,saved));
  const latest=useRef(draft);
  const [now,setNow]=useState(()=>Date.now());
  const [exerciseId,setExerciseId]=useState<string>();
  const [lastSet,setLastSet]=useState<{id:string;index:number}|null>(null);
  const [review,setReview]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return ()=>clearInterval(timer);
  },[]);

  function update(value:WorkoutDraft){
    const snapshot={...value,planId:plan.id,date,session};
    latest.current=snapshot;
    setDraft(snapshot);
    onDraft(snapshot);
    setError('');
  }

  const next=nextSet(session,draft);
  const exercises=session.exercises;
  const exercise=exercises.find(ex=>ex.id===(exerciseId??next?.exerciseId))??exercises[0];
  const total=exercises.reduce((n,ex)=>n+ex.sets,0);
  const done=exercises.reduce((n,ex)=>n+completedSets(draft,ex),0);
  const index=exercise?Array.from({length:exercise.sets},(_,i)=>i).find(i=>!draft.checked[exercise.id]?.includes(i)):undefined;
  const elapsed=elapsedWorkout(draft,now);
  const seconds=Math.floor(elapsed/1000);
  const minutes=Math.min(240,Math.max(1,Math.round(seconds/60)));

  function mark(ex:Exercise,index:number){
    const value=toggleSet(latest.current,session,ex.id,index);
    update(value);
    setLastSet({id:ex.id,index});
    setExerciseId(ex.group?nextSet(session,value)?.exerciseId:ex.id);
  }
  function advance(){
    const at=exercises.indexOf(exercise);
    const later=[...exercises.slice(at+1),...exercises.slice(0,at)].find(ex=>completedSets(draft,ex)<ex.sets);
    if(later)setExerciseId(later.id);
    else if(done===total)openReview();
  }
  function clock(){
    const time=Date.now(),current=latest.current;
    update(current.runningSince===null?{...current,runningSince:time}:{...current,elapsedMs:elapsedWorkout(current,time),runningSince:null});
    setNow(time);
  }
  function openReview(){
    if(latest.current.runningSince!==null)clock();
    setReview(true);
  }
  function finish(){
    try{onSave(finishWorkout(plan,session,date,latest.current,Date.now(),saved))}
    catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la sesión.')}
  }

  return <section className="card raw-workout">
    <header><div><span className="eyebrow">{saved?'REVISAR SESIÓN':'ENTRENO EN CURSO'}</span><h2>{session.title}</h2></div><button className="button outline" type="button" disabled={disabled} onClick={clock}>{draft.runningSince===null?<Play size={17}/>:<Pause size={17}/>} {draft.runningSince===null?'Continuar reloj':'Pausar'} <span>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</span></button></header>
    <progress value={done} max={Math.max(1,total)} aria-label="Series realizadas"/>
    <p className="muted" aria-live="polite">{done} de {total} series hechas</p>
    {review?<section className="raw-workout-review">
      <h3>¿Cómo de exigente ha sido?</h3>
      <div className="raw-portions" role="group" aria-label="Esfuerzo de la sesión">{[{label:'Suave',rpe:3},{label:'Moderada',rpe:5},{label:'Dura',rpe:8}].map(({label,rpe})=><button className="button outline" type="button" aria-pressed={draft.rpe===rpe} disabled={disabled} key={rpe} onClick={()=>update({...latest.current,rpe})}>{label}</button>)}</div>
      <details className="raw-disclosure" open={elapsed===0||undefined}><summary>Ajustar duración y esfuerzo exactos</summary>
        <SelectField label="Esfuerzo del 1 al 10" value={draft.rpe??''} disabled={disabled} onValueChange={selection=>update({...latest.current,rpe:Number(selection)||null})}><option value="">Elige un valor</option>{Array.from({length:10},(_,i)=><option key={i}>{i+1}</option>)}</SelectField>
        <label className="field">Duración real en minutos<input type="number" inputMode="numeric" min={1} max={240} defaultValue={elapsed>0?minutes:''} disabled={disabled} onChange={e=>{
          const value=Number(e.target.value);
          if(Number.isInteger(value)&&value>=1&&value<=240)update({...latest.current,elapsedMs:value*60000,runningSince:null});
        }}/></label>
      </details>
      <p>{elapsed>0?minutes+' min · ':''}{done} series registradas al guardar.</p>
      {error&&<p className="notice error" role="alert">{error}</p>}
      <div className="raw-actions"><button className="button orange" disabled={disabled||!done} onClick={finish}><Check size={18}/>{saved?'Actualizar sesión':'Guardar sesión'}</button><button className="text-button" onClick={()=>setReview(false)}>Volver a los ejercicios</button></div>
    </section>:<>
      {exercise&&<article className="raw-current-exercise">
        <span className="eyebrow">{exercise.group??'EJERCICIO '+(exercises.indexOf(exercise)+1)+' DE '+exercises.length}</span>
        <h3>{exercise.name}</h3>
        <p><b>{exercise.sets} × {exercise.dose}</b> · {exercise.effort}</p>
        <p>{exercise.plannedKg!=null&&<>{exercise.plannedKg} kg previstos · </>}Descanso {exercise.rest}</p>
        <p className="raw-series-count">{index===undefined?'Ejercicio completado':(exercise.block==='interval'?'Intervalo ':'Serie ')+(index+1)+' de '+exercise.sets}</p>
        <div className="raw-actions raw-session-actions">
          {index!==undefined&&<button className="button orange" disabled={disabled} onClick={()=>mark(exercise,index)}><Check size={19}/> Serie hecha</button>}
          <button className={'button '+(index===undefined?'orange':'outline')} disabled={index!==undefined&&!exercises.some(ex=>ex!==exercise&&completedSets(draft,ex)<ex.sets)} onClick={advance}>{done===total?'Terminar sesión':'Siguiente ejercicio'} <ArrowRight size={16}/></button>
        </div>
        {lastSet&&<button className="text-button" disabled={disabled} onClick={()=>{update(toggleSet(latest.current,session,lastSet.id,lastSet.index));setExerciseId(lastSet.id);setLastSet(null)}}><Undo2 size={16}/> Deshacer última serie</button>}
        <details className="raw-disclosure"><summary>Técnica, alternativa y calentamiento</summary><p>{exercise.cue}</p><p>{exercise.alternative}</p><p>{session.warmup}</p>{explain(exercise)}</details>
      </article>}
      <details className="raw-disclosure"><summary>Ver todos los ejercicios y corregir series</summary>{exercises.map(ex=><details key={ex.id}><summary>{ex.name} · {completedSets(draft,ex)}/{ex.sets}</summary><div className="raw-actions">{Array.from({length:ex.sets},(_,i)=><button key={i} className="button outline" disabled={disabled} aria-pressed={draft.checked[ex.id]?.includes(i)??false} onClick={()=>{update(toggleSet(latest.current,session,ex.id,i));setLastSet(null)}}>Serie {i+1}</button>)}</div></details>)}</details>
      {!!done&&done<total&&<button className="text-button" onClick={openReview}>{saved?'Revisar y guardar cambios':'Terminar con las series hechas'}</button>}
    </>}
  </section>;
}
