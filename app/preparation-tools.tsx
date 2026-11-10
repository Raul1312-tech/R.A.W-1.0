'use client';

import {useState} from 'react';
import SelectField from './select-field';
import {dateKey,targets,type Profile} from './model';
import {applyDayChange,addDays,readinessAdvice} from './preparation-engine';
import {baselineSchema,type Readiness} from './preparation-preferences';
import {clubForDate,dailySessions,planForDate} from './training-calendar-model';
import {mealSlots,mealLabels} from './meal-layout';
import {strategyProposal,applyStrategy} from './coach-strategy';
import {undoStrategy} from './strategy-version';

const formLabels={
 sleep:{good:'Bien',fair:'Regular',poor:'Mal'},
 fatigue:{low:'Ligero',mid:'Algo cansado',high:'Muy cansado'},
 pain:{none:'Sin molestias',present:'Tengo molestias'},
 motivation:{high:'Con ganas',mid:'Normal',low:'Pocas ganas'}
};
function dated<T>(values:Record<string,T>|undefined,date:string,value:T){
 return Object.fromEntries(Object.entries({...values,[date]:value}).sort(([a],[b])=>a.localeCompare(b)).slice(-90));
}
type Props={profile:Profile;date:string;disabled:boolean;onChange:(p:Profile)=>void};
export function DayPreparation({profile:p,date,disabled,onChange}:Props){
 const today=dateKey(),previous=p.preparation?.readiness?.[date],advice=previous&&readinessAdvice(previous);
 const data=p.workouts??{plans:[],logs:[]},plan=planForDate(data,date),pending=dailySessions(data,date).some(s=>!s.pinned);
 const day=p.days[date],slots=mealSlots(day?.nutrition?.mealCount??day?.foodPlan?.meals.length??p.mealCount??5).filter((_,index)=>!day?.foodPlan?.records.some(r=>r.slot===index));
 const [message,setMessage]=useState('');
 function act(action:Parameters<typeof applyDayChange>[3],arg?:number|string){
  try{onChange(applyDayChange(p,date,today,action,arg));setMessage('Plan de la fecha actualizado. Revisa tus comidas y tu entreno.')}catch(e){setMessage((e as Error).message)}
 }
 return <details className="card raw-disclosure"><summary>Cómo me encuentro y cambios de hoy</summary>
 {date===today&&<form onSubmit={e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget)) as Readiness;
  onChange({...p,preparation:{...p.preparation,readiness:dated(p.preparation?.readiness,date,values)}});setMessage('Chequeo guardado.')}}>
 <div className="form-grid">{(['sleep','fatigue','pain','motivation'] as const).map((key,i)=><SelectField key={key} required name={key} label={['Sueño','Cansancio','Molestias','Ganas de entrenar'][i]} defaultValue={previous?.[key]??''} disabled={disabled}><option value="">Elige una opción</option>{Object.entries(formLabels[key]).map(([v,label])=><option key={v} value={v}>{label}</option>)}</SelectField>)}</div>
 <button className="button outline" disabled={disabled}>Guardar chequeo</button></form>}
 {advice&&<p><strong>{advice.label}.</strong> {advice.reason}</p>}
 {date>=today&&<><div className="raw-actions"><button className="button outline" disabled={disabled||!plan} onClick={()=>act('rest')}>Hoy no entreno</button>
 <button className="button outline" disabled={disabled||!pending||advice?.action==='review'} onClick={()=>act('shorten')}>Solo tengo 25 minutos</button></div>
 {slots.length>0&&!day?.complete&&<SelectField label="Comida que haré fuera" disabled={disabled} value="" onValueChange={v=>{if(v!=='')act('outside',Number(v))}}><option value="">Elige la comida</option>{slots.map(slot=><option key={slot} value={slot}>{mealLabels[slot]}</option>)}</SelectField>}
 {clubForDate(plan,date)==='sparring'&&<form onSubmit={e=>{e.preventDefault();act('move-sparring',String(new FormData(e.currentTarget).get('destination')))}}><label className="field">Mover sparring a otra fecha<input type="date" name="destination" required min={addDays(date,1)} max={addDays(date,14)}/></label><button className="button outline" disabled={disabled}>Mover sparring</button></form>}</>}
 {message&&<p role="status">{message}</p>}</details>;
}

