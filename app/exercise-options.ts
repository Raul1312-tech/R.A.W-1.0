import {findExerciseRecord,type ExerciseRecord} from './exercise-catalog.ts';
import type {Exercise} from './training-model.ts';
const core=new Set(['shoulder-tap','short-crunch','bird-dog','crunch-hold','pallof','dead-bug','side-plank','russian-twist']);
const plyo=new Set(['pogo-hop','line-hop','broad-jump','split-jump','landing','vertical-jump','lateral-bound','box-jump']);
const agility=new Set(['cone-shuffle','ladder-two','boxing-in-out','boxing-pivot']);
export function exerciseCategory(record:ExerciseRecord){return record.category??(record.id==='neck-isometric'?'Cuello':core.has(record.id)?'Abdomen':plyo.has(record.id)?'Pliometría':agility.has(record.id)?'Agilidad de pies':record.id.startsWith('run-')?'Carrera':'Fuerza y potencia')}
const doses:Record<string,string>={'shoulder-tap':'6–8 por lado','short-crunch':'8–12','bird-dog':'6 por lado · pausa 2 s','crunch-hold':'15–20 s','pogo-hop':'10 contactos','line-hop':'8 contactos','broad-jump':'3 saltos','split-jump':'4 cambios','cone-shuffle':'15–20 s','ladder-two':'2 recorridos cortos','boxing-in-out':'6 entradas y salidas','boxing-pivot':'4 por lado','side-plank':'20–30 s por lado','dead-bug':'6–8 por lado','pallof':'8–10 por lado','russian-twist':'8 por lado','run-short':'20 s rápidos','run-long':'60 s controlados'};
export function exerciseFromRecord(record:ExerciseRecord,id=crypto.randomUUID()):Exercise{
  const category=exerciseCategory(record);const power=category==='Pliometría'||category==='Agilidad de pies';
  return {id,catalogId:record.id,name:record.name,block:(category==='Abdomen'||category==='Cuello')?'core':power?'power':category==='Carrera'?'interval':'strength',sets:category==='Carrera'?5:2,dose:doses[record.id]??'6–8',rest:power?'60–90 s':category==='Abdomen'?'60 s':category==='Carrera'?'90–120 s caminando o trotando':'120 s',effort:power?'Precisión y calidad; termina si cae el control':category==='Abdomen'?'Control y respiración continua':category==='Carrera'?'RPE 6–7/10, sin esprintar al máximo':'3 repeticiones en reserva',cue:record.learn.slice(0,400),alternative:'Revisa una variante de menor dificultad con tu entrenador.',plannedKg:null};
}
export function movementExercise(id:string){const record=findExerciseRecord({catalogId:id,name:''});if(!record)throw new Error('Ejercicio no encontrado.');return exerciseFromRecord(record,'movement-'+id)}
