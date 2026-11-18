import type {TrainingPlan,TrainingSession,WorkoutDraft,WorkoutLog} from './training-model.ts';

export function makeDraft(id:string,session:TrainingSession,saved?:WorkoutLog):WorkoutDraft{
  return {id,measurements:Object.fromEntries((saved?.entries??[]).filter(e=>e.measures).map(e=>[e.exerciseId,e.measures!])),checked:Object.fromEntries(session.exercises.map(ex=>[ex.id,saved?.entries.find(e=>e.exerciseId===ex.id)?.setIndexes??Array.from({length:Math.min(ex.sets,saved?.entries.find(e=>e.exerciseId===ex.id)?.sets??0)},(_,i)=>i)])),elapsedMs:(saved?.minutes??0)*60000,runningSince:null,rpe:saved?.rpe??null};
}
export function toggleSet(draft:WorkoutDraft,session:TrainingSession,exerciseId:string,index:number):WorkoutDraft{
  const ex=session.exercises.find(e=>e.id===exerciseId);
  if(!ex||!Number.isInteger(index)||index<0||index>=ex.sets)throw new Error('Serie no válida.');
  const list=draft.checked[exerciseId]??[];
  return {...draft,checked:{...draft.checked,[exerciseId]:list.includes(index)?list.filter(i=>i!==index):[...list,index].sort((a,b)=>a-b)}};
}
export const elapsedWorkout=(draft:WorkoutDraft,now:number)=>Math.min(86400000,draft.elapsedMs+(draft.runningSince===null?0:Math.max(0,now-draft.runningSince)));
export const completedSets=(draft:WorkoutDraft,ex:{id:string;sets:number})=>(draft.checked[ex.id]??[]).filter(i=>i>=0&&i<ex.sets).length;
export function nextSet(session:TrainingSession,draft:WorkoutDraft){
  const groups=[...new Set(session.exercises.map(ex=>ex.group??ex.id))];
  for(const group of groups){const exercises=session.exercises.filter(ex=>(ex.group??ex.id)===group);
    for(let set=0;set<Math.max(...exercises.map(ex=>ex.sets));set++)for(const ex of exercises){
      if(set<ex.sets&&!(draft.checked[ex.id]??[]).includes(set))return {exerciseId:ex.id,set};
    }
  }
  return null;
}
export function finishWorkout(plan:TrainingPlan,session:TrainingSession,date:string,draft:WorkoutDraft,now:number,saved?:WorkoutLog):WorkoutLog{
  if(!session.exercises.some(ex=>completedSets(draft,ex)))throw new Error('Marca al menos una serie realizada.');
  if(elapsedWorkout(draft,now)===0)throw new Error('Indica la duración con el ajuste de minutos o inicia el reloj al entrenar.');
  if(draft.rpe===null)throw new Error('Elige cómo de exigente ha sido la sesión (1–10).');
  const minutes=Math.min(240,Math.max(1,Math.round(elapsedWorkout(draft,now)/60000)));
  return {id:draft.id,planId:plan.id,day:session.day,date,session:structuredClone(session),title:session.title,sport:plan.config.sport,minutes,rpe:draft.rpe,notes:saved?.notes??'',entries:session.exercises.map(ex=>{
    const old=saved?.entries.find(e=>e.exerciseId===ex.id);const sets=completedSets(draft,ex);
    const measures=(draft.measurements?.[ex.id]??[]).filter(m=>(draft.checked[ex.id]??[]).includes(m.index));
    const measured=measures.filter(m=>m.reps!==null||m.kg!==null||m.rir!==null);
    const actual=measured.length?measured.map(m=>`S${m.index+1}: ${m.reps??'—'} reps · ${m.kg??'—'} kg · RIR ${m.rir??'—'}`).join(' / ').slice(0,100):old&&old.sets===sets?old.actual:'Series confirmadas · repeticiones no anotadas';
    return {measures,exerciseId:ex.id,name:ex.name,prescribed:`${ex.sets} × ${ex.dose} · ${ex.effort}${ex.plannedKg!=null?` · previstos ${ex.plannedKg} kg`:''}`.slice(0,300),sets,setIndexes:(draft.checked[ex.id]??[]).filter(i=>i>=0&&i<ex.sets),actual,kg:old?.kg??null};
  })};
}
