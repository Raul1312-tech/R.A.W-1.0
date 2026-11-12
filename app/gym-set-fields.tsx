'use client';
import type {Exercise,WorkoutDraft,WorkoutLog} from './training-model';
import {progressionFor} from './hypertrophy-model';
export default function GymSetFields({exercise,index,draft,logs,date,onChange}:{exercise:Exercise;index:number;draft:WorkoutDraft;logs:WorkoutLog[];date:string;onChange:(value:WorkoutDraft)=>void}){
 const values=draft.measurements?.[exercise.id]??[],current=values.find(v=>v.index===index)??{index,reps:null,kg:null,rir:null};
 const reference=progressionFor(exercise,logs,date);
 function patch(key:'reps'|'kg'|'rir',raw:string){const n=raw===''?null:Number(raw);if(n!==null&&(!Number.isFinite(n)||(key!=='kg'&&!Number.isInteger(n))||n<0||n>(key==='kg'?500:key==='rir'?10:100)))return;onChange({...draft,measurements:{...draft.measurements,[exercise.id]:[...values.filter(v=>v.index!==index),{...current,[key]:n}]}})}
 return <div className="gym-set-fields"><p>{reference.text}{reference.kg!==null&&<> Última carga: <b>{reference.kg} kg</b>.</>}</p><details open={values.length>0||undefined}><summary>Anotar esta serie · opcional</summary><div className="form-grid">{(['kg','reps','rir'] as const).map((key,i)=><label className="field" key={key}>{['Kg · por mancuerna o total de barra','Repeticiones realizadas','Repeticiones en reserva'][i]}<input inputMode="decimal" type="number" min={0} max={key==='kg'?500:key==='rir'?10:100} step={key==='kg'?.5:1} value={current[key]??''} placeholder={key==='kg'&&reference.kg!==null?String(reference.kg):'Sin anotar'} onChange={e=>patch(key,e.target.value)}/></label>)}</div><p>Solo se guardan como realizadas las mediciones de las series que marques. La última carga es una referencia, no un dato de hoy.</p></details></div>
}
