import {boxingPhysicalCatalog,findExerciseRecord} from './exercise-catalog.ts';
import type {TrainingConfig,TrainingSession} from './training-model.ts';

/** Stable monthly rotation within the same purpose and movement pattern. Never changes running or gym progression. */
export function varyBoxingSession(session:TrainingSession,config:TrainingConfig,date:string):TrainingSession{
  if(config.exerciseRotation==='fixed'||config.sport!=='boxing'||config.catalogVersion!==2||session.kind!=='lift')return session;
  const occurrence=Math.floor((Number(date.slice(-2))-1)/7);
  if(!occurrence)return session;
  const kit=new Set(['bodyweight','space',...(config.additionalKit??[]),...(config.boxingKit??[])]);
  if(config.equipment==='gym')for(const item of ['gym','dumbbells','bench'])kit.add(item);
  if(config.equipment==='dumbbells')kit.add('dumbbells');
  if(config.medicineBall)kit.add('medicineBall');
  const level=config.level==='beginner'?1:config.level==='intermediate'?2:3;
  const reserved=new Set(session.exercises.filter(ex=>ex.plannedKg!=null).map(ex=>findExerciseRecord(ex)?.id));
  const used=new Set<string>();
  const exercises=session.exercises.map(ex=>{
    const original=findExerciseRecord(ex);
    // Keep an individually prescribed load or unfamiliar/custom movement intact.
    if(!original?.category||!original.pattern||ex.plannedKg!=null){if(original)used.add(original.id);return ex}
    const pool=boxingPhysicalCatalog.filter(r=>!reserved.has(r.id)&&r.category===original.category&&r.pattern===original.pattern&&
      (r.minLevel??1)<=level&&(r.equipment??[]).every(k=>kit.has(k))&&
      !(config.phase==='deload'&&r.impact==='high')&&!(config.excludedExercises??[]).some(id=>id===r.id||id==='boxing-'+r.id));
    const index=pool.findIndex(r=>r.id===original.id);
    const ordered=Array.from({length:pool.length},(_,i)=>pool[(Math.max(0,index)+occurrence+i)%pool.length]);
    const record=ordered.find(r=>!used.has(r.id));
    if(!record){used.add(original.id);return ex}
    used.add(record.id);
    if(record.id===original.id)return ex;
    // Preserve group, volume, rest and effort; reset loads when the exercise changes.
    return {...ex,id:'boxing-'+record.id,catalogId:record.id,name:record.name,cue:record.learn.slice(0,400),plannedKg:null,
      ...(record.category==='Cuello'?{dose:record.id==='neck-isometric'?'5–10 s suaves por dirección':'4–6 movimientos suaves'}:{})};
  });
  return {...session,exercises};
}
