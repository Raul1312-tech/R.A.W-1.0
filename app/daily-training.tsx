'use client';
import LateralCarousel from './lateral-carousel';
import {Dumbbell,ArrowUpRight} from 'lucide-react';
import type {TrainingData,WorkoutLog} from './training-model';
import {dailySessions,planForDate,weekdayOf} from './training-calendar-model';
import WorkoutSession from './workout-session';
import {ExerciseExplanation,useExerciseCatalog} from './exercise-explanation';
import {competitionPhase} from './competition-phase';

export default function DailyTraining({data,date,disabled,onChange,onLog,onPlan}:{data:TrainingData;date:string;disabled:boolean;onChange:(data:TrainingData)=>void;onLog:(log:WorkoutLog)=>void;onPlan:()=>void}){
  const catalog=useExerciseCatalog();const sessions=dailySessions(data,date);const plan=planForDate(data,date);const day=weekdayOf(date);
  const phase=plan?.config.competition?competitionPhase(plan.config.competition,date):undefined;
  const logs=data.logs.filter(l=>l.date===date);
  return <section className="daily-training" id="daily-training-log">
    <div className="section-head"><div><span className="eyebrow">MI DÍA / ENTRENAMIENTO</span><h2>Hoy toca pasar a la acción.</h2><p>{new Date(date+'T12:00:00Z').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'})} · {sessions.length} sesiones de físico / carrera</p></div><button className="text-button" onClick={onPlan}>Ver / editar mi calendario <ArrowUpRight size={17}/></button></div>
    {phase?.active&&phase.daysToFight<=14?<p className="notice"><b>{phase.label}: el calendario de competición tiene prioridad.</b> Las sesiones pendientes se adaptan a esta fase. El trabajo técnico y el contacto se acuerdan con tu entrenador; las sesiones ya iniciadas se conservan.</p>:plan&&(plan.config.technicalDays.includes(day)||plan.config.sparringDays.includes(day))&&<p className="notice">También está previsto {plan.config.sparringDays.includes(day)?'sparring':'boxeo técnico'}. Sigue a tu entrenador y registra sus minutos en «Registro → Tu actividad».</p>}
    {!sessions.length&&<div className="card calendar-rest"><Dumbbell size={25}/><h3>{plan?'Sin físico ni carrera para esta fecha.':'Aún no hay un plan para este mes.'}</h3><p>{plan?'La fecha seleccionada no tiene una sesión física programada. Puedes cambiarla desde el calendario.':'Diseña tu calendario en Mi rutina para tener aquí el entrenamiento de cada día.'}</p><button className="button outline" onClick={onPlan}>Abrir Mi rutina</button></div>}
    <LateralCarousel label="Sesiones del día" slides={sessions.map(({plan:executionPlan,session,key,draft,saved,pinned})=>({id:key,label:session.title,content:<article className="daily-session card">
      <header><span className="eyebrow">{session.kind==='conditioning'?'CARRERA':'FÍSICO'}</span><h3>{session.title}</h3><span>{saved?'Registrada':draft?'En curso':`${session.minutes} min previstos`}</span></header>
      <div className="daily-session-body"><p>{session.focus}</p><div className="routine-warmup"><div><b>Antes de empezar</b><p>{session.warmup}</p></div></div>{pinned&&<p className="muted">Esta sesión conserva el programa con el que empezaste, aunque edites después el calendario.</p>}<WorkoutSession plan={executionPlan} session={session} date={date} saved={saved} draft={draft} disabled={disabled} onDraft={next=>onChange({...data,drafts:[...(data.drafts??[]).filter(d=>d.id!==next.id),next].slice(-30)})} onSave={onLog} explain={ex=><ExerciseExplanation exercise={ex} catalog={catalog}/>}/></div>
    </article>}))}/>
    {logs.length>0&&<section className="card routine-history"><div className="card-title"><h3>Lo que has hecho este día.</h3><span className="pill">{logs.reduce((n,l)=>n+l.minutes,0)} min registrados</span></div>{logs.map(log=><details key={log.id}><summary><span>{log.title}</span><b>{log.minutes} min · RPE {log.rpe}</b></summary>{log.entries.filter(e=>e.sets>0).map(e=><p key={e.exerciseId}><b>{e.name}</b> · {e.sets} series · {e.actual}{e.kg!==null?` · ${e.kg} kg`:''}</p>)}<p>Carga percibida: {Math.round(log.minutes*log.rpe)} u.a.</p></details>)}</section>}
  </section>;
}
