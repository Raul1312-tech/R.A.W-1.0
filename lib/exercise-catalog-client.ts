import {exerciseCatalog,exerciseRecordSchema,type ExerciseRecord} from '../app/exercise-catalog';
let pending:Promise<ExerciseRecord[]>|undefined;
export function loadExerciseCatalog(){
  if(!pending)pending=fetch('/api/exercises').then(async response=>{
    if(!response.ok)throw new Error('Catalog unavailable');
    const body=await response.json();
    const parsed=exerciseRecordSchema.array().min(1).max(500).safeParse(body.records);
    if(!parsed.success)throw new Error('Invalid catalog');
    const merged=new Map(exerciseCatalog.map(r=>[r.id,r]));for(const record of parsed.data)merged.set(record.id,record);
    return [...merged.values()];
  }).catch(()=>{pending=undefined;return exerciseCatalog;});
  return pending;
}
