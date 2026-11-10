'use client';

import {useState} from 'react';
import {CalendarDays,Dumbbell,ArrowRight} from 'lucide-react';
import type {TrainingData,WorkoutLog,WorkoutDraft} from './training-model';
import {dailySessions,planForDate,weekdayOf} from './training-calendar-model';
import WorkoutSession from './workout-session';
import {makeDraft} from './workout-progress';
import {ExerciseExplanation,useExerciseCatalog} from './exercise-explanation';

type Props={
  data:TrainingData; date:string; disabled:boolean; compact?:boolean; resting?:boolean;
  onChange:(data:TrainingData)=>void; onLog:(log:WorkoutLog)=>void;
  onPlan:()=>void; onOpen?:()=>void; onActivity?:()=>void;
};

export default function DailyTraining({data,date,disabled,compact,resting,onChange,onLog,onPlan,onOpen,onActivity}:Props){
  const [selected,setSelected]=useState<string|null>(null);
  const catalog=useExerciseCatalog();
  const sessions=dailySessions(data,date);
  const plan=planForDate(data,date);
  const weekday=weekdayOf(date);
  const technical=plan?.config.sparringDays.includes(weekday)?'Sparring':plan?.config.technicalDays.includes(weekday)?'Boxeo técnico':null;
  const pending=sessions.filter(s=>!s.saved&&(!resting||s.draft));
  const active=sessions.find(s=>s.key===selected);
  const logs=data.logs.filter(l=>l.date===date);

  function persist(draft:WorkoutDraft){
    onChange({...data,drafts:[...(data.drafts??[]).filter(d=>d.id!==draft.id),draft].slice(-30)});
  }
  function open(entry:(typeof sessions)[number]){
    if(!entry.draft&&!entry.saved){
      persist({...makeDraft(entry.key,entry.session),date,planId:entry.plan.id,session:entry.session,runningSince:Date.now()});
    }
    setSelected(entry.key);
  }

  if(!compact&&active)return <section className="raw-training">
    <button className="text-button" onClick={()=>setSelected(null)}>← Volver a las sesiones</button>
    <WorkoutSession key={active.key} plan={active.plan} session={active.session} date={date} saved={active.saved} draft={active.draft}
      disabled={disabled} onDraft={persist} onSave={log=>{onLog(log);setSelected(null)}} explain={exercise=><ExerciseExplanation exercise={exercise} catalog={catalog}/>}/>
  </section>;

  return <section className="raw-training" aria-label={compact?'Próximo entreno':'Sesiones del día'}>
    <div className="raw-section-label"><h2>{compact?'Próximo entreno':'Sesiones del día'}</h2>
      {!compact&&<button className="text-button" onClick={onPlan}><CalendarDays size={17}/> Ver calendario</button>}
    </div>
    {!(compact?pending.length:sessions.length)&&<article className="card raw-empty">
      <Dumbbell size={22}/><h3>{resting?'Hoy descansas':!plan?'Aún no tienes una rutina':technical??(sessions.length?'Entreno completado':'Día sin físico ni carrera')}</h3>
      {!plan&&!resting&&<button className="button outline" onClick={onPlan}>Crear mi rutina <ArrowRight size={16}/></button>}
      {technical&&!resting&&onActivity&&<button className="text-button" onClick={onActivity}>Registrar minutos</button>}
    </article>}
    {(compact?pending.slice(0,1):sessions).map(entry=>{
      const {session,key,draft,saved}=entry;
      const hiddenByRest=resting&&!draft&&!saved;
      return <article className="card raw-workout-card" key={key}>
        <span className="eyebrow">{saved?'REGISTRADA':draft?'EN CURSO':hiddenByRest?'DESCANSO APLICADO':session.minutes+' MIN APROX.'}</span>
        <h3>{session.title}</h3>
        {!hiddenByRest&&<button className={'button '+(compact||saved?'outline':'orange')} disabled={disabled} onClick={()=>compact?onOpen?.():open(entry)}>{compact?'Ir al entreno':saved?'Revisar sesión':draft?'Continuar sesión':'Empezar sesión'} <ArrowRight size={16}/></button>}
      </article>;
    })}
    {!compact&&sessions.length>0&&technical&&!resting&&<p className="notice">{technical} previsto. Acuerda el trabajo con tu entrenador. {onActivity&&<button className="text-button" onClick={onActivity}>Registrar minutos</button>}</p>}
    {!compact&&logs.length>0&&<details className="card raw-disclosure"><summary>Entrenos registrados · {logs.reduce((n,l)=>n+l.minutes,0)} min</summary>{logs.map(log=><details key={log.id}><summary>{log.title} · {log.minutes} min</summary>{log.entries.filter(e=>e.sets>0).map(e=><p key={e.exerciseId}>{e.name} · {e.sets} series · {e.actual}{e.kg!==null?' · '+e.kg+' kg':''}</p>)}</details>)}</details>}
  </section>;
}
