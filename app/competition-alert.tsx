'use client';
import {TriangleAlert,Flag,CalendarDays} from 'lucide-react';
import type {Profile} from './model';
import {competitionStatus} from './competition-phase';

export default function CompetitionAlert({profile:p,date,onSettings}:{profile:Profile;date:string;onSettings?:()=>void}){
 const status=competitionStatus(p,date);if(!status)return null;
 const {context:ctx}=status,day=p.days[date];
 return <aside className={'competition-alert raw-competition '+(status.red?'competition-alert-red':'')} role={status.red?'alert':'status'} aria-label="Preparación de competición">
  <div className="competition-alert-heading">{status.red?<TriangleAlert size={27}/>:<Flag size={27}/>}<div><span className="eyebrow">{status.red?'ALERTA ROJA · PESO PENDIENTE':'OBJETIVO DE COMPETICIÓN'}</span><h2>{status.event||ctx?.label||'Hay una categoría por preparar'}</h2></div>{ctx&&<span className="competition-phase-pill">{ctx.label} · {ctx.daysToFight<0?'Finalizada':ctx.daysToFight===0?'Hoy compites':ctx.daysToFight+' días al combate'}</span>}</div>
  <p className="raw-competition-gap">{status.gap>0?status.gap.toFixed(1)+' kg pendientes para la categoría':'Categoría: '+status.target+' kg'}</p>
  <details className="raw-disclosure"><summary>Ver qué cambia hoy</summary>
  <div className="competition-metrics"><div><small>Peso de referencia {status.weightDate?'· '+status.weightDate:'· perfil'}</small><b>{status.weight} kg</b></div><div><small>Categoría</small><b>{status.target} kg</b></div><div><small>Peso pendiente</small><b>{status.gap.toFixed(1)} kg</b></div>{ctx&&<div><small>Del pesaje al combate</small><b>{Math.round(ctx.hours*10)/10} h</b></div>}</div>
  {status.needsDates?<p><b>Completa fecha y hora de pesaje y combate.</b> Son necesarias para rehacer las fases de dieta y entrenamiento; no se presupone una ventana de recuperación.</p>:ctx?.active?<><p><b>La preparación de competición tiene prioridad.</b> {p.confirmed?'Dieta, horarios y trabajo pendiente se organizan por fases; lo ya registrado se conserva.':'Completa el perfil para generar la dieta de competición.'}</p><div className="competition-timeline"><span>Campamento</span><span>Fight week · desde 7 días antes del pesaje</span><span>Pesaje · {ctx.weighDay}</span><span>{ctx.sameDay?'Recuperación y combate el mismo día':'Recuperación entre eventos'}</span><span>Combate · {ctx.fightDay}</span></div>{ctx.shortRecovery&&<p><b>Ventana corta de recuperación.</b> El plan prioriza disponibilidad de energía y revisión del peso con tu equipo.</p>}{status.red&&<p className="competition-review">Hay peso pendiente: valida la categoría y la estrategia con tu dietista deportivo y entrenador. La alerta no autoriza un corte agudo automático de agua, sal o comida.</p>}</>:<p>El evento ha terminado. La planificación habitual vuelve a tener prioridad; el historial de competición se conserva.</p>}
  {status.staleWeight&&status.active&&<p className="competition-small">Actualiza un peso reciente: esta diferencia procede de un dato antiguo o del perfil.</p>}
  {day?.competition?.error&&<p className="competition-review">{day.competition.error}</p>}
  <div className="button-row">{onSettings&&<button type="button" className="button outline" onClick={onSettings}><CalendarDays size={16}/>{status.needsDates?'Completar competición':'Revisar competición'}</button>}{status.notes&&<details><summary>Acuerdos con mi equipo</summary><p>{status.notes}</p></details>}</div>
  </details>
 </aside>;
}
