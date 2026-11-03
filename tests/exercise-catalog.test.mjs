import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {exerciseCatalog,exerciseRecordSchema,findExerciseRecord} from '../app/exercise-catalog.ts';
import {generateTrainingPlan,defaultTrainingConfig} from '../app/training-model.ts';

test('every catalog record has unique identity, complete guide and a persistent image asset',()=>{
  assert.equal(exerciseCatalog.length,37);
  assert.equal(new Set(exerciseCatalog.map(r=>r.id)).size,exerciseCatalog.length);
  const names=exerciseCatalog.flatMap(r=>[r.name,...r.aliases].map(n=>n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
  assert.equal(new Set(names).size,names.length);
  for(const record of exerciseCatalog){assert.ok(exerciseRecordSchema.safeParse(record).success,record.id);assert.ok(existsSync(new URL('../public'+record.image.src,import.meta.url)),record.image.src);}
});

test('all generated exercises in both sports and all equipment variants resolve by id AND legacy name',()=>{
  for(const equipment of ['gym','dumbbells'])for(const phase of ['base','build','deload'])for(const level of ['beginner','intermediate','advanced']){
    for(const days of [[0,3],[0,2,4],[0,1,3,4],[0,1,3,4,5]]){
      if(level==='beginner'&&days.length>3)continue;
      const plan=generateTrainingPlan({...defaultTrainingConfig(),equipment,phase,level,days,duration:75});
      for(const session of plan.sessions)for(const ex of session.exercises){assert.ok(ex.catalogId);assert.equal(findExerciseRecord({name:ex.name}).id,ex.catalogId);}
    }
    for(const medicineBall of [false,true]){
      const plan=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',physicalDays:[0,3],runningDays:[1,5],equipment,phase,level,medicineBall,duration:75});
      for(const session of plan.sessions)for(const ex of session.exercises){assert.equal(findExerciseRecord({name:ex.name}).id,ex.catalogId);}
    }
  }
});

test('previously text-only legacy exercises use their correct equipment illustration without changing the workout',()=>{
  for(const name of ['Remo en polea','Press de banca','Pallof press en polea','Sentadilla goblet','Peso muerto rumano','Remo con mancuerna apoyado']){
    const old={id:'legacy',name,sets:3,kg:20};const snapshot=JSON.stringify(old);
    assert.ok(findExerciseRecord(old)?.image.src);assert.equal(JSON.stringify(old),snapshot);
  }
  assert.notEqual(findExerciseRecord({name:'Remo en polea'}).id,findExerciseRecord({name:'Remo con mancuerna apoyado'}).id);
});