export function BaselineReview({profile:p,date,disabled,onChange}:Props){
 const [message,setMessage]=useState('');
 const [opened,setOpened]=useState(false);
 const rows=p.preparation?.baselines??[],proposal=opened&&date===dateKey()?strategyProposal(p,date):null;
 return <details className="card raw-disclosure" onToggle={e=>setOpened(e.currentTarget.open)}><summary>Evaluación y revisión semanal</summary>
 <p>Registra una sesión cómoda que ya hayas hecho. Usa las mismas condiciones al repetirla para poder comparar.</p>
 <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget),number=(k:string)=>f.get(k)?Number(f.get(k)):undefined;
  const result=baselineSchema.safeParse({date,runMinutes:number('runMinutes'),runEffort:f.get('runEffort')||undefined,movement:f.get('movement')||undefined,reps:number('reps'),kg:number('kg')});
  if(!result.success){setMessage('Indica duración y esfuerzo de carrera o un movimiento con sus repeticiones.');return}
  const before=p.preparation?.baselines??[];
  const next={...before.find(x=>x.date===date),...Object.fromEntries(Object.entries(result.data).filter(([,v])=>v!==undefined)),date} as typeof result.data;
  onChange({...p,preparation:{...p.preparation,baselines:[...before.filter(x=>x.date!==date),next].sort((a,b)=>a.date.localeCompare(b.date)).slice(-30)}});setMessage('Evaluación guardada.');
 }}>
 <div className="form-grid"><label className="field">Minutos caminando o trotando<input name="runMinutes" type="number" min={1} max={180}/></label>
 <SelectField label="Esfuerzo de carrera" name="runEffort"><option value="">Sin registrar</option><option value="easy">Podía hablar</option><option value="moderate">Me costaba hablar</option><option value="hard">Me resultó duro</option></SelectField>
 <SelectField label="Movimiento de referencia" name="movement"><option value="">Sin registrar</option><option value="squat">Sentadilla</option><option value="push">Empuje</option><option value="pull">Remo o tracción</option></SelectField>
 <label className="field">Repeticiones con buena técnica<input name="reps" type="number" min={1} max={100}/></label><label className="field">Carga usada (kg, opcional)<input name="kg" type="number" min={0} max={500} step=".1"/></label></div>
 <button className="button outline" disabled={disabled||date>dateKey()}>Guardar evaluación</button></form>
 {rows.length>0&&<ul>{rows.slice(-4).reverse().map(r=><li key={r.date}>{r.date} · {r.runMinutes? r.runMinutes+' min de carrera o marcha · '+({easy:'cómodo',moderate:'moderado',hard:'duro'}[r.runEffort??'easy']) : ''}{r.movement&&r.reps?' · '+({squat:'sentadilla',push:'empuje',pull:'tracción'}[r.movement])+': '+r.reps+' repeticiones'+(r.kg!==undefined?' a '+r.kg+' kg':''):''}</li>)}</ul>}
 {proposal&&<><h3>Próximos siete días</h3>
 <p>{(p.workouts?.logs??[]).filter(l=>l.date>=addDays(date,-6)&&l.date<=date).length} entrenos registrados esta semana · {Math.round(targets(p).k)} kcal de referencia.</p>
 {!!proposal.reasons.length&&<ul>{proposal.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}
 {!!proposal.training.length&&<ul>{proposal.training.map(t=><li key={t.date}>{t.date} · {t.before.map(x=>x.title+' ('+x.exercises.reduce((n,e)=>n+e.sets,0)+' series)').join(' y ')||'Descanso'} → {t.after.map(x=>x.title+' ('+x.exercises.reduce((n,e)=>n+e.sets,0)+' series)').join(' y ')||'Descanso'}</li>)}</ul>}
 {!proposal.enabled&&<p>Aún no hay cambios de estrategia para aplicar.</p>}
 {!!proposal.warnings.length&&<details><summary>Por qué el motor limita los cambios</summary><ul>{proposal.warnings.map(w=><li key={w}>{w}</li>)}</ul></details>}
 {proposal.enabled&&<button className="button outline" disabled={disabled} onClick={()=>{try{onChange(applyStrategy(p,date));setMessage('Revisión semanal aplicada.')}catch(e){setMessage((e as Error).message)}}}>Aplicar propuesta semanal</button>}</>}
 {p.strategyVersion&&<button className="button outline" disabled={disabled} onClick={()=>{try{onChange(undoStrategy(p,dateKey()));setMessage('Revisión semanal deshecha.')}catch(e){setMessage((e as Error).message)}}}>Deshacer última revisión semanal</button>}
 {!!p.preparation?.coach?.events.some(x=>x.strategy)&&<details><summary>Historial de revisiones</summary><ul>{p.preparation.coach.events.filter(x=>x.strategy).slice().reverse().map(x=><li key={x.at}>{x.date} · {x.reason}</li>)}</ul></details>}
 {message&&<p role="status">{message}</p>}</details>;
}
