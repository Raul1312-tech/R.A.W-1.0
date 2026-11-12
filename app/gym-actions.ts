import type {TrainingData,TrainingSession,Exercise} from './training-model.ts';
import {dailySessions,planForDate,editCalendarDay,weekdayOf} from './training-calendar-model.ts';
import {gymLibrary} from './hypertrophy-model.ts';
import {findExerciseRecord} from './exercise-catalog.ts';
export function gymSubstitute(ex:Exercise,id:string):Exercise{
 const from=gymLibrary.find(m=>m.id===ex.catalogId),to=gymLibrary.find(m=>m.id===id),record=findExerciseRecord({catalogId:id,name:''});
 if(!from||!to||from.pattern!==to.pattern||!record)throw Error('Elige una alternativa del mismo movimiento.');
 return {...ex,id:'gym-'+id,catalogId:id,name:record.name,cue:record.steps[1].slice(0,400),plannedKg:null};
}
export function moveGymDay(data:TrainingData,from:string,to:string,today:string):TrainingData{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(to)||to<today||from===to)throw Error('Elige otra fecha de hoy en adelante.');
 const entries=dailySessions(data,from),destination=dailySessions(data,to),plan=planForDate(data,to);
 if(entries.some(e=>e.pinned))throw Error('Esta sesión ya está iniciada o registrada. Se conserva en su fecha.');
 if(entries.length!==1||entries[0].plan.config.sport!=='hypertrophy'||!plan||plan.config.sport!=='hypertrophy')throw Error('Necesitas una sesión de gimnasio y un plan guardado en el mes de destino.');
 if(destination.length)throw Error('Ese día ya tiene sesión. Elige un día de descanso para no duplicar entrenamiento.');
 let result={...data,plans:[...data.plans]};
 const save=(source:typeof plan,date:string,sessions:TrainingSession[])=>{const updated=editCalendarDay(source,date.slice(0,7),date,sessions,'date');result.plans=[...result.plans.filter(p=>p.id!==updated.id),updated].slice(-12)};
 save(entries[0].plan,from,[]);
 save(planForDate(result,to)!,to,[{...entries[0].session,day:weekdayOf(to)}]);
 return result;
}
