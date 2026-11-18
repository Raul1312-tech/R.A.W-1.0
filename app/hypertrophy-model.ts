import type {TrainingConfig,TrainingSession,Exercise,WorkoutLog} from './training-model.ts';
import {findExerciseRecord} from './exercise-catalog.ts';
export const muscles={chest:'Pecho',back:'Espalda',shoulders:'Hombros',biceps:'Bíceps',triceps:'Tríceps',quads:'Cuádriceps',glutes:'Glúteos',hamstrings:'Isquios',calves:'Gemelos',abs:'Abdomen'};
export type Muscle=keyof typeof muscles;
type Movement={id:string;muscle:Muscle;secondary:Muscle[];kit:'gym'|'dumbbells'|'bodyweight';pattern:string;isolation?:boolean};
const move=(id:string,muscle:Muscle,secondary:Muscle[],kit:Movement['kit'],pattern:string,isolation=false):Movement=>({id,muscle,secondary,kit,pattern,isolation});
export const gymLibrary:Movement[]=[
 move('bench-press','chest',['triceps','shoulders'],'gym','press'),move('dumbbell-bench','chest',['triceps','shoulders'],'dumbbells','press'),move('floor-press','chest',['triceps','shoulders'],'dumbbells','press'),move('floor-push-up','chest',['triceps','shoulders'],'bodyweight','press'),
 move('cable-row','back',['biceps'],'gym','row'),move('dumbbell-row','back',['biceps'],'dumbbells','row'),move('chest-supported-row','back',['biceps'],'dumbbells','row'),move('lat-pulldown','back',['biceps'],'gym','pull'),move('pull-up','back',['biceps'],'gym','pull'),
 move('shoulder-press','shoulders',['triceps'],'dumbbells','overhead'),move('standing-overhead-press','shoulders',['triceps'],'dumbbells','overhead'),move('lateral-raise','shoulders',[],'dumbbells','lateral',true),move('face-pull','shoulders',['back'],'gym','rear',true),
 move('barbell-curl','biceps',[],'gym','curl',true),move('dumbbell-curl','biceps',[],'dumbbells','curl',true),move('hammer-curl','biceps',[],'dumbbells','curl',true),move('cable-triceps','triceps',[],'gym','extension',true),move('overhead-triceps','triceps',[],'dumbbells','extension',true),
 move('barbell-back-squat','quads',['glutes'],'gym','squat'),move('barbell-front-squat','quads',['glutes'],'gym','squat'),move('goblet-squat','quads',['glutes'],'dumbbells','squat'),move('split-dumbbell','quads',['glutes'],'dumbbells','unilateral'),move('split-bodyweight','quads',['glutes'],'bodyweight','unilateral'),move('reverse-lunge','quads',['glutes'],'bodyweight','unilateral'),move('bulgarian-split-squat','quads',['glutes'],'dumbbells','unilateral'),
 move('barbell-hinge','hamstrings',['glutes'],'gym','hinge'),move('dumbbell-hinge','hamstrings',['glutes'],'dumbbells','hinge'),move('machine-leg-curl','hamstrings',[],'gym','legcurl',true),move('sliding-leg-curl','hamstrings',[],'bodyweight','legcurl',true),
 move('hip-thrust','glutes',[],'gym','hip'),move('glute-bridge','glutes',[],'dumbbells','hip'),move('single-leg-bridge','glutes',[],'bodyweight','hip'),move('calf-raise','calves',[],'dumbbells','calf',true),move('seated-calf','calves',[],'dumbbells','calf',true),
 move('short-crunch','abs',[],'bodyweight','abs',true),move('reverse-crunch','abs',[],'bodyweight','abs',true),move('forearm-plank','abs',[],'bodyweight','abs',true),
];
export const gymIds=new Set(gymLibrary.map(m=>m.id));
export function muscleVolume(sessions:TrainingSession[]){
 return Object.entries(muscles).map(([id,name])=>({id:id as Muscle,name,direct:sessions.reduce((sum,s)=>sum+s.exercises.reduce((n,e)=>n+(gymLibrary.find(m=>m.id===e.catalogId)?.muscle===id?e.sets:0),0),0),indirect:sessions.reduce((sum,s)=>sum+s.exercises.reduce((n,e)=>n+(gymLibrary.find(m=>m.id===e.catalogId)?.secondary.includes(id as Muscle)?e.sets:0),0),0)}));
}
const templates={
 fullA:['squat','press','row','legcurl','lateral','calf','abs'],fullB:['hinge','pull','overhead','unilateral','extension','curl','abs'],fullC:['hip','press','row','squat','lateral','calf','abs'],
 upperA:['press','row','overhead','pull','curl','extension'],upperB:['pull','press','row','lateral','extension','curl'],
 pushA:['press','overhead','lateral','extension'],pushB:['press','lateral','overhead','extension'],
 pullA:['pull','row','rear','curl','abs'],pullB:['row','pull','curl','rear','abs'],
 legsA:['squat','legcurl','unilateral','calf','abs'],legsB:['hinge','hip','squat','legcurl','calf'],
};
const titles:Record<keyof typeof templates,string>={fullA:'Cuerpo completo A',fullB:'Cuerpo completo B',fullC:'Cuerpo completo C',upperA:'Torso A',upperB:'Torso B',pushA:'Empuje A · pecho',pushB:'Empuje B · hombros',pullA:'Tirón A · dorsal',pullB:'Tirón B · espalda',legsA:'Pierna A · cuádriceps',legsB:'Pierna B · cadena posterior'};
export function buildHypertrophy(c:TrainingConfig):TrainingSession[]{
 const days=[...c.days].sort((a,b)=>a-b),n=days.length;
 const splits:Record<number,(keyof typeof templates)[]>={0:[],1:['fullA'],2:['fullA','fullB'],3:['fullA','fullB','fullC'],4:['upperA','legsA','upperB','legsB'],5:['upperA','legsA','pushB','pullB','legsB'],6:['pushA','pullA','legsA','pushB','pullB','legsB'],7:['pushA','pullA','legsA','pushB','pullB','legsB','fullC']};
 const priority=c.muscleFocus??(c.musclePriority==='legs'?['quads','glutes']:c.musclePriority==='back'?['back']:c.musclePriority==='upper'?['chest','shoulders']:[]);
 const baseSets=c.phase==='deload'?2:c.level==='beginner'?2:3;
 return Array.from({length:7},(_,day)=>{
  const at=days.indexOf(day);if(at<0)return {day,title:'Recuperación',kind:'rest' as const,minutes:0,focus:'Descanso del gimnasio.',warmup:'',exercises:[]};
  const key=splits[n][at],variant=key.endsWith('B')?1:0;
  const limit=c.sessionLimits?.find(s=>s.day===day)?.minutes??c.duration;
  const selected=templates[key].map(pattern=>{
   const candidates=gymLibrary.filter(m=>m.pattern===pattern&&(c.equipment==='gym'||m.kit===c.equipment||m.kit==='bodyweight')&&!c.excludedExercises?.includes(m.id));
   return candidates[variant%candidates.length];
  }).filter((m):m is Movement=>!!m);
  selected.sort((a,b)=>Number(priority.includes(b.muscle))-Number(priority.includes(a.muscle)));
  let remaining=Math.max(0,limit-8);
  const exercises:Exercise[]=[];
  for(const m of selected){
   const record=findExerciseRecord({catalogId:m.id,name:''});if(!record)continue;
   const perSet=m.isolation?2:3;
   const wanted=baseSets+(priority.includes(m.muscle)&&c.phase!=='deload'&&c.level!=='beginner'?1:0);
   const sets=Math.min(wanted,Math.floor(remaining/perSet));if(sets<1)continue;
   remaining-=sets*perSet+1;
   const strength=c.strengthGoal==='strength'&&!m.isolation;
   exercises.push({id:'gym-'+m.id,catalogId:m.id,name:record.name,block:m.muscle==='abs'?'core':'muscle',sets,dose:m.id==='forearm-plank'?'20–40 s':strength?'5–8':m.isolation?'10–15':'8–12',rest:m.isolation?'90 s':'120–180 s',effort:c.phase==='deload'?'4 repeticiones en reserva':c.level==='beginner'||c.intensity==='gentle'?'3 repeticiones en reserva':'2 repeticiones en reserva',cue:record.steps[1].slice(0,400),alternative:gymLibrary.filter(x=>x.pattern===m.pattern&&x.id!==m.id).map(x=>findExerciseRecord({catalogId:x.id,name:''})?.name).filter(Boolean).slice(0,2).join(' o ').slice(0,200)||'Revisa una adaptación del mismo grupo muscular.',plannedKg:null});
  }
  return {day,slot:'physical' as const,title:titles[key],kind:'lift' as const,minutes:limit,focus:'Hipertrofia · '+(priority.length?'prioridad '+priority.map(m=>muscles[m as Muscle]).join(' y '):'desarrollo equilibrado')+'. Mantén la técnica y registra tu progresión.',warmup:'5–8 min de movilidad cómoda y series de aproximación del primer ejercicio. Las aproximaciones no cuentan como series de trabajo.',exercises};
 });
}
export function progressionFor(ex:Exercise,logs:WorkoutLog[],date:string){
 const recent=logs.filter(l=>l.sport==='hypertrophy'&&l.date<date).sort((a,b)=>b.date.localeCompare(a.date));
 const last=recent.flatMap(l=>l.entries.filter(e=>e.exerciseId===ex.id).map(e=>({date:l.date,entry:e}))).at(0);
 if(!last)return {text:'Primera referencia: elige una carga que permita cumplir el rango con el margen indicado.',kg:null};
 const measures=last.entry.measures?.filter(m=>m.reps!==null&&m.kg!==null&&m.rir!==null)??[];
 const top=Number(ex.dose.match(/\d+[–-](\d+)/)?.[1]);
 const minimumRir=ex.effort.startsWith('4')?4:ex.effort.startsWith('3')?3:2;
 const success=top&&measures.length>=ex.sets&&measures.every(m=>m.reps!>=top&&m.rir!>=minimumRir);
 return {text:success?'Completaste el rango con margen. Puedes probar el menor incremento disponible; confírmalo según técnica y sensaciones.':'Repite la referencia y busca mejorar repeticiones con el margen indicado antes de subir kilos.',kg:measures.at(-1)?.kg??last.entry.kg,date:last.date};
}
