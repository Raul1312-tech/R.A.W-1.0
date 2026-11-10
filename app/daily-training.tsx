'use client';

import {useState} from 'react';
import {CalendarDays,CheckCircle2,Dumbbell,ArrowRight} from 'lucide-react';
import {trainingDays,type TrainingData,type WorkoutLog,type WorkoutDraft} from './training-model';
import {clubForDate,dailySessions,planForDate,upcomingTrainingWeek} from './training-calendar-model';
import WorkoutSession from './workout-session';
import {makeDraft} from './workout-progress';
import {ExerciseExplanation,useExerciseCatalog} from './exercise-explanation';

type Props={
  data:TrainingData; date:string; disabled:boolean; compact?:boolean; resting?:boolean; previewOnly?:boolean;
  onChange:(data:TrainingData)=>void; onLog:(log:WorkoutLog)=>void;
  onPlan:()=>void; onOpen?:()=>void; onActivity?:()=>void;
  onDate?:(date:string)=>void;
};

export default function DailyTraining({data,date,disabled,compact,resting,previewOnly,onChange,onLog,onPlan,onOpen,onActivity,onDate}:Props){
  const [selected,setSelected]=useState<string|null>(null);
  const catalog=useExerciseCatalog();
  const sessions=dailySessions(data,date);
  const plan=planForDate(data,date);
  const club=clubForDate(plan,date),technical=club==='sparring'?'Sparring':club==='technique'?'Boxeo técnico':null;
  const pending=sessions.filter(s=>!s.saved&&(!resting||s.draft));
  const active=sessions.find(s=>s.key===selected);
  const logs=data.logs.filter(l=>l.date===date);
  const week=compact?[]:upcomingTrainingWeek(data,date);
  const upcoming=week.find(day=>day.date>date&&day.sessions.some(session=>!session.saved));
  const weekSessions=week.flatMap(day=>day.sessions);

  function persist(draft:WorkoutDraft){
    onChange({...data,drafts:[...(data.drafts??[]).filter(d=>d.id!==draft.id),draft].slice(-30)});
  }
  function open(entry:(typeof sessions)[number]){
    if(!previewOnly&&!entry.draft&&!entry.saved){
      persist({...makeDraft(entry.key,entry.session),date,planId:entry.plan.id,session:entry.session,runningSince:Date.now()});
    }
    setSelected(entry.key);
  }

  if(!compact&&active)return <section className="raw-training">
    <button className="text-button" onClick={()=>setSelected(null)}>← Volver a las sesiones</button>
    {previewOnly?<article className="card raw-training-overview"><span className="eyebrow">SESIÓN PREVISTA · {active.session.minutes} MIN</span>
      <h2>{active.session.title}</h2><p>{active.session.focus}</p><p><strong>Calentamiento:</strong> {active.session.warmup}</p>
      {active.session.exercises.map(exercise=><section key={exercise.id}><h3>{exercise.name}</h3><p>{exercise.sets} × {exercise.dose} · Descanso: {exercise.rest}</p>
        <ExerciseExplanation exercise={exercise} catalog={catalog}/></section>)}
      <p className="muted">Podrás registrar esta sesión cuando llegue su fecha.</p>
    </article>:<WorkoutSession key={active.key} plan={active.plan} session={active.session} date={date} saved={active.saved} draft={active.draft}
      disabled={disabled} onDraft={persist} onSave={log=>{onLog(log);setSelected(null)}} explain={exercise=><ExerciseExplanation exercise={exercise} catalog={catalog}/>}/>
    }
  </section>;

  return <section className="raw-training" aria-label={compact?'Próximo entreno':'Sesiones del día'}>
    <div className="raw-section-label"><h2>{compact?'Próximo entreno':'Sesiones del día'}</h2>
      {!compact&&<button className="text-button" onClick={onPlan}><CalendarDays size={17}/> Ver calendario</button>}
    </div>
    {!compact&&plan&&<p className="raw-routine-ready"><CheckCircle2 size={18}/> Tu rutina está lista</p>}
    {!(compact?pending.length:sessions.length)&&<article className="card raw-empty">
      <Dumbbell size={22}/><h3>{resting?'Hoy descansas':!plan?'Aún no tienes una rutina':technical??(sessions.length?'Entreno completado':'Día sin físico ni carrera')}</h3>
      {!compact&&plan&&<p>{resting?'El descanso está aplicado a esta fecha.':technical?'Esta sesión la dirige tu entrenador en el club. El físico y la carrera se organizan en los días de tu plan.':'No tienes sesiones de físico ni carrera pendientes en esta fecha.'}</p>}
      {!plan&&!resting&&<button className="button outline" onClick={onPlan}>Crear mi rutina <ArrowRight size={16}/></button>}
      {technical&&!resting&&onActivity&&!previewOnly&&<button className="button outline" disabled={disabled} onClick={onActivity}>Registrar sesión de {technical==='Sparring'?'sparring':'boxeo'}</button>}
    </article>}
    {(compact?pending.slice(0,1):sessions).map(entry=>{
      const {session,key,draft,saved}=entry;
      const hiddenByRest=resting&&!draft&&!saved;
      return <article className="card raw-workout-card" key={key}>
        <span className="eyebrow">{saved?'REGISTRADA':draft?'EN CURSO':hiddenByRest?'DESCANSO APLICADO':session.minutes+' MIN APROX.'}</span>
        <h3>{session.title}</h3>
        {!hiddenByRest&&<button className={'button '+(compact||saved?'outline':'orange')} disabled={disabled} onClick={()=>compact?onOpen?.():open(entry)}>{compact?'Ir al entreno':previewOnly?'Ver sesión':saved?'Revisar sesión':draft?'Continuar sesión':'Empezar sesión'} <ArrowRight size={16}/></button>}
      </article>;
    })}
    {!compact&&sessions.length>0&&technical&&!resting&&<p className="notice">{technical} previsto. Acuerda el trabajo con tu entrenador. {onActivity&&!previewOnly&&<button className="text-button" disabled={disabled} onClick={onActivity}>Registrar sesión de boxeo</button>}</p>}
    {!compact&&plan&&<article className="card raw-training-overview">
      <h3>Tu semana de entrenamiento</h3>
      {upcoming&&<p>Próximo entreno · <strong>{trainingDays[upcoming.day]}</strong>: {upcoming.sessions.filter(session=>!session.saved).map(({session})=>session.title).join(' y ')}.</p>}
      {!weekSessions.length&&<p>Tienes el calendario del club guardado. Añade huecos para que podamos organizar también tu físico y tu carrera.</p>}
      <details open={!sessions.length}><summary>Ver los próximos 7 días</summary>
        <div className="raw-training-week">{week.map(day=>{
          const labels=[day.club,...day.sessions.map(({session})=>session.title+' · '+session.minutes+' min')].filter(Boolean);
          return <button type="button" key={day.date} aria-current={day.date===date?'date':undefined} disabled={!onDate}
            onClick={()=>onDate?.(day.date)}><strong>{trainingDays[day.day]} <small>{day.date.slice(8)}/{day.date.slice(5,7)}</small></strong>
            <span>{labels.join(' · ')||(day.planned?'Descanso':'Sin rutina para esta fecha')}</span><ArrowRight size={16}/></button>;
        })}</div>
      </details>
      <button className="button outline" onClick={onPlan}><CalendarDays size={17}/> {weekSessions.length?'Ver o ajustar mi rutina':'Añadir días de físico y carrera'}</button>
    </article>}
    {!compact&&logs.length>0&&<details className="card raw-disclosure"><summary>Entrenos registrados · {logs.reduce((n,l)=>n+l.minutes,0)} min</summary>{logs.map(log=><details key={log.id}><summary>{log.title} · {log.minutes} min</summary>{log.entries.filter(e=>e.sets>0).map(e=><p key={e.exerciseId}>{e.name} · {e.sets} series · {e.actual}{e.kg!==null?' · '+e.kg+' kg':''}</p>)}</details>)}</details>}
  </section>;
}
