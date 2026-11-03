import {z} from 'zod';
import {findExerciseRecord} from './exercise-catalog.ts';
import {movementExercise} from './exercise-options.ts';

export const trainingDays=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const whole=(min:number,max:number)=>z.number().int().min(min).max(max);
const uniqueDays=z.array(whole(0,6)).max(7).refine(v=>new Set(v).size===v.length);
export const trainingConfigSchema=z.object({
  sport:z.enum(['hypertrophy','boxing']),level:z.enum(['beginner','intermediate','advanced']),
  phase:z.enum(['base','build','deload']),days:uniqueDays,
  duration:z.union([z.literal(45),z.literal(60),z.literal(75)]),equipment:z.enum(['gym','dumbbells']),
  medicineBall:z.boolean(),conditioningDays:whole(0,7),technicalDays:uniqueDays,sparringDays:uniqueDays,
  physicalDays:uniqueDays.optional(),runningDays:uniqueDays.optional(),boxingKit:z.array(z.enum(['trapBar','box','kettlebell','landmine'])).max(4).optional(),
  limitation:z.boolean(),notes:z.string().max(800),
});
export type TrainingConfig=z.infer<typeof trainingConfigSchema>;
const exerciseSchema=z.object({id:z.string().max(100),catalogId:z.string().max(100).optional(),group:z.string().max(160).optional(),name:z.string().max(160),block:z.enum(['power','strength','muscle','core','interval']),sets:whole(1,15),dose:z.string().max(100),rest:z.string().max(100),effort:z.string().max(160),cue:z.string().max(400),alternative:z.string().max(200),plannedKg:z.number().min(0).max(500).nullable().optional()});
export type Exercise=z.infer<typeof exerciseSchema>;
const sessionSchema=z.object({day:whole(0,6),slot:z.enum(['physical','running']).optional(),title:z.string().max(120),focus:z.string().max(400),minutes:whole(0,120),kind:z.enum(['lift','conditioning','rest']),warmup:z.string().max(500),exercises:z.array(exerciseSchema).max(10)});
export type TrainingSession=z.infer<typeof sessionSchema>;
const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v);
export const trainingPlanSchema=z.object({id:z.string().max(100),created:z.string().datetime(),config:trainingConfigSchema,sessions:z.array(sessionSchema).length(7),extraSessions:z.array(sessionSchema).max(7).optional(),warnings:z.array(z.string().max(500)).max(64),month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),overrides:z.array(z.object({date:dateSchema,sessions:z.array(sessionSchema).max(2)})).max(31).optional()}).refine(p=>p.sessions.every((s,i)=>s.day===i)&&(p.extraSessions??[]).every(s=>s.kind==='conditioning'&&s.slot==='running'&&p.sessions[s.day].kind==='lift')&&new Set((p.extraSessions??[]).map(s=>s.day)).size===(p.extraSessions??[]).length).refine(p=>!(p.overrides?.length)||!!p.month&&new Set(p.overrides.map(o=>o.date)).size===p.overrides.length&&p.overrides.every(o=>o.date.startsWith(p.month!+'-')&&o.sessions.every(s=>s.day===(new Date(o.date+'T12:00:00Z').getUTCDay()+6)%7&&s.kind!=='rest'&&s.exercises.length>0&&new Set(s.exercises.map(e=>e.id)).size===s.exercises.length)&&new Set(o.sessions.map(s=>s.kind)).size===o.sessions.length));
export type TrainingPlan=z.infer<typeof trainingPlanSchema>;
export const workoutLogSchema=z.object({id:z.string().max(200),planId:z.string().max(100),day:whole(0,6),date:dateSchema,session:sessionSchema.optional(),title:z.string().max(120),sport:z.enum(['hypertrophy','boxing']),minutes:whole(1,240),rpe:z.number().min(1).max(10),notes:z.string().max(1000),entries:z.array(z.object({exerciseId:z.string().max(100),name:z.string().max(160),prescribed:z.string().max(300),sets:whole(0,20),setIndexes:z.array(whole(0,19)).max(20).optional(),actual:z.string().max(100),kg:z.number().min(0).max(500).nullable()})).max(10)});
export type WorkoutLog=z.infer<typeof workoutLogSchema>;
export const workoutDraftSchema=z.object({id:z.string().max(200),planId:z.string().max(100).optional(),date:dateSchema.optional(),session:sessionSchema.optional(),checked:z.record(z.string().max(100),z.array(whole(0,19)).max(20).refine(a=>new Set(a).size===a.length)),elapsedMs:z.number().min(0).max(86400000),runningSince:z.number().min(0).nullable(),rpe:z.number().min(1).max(10).nullable()});
export type WorkoutDraft=z.infer<typeof workoutDraftSchema>;
export const trainingDataSchema=z.object({plans:z.array(trainingPlanSchema).max(12),logs:z.array(workoutLogSchema).max(200),drafts:z.array(workoutDraftSchema).max(30).optional()}).refine(v=>new Set(v.logs.map(l=>l.id)).size===v.logs.length&&new Set(v.plans.map(p=>p.id)).size===v.plans.length&&new Set((v.drafts??[]).map(d=>d.id)).size===(v.drafts??[]).length);
export type TrainingData=z.infer<typeof trainingDataSchema>;
export const defaultTrainingConfig=():TrainingConfig=>({sport:'hypertrophy',level:'beginner',phase:'base',days:[0,2,4],duration:60,equipment:'gym',medicineBall:false,conditioningDays:2,technicalDays:[],sparringDays:[],limitation:false,notes:''});
/** Recover the exact assignment used by v1 without rewriting saved plans or logs. */
export function boxingSchedule(c:TrainingConfig){
  const sorted=[...c.days].sort((a,b)=>a-b);
  const legacyPhysical=sorted.filter((_,i)=>i===0||i===(c.conditioningDays===0?1:2));
  return {physicalDays:[...(c.physicalDays??legacyPhysical)].sort((a,b)=>a-b),runningDays:[...(c.runningDays??sorted.filter(d=>!legacyPhysical.includes(d)))].sort((a,b)=>a-b)};
}
/** Materialize both legacy calendars before editing either one. Derived fields never lead the form. */
export function updateTrainingConfig(current:TrainingConfig,value:Partial<TrainingConfig>):TrainingConfig{
  const next={...current,...(current.sport==='boxing'?boxingSchedule(current):{}),...value};
  if(next.sport==='boxing'){
    const split=boxingSchedule(next);
    return {...next,...split,days:[...new Set([...split.physicalDays,...split.runningDays])].sort((a,b)=>a-b),conditioningDays:split.runningDays.length};
  }
  return next;
}
export function sparringWarnings(c:TrainingConfig){
  if(c.sport!=='boxing')return [];
  const {physicalDays,runningDays}=boxingSchedule(c);
  return [...physicalDays.map(day=>({day,label:'Físico'})),...runningDays.map(day=>({day,label:'Carrera'}))].flatMap(({day,label})=>{
    const warnings:string[]=[];
    if(c.sparringDays.includes(day))warnings.push(`${trainingDays[day]} · ${label} y sparring el mismo día. Acumular fatiga puede empeorar la calidad del sparring. Puedes mantenerlo, pero acuerda intensidad y orden con tu entrenador.`);
    if(c.sparringDays.includes((day+1)%7))warnings.push(`${trainingDays[day]} · ${label} en víspera de sparring (${trainingDays[(day+1)%7]}). No es la distribución recomendada para una sesión exigente. Puedes guardarla; valora moverla o reducir su carga con tu entrenador.`);
    return warnings;
  });
}
export function recommendBoxing(c:TrainingConfig){
  const conditioningDays=c.sparringDays.length>=2?0:c.sparringDays.length===1||c.technicalDays.length>=3||c.level==='beginner'?1:2;
  const reason=conditioningDays===0?'Con dos o más días de sparring, empieza sin carrera intensa adicional y revisa la carga con tu entrenador.':conditioningDays===1?'Por nivel o carga técnica, empieza con una sola sesión de carrera y valora cómo recuperas.':'Con la carga declarada, puedes revisar una propuesta de dos sesiones de carrera y dos de fuerza/potencia.';
  return {conditioningDays,reason};
}

// These templates are coaching starting points, not medical prescriptions.
const catalogue:Record<string,[string,string,string,string,string]>={
  squat:['Sentadilla goblet','Sentadilla goblet','Piernas','Rodillas siguen la dirección de los pies; baja hasta un rango controlable.','Prensa de piernas en gimnasio'],
  hinge:['Peso muerto rumano','Peso muerto rumano con mancuernas','Cadena posterior','Lleva la cadera atrás, carga cerca del cuerpo y espalda estable.','Puente de glúteos'],
  bench:['Press de banca','Press de suelo con mancuernas','Empuje horizontal','Controla la bajada y mantén hombros estables.','Flexiones con manos elevadas'],
  row:['Remo en polea','Remo con mancuerna apoyado','Tracción horizontal','Evita girar el tronco; lleva el codo hacia atrás.','Remo con banda'],
  pull:['Jalón al pecho','Remo con mancuernas, codos abiertos','Espalda','No tires con impulso; controla la vuelta.','Dominada asistida si dispones de barra'],
  split:['Sentadilla dividida','Sentadilla dividida con mancuernas','Piernas unilateral','Apoyo estable y recorrido sin dolor; repeticiones por pierna.','Zancada hacia atrás'],
  hip:['Hip thrust','Puente de glúteos con mancuerna','Glúteos','Extiende la cadera sin arquear la espalda.','Puente de glúteos a una pierna'],
  shoulder:['Press con mancuernas sentado','Press con mancuernas sentado','Empuje vertical','Costillas controladas; no fuerces el hombro al final del recorrido.','Press inclinado con mancuernas'],
  lateral:['Elevaciones laterales','Elevaciones laterales','Hombros','Carga ligera, sin balanceo ni encoger el cuello.','Elevación en plano escapular'],
  curl:['Curl de bíceps','Curl de bíceps con mancuernas','Brazos','Mantén el codo estable y controla el descenso.','Curl martillo'],
  triceps:['Extensión de tríceps en polea','Extensión de tríceps con mancuerna','Brazos','No conviertas el movimiento en un empuje de hombro.','Flexión con manos próximas y apoyo elevado'],
  calf:['Elevación de gemelos','Elevación de gemelos con mancuernas','Gemelos','Pausa arriba y baja controlando el talón.','Elevación unilateral con apoyo'],
  legcurl:['Curl femoral en máquina','Curl femoral deslizante','Isquiosurales','Mantén cadera estable y rango controlado.','Puente de glúteos con talones alejados'],
  core:['Pallof press en polea','Plancha lateral','Control del tronco','Evita girar el tronco o hundir la cadera; trabajo por lado.','Dead bug'],
};
function lift(id:string,c:TrainingConfig,block:Exercise['block']='muscle'):Exercise{
  const info=catalogue[id];const small=['lateral','curl','triceps','calf','legcurl'].includes(id);
  let sets=c.level==='beginner'||c.phase==='base'?2:3;if(c.phase==='deload')sets=Math.max(1,sets-1);
  return {id,name:info[c.equipment==='gym'?0:1],block:id==='core'?'core':block,sets,
    dose:id==='core'?(c.equipment==='gym'?'10–12 por lado':'20–30 s por lado'):block==='strength'?(c.level==='beginner'?'6–8':'4–6'):small?'10–15':'8–12',
    rest:block==='strength'?'150–180 s':small||id==='core'?'60–90 s':'90–150 s',
    effort:c.phase==='deload'?'4 repeticiones en reserva':c.level==='beginner'||c.phase==='base'?'3 repeticiones en reserva':'2 repeticiones en reserva',cue:info[3],alternative:info[4]};
}
function power(c:TrainingConfig,variant:number):Exercise[]{
  const novice=c.level==='beginner';const sets=c.phase==='deload'?2:3;
  return [{id:'jump-'+variant,name:novice?'Aterrizaje técnico desde puntillas':variant?'Salto lateral corto con estabilización':'Salto vertical con contramovimiento',block:'power',sets,dose:novice?'4 aterrizajes':'3 repeticiones'+(variant?' por lado':''),rest:'90–120 s',effort:novice?'Aprender el aterrizaje':'Máxima intención, sin fatiga acumulada',cue:'Pocas repeticiones. Aterriza suave y estable. Termina la serie si cae la calidad; nada de saltos desde altura.',alternative:'Elevación rápida a puntillas sin despegar'},
  {id:'rotation-'+variant,name:c.medicineBall?'Lanzamiento rotacional de balón medicinal':'Rotación técnica de cadera en sombra',block:'power',sets,dose:'4 por lado',rest:'90–120 s',effort:c.medicineBall?'Balón ligero que puedas acelerar':'Técnica rápida, sin lastre',cue:c.medicineBall?'Solo contra una pared apta y con espacio despejado; gira desde los apoyos, sin forzar la zona lumbar.':'Coordina apoyo, cadera y tronco. Sin mancuernas en las manos. Practica bajo supervisión técnica.',alternative:'Pallof press controlado (no equivale a potencia rotacional)'}];
}
function boxingWork(c:TrainingConfig,variant:number):Exercise[]{
  const work=boxingBase(c,variant);
  const coreIndex=work.findLastIndex(ex=>ex.block==='core');
  if(coreIndex>=0){
    const core=movementExercise(c.level==='beginner'?['bird-dog','short-crunch','crunch-hold'][variant]:['shoulder-tap','short-crunch','bird-dog'][variant]);
    work[coreIndex]={...core,sets:work[coreIndex].sets,group:work[coreIndex].group};
  }
  if(c.level!=='beginner'&&!c.boxingKit?.includes('box')){
    const jump=work.findIndex(ex=>ex.id==='combat-jump');
    if(jump>=0)work[jump]={...movementExercise(variant===1?'line-hop':'broad-jump'),sets:work[jump].sets,group:work[jump].group,rest:work[jump].rest};
  }
  // A short coordination block, not another fatiguing conditioning circuit.
  const footwork=movementExercise(['boxing-in-out','cone-shuffle','boxing-pivot'][variant]);
  footwork.group='Preparación · apoyos y distancia';
  return [footwork,...work];
}
function boxingBase(c:TrainingConfig,variant:number):Exercise[]{
  if(c.level!=='beginner')return experiencedBoxing(c,variant);
  const sets=c.phase==='deload'?2:c.level==='beginner'||c.phase==='base'?2:3;
  const strengthEffort=c.phase==='deload'?'4 repeticiones en reserva':'3 repeticiones en reserva · sin repeticiones lentas forzadas';
  const specific=(id:string,name:string,block:Exercise['block'],dose:string,cue:string,alternative:string):Exercise=>({id,name,block,sets,dose,rest:block==='strength'?'150–180 s':'90–120 s',effort:block==='strength'?strengthEffort:block==='core'?'Posición estable y respiración continua':id==='box-push'?'Empuje rápido; termina antes de perder velocidad':'3 repeticiones en reserva · recorrido controlado',cue,alternative});
  const split=specific('box-split','Sentadilla dividida con mancuernas','strength','5–6 por pierna','Desarrolla fuerza unilateral para impulsar y frenar la base de apoyo. Pies separados también a lo ancho; no imites una guardia demasiado estrecha.','Sentadilla dividida sin carga');
  const press=specific('box-floor','Press unilateral de suelo con mancuerna','strength','5–6 por brazo','Fuerza de empuje con el tronco estable. No es un golpe con lastre: baja controlando y empuja sin girar el cuerpo.','Press de suelo sin carga para aprender el recorrido');
  const hinge=specific('box-hinge','Peso muerto rumano con mancuernas','strength','5–6','Fuerza de cadera y cadena posterior para producir impulso; no busques velocidad a costa de la espalda.','Bisagra de cadera sin carga');
  const push=specific('box-push','Flexión inclinada con empuje rápido','muscle','5–8','Baja en unos 2 segundos y empuja rápido manteniendo las manos apoyadas. Banco estable: no hace falta despegar ni dar palmadas.','Eleva más las manos para reducir la dificultad');
  const row=specific('box-row','Remo unilateral con apoyo','muscle','8–10 por brazo','Trabajo de espalda y control escapular que complementa los empujes del boxeo. Sin tirones ni rotación lumbar.','Misma posición con una mancuerna más ligera');
  const core=specific('box-side','Plancha lateral','core','20–30 s por lado','Resiste la inclinación del tronco mientras mantienes hombro, cadera y tobillo alineados. Respira; no aguantes el aire.','Plancha lateral con rodillas apoyadas');
  const work=variant===2?[...power(c,0),press,row,hinge,core,split]:variant===1?[...power(c,1),hinge,split,push,core,row]:[...power(c,0),split,press,row,core,push];
  return work.slice(0,c.duration===45?5:c.duration===60?6:7);
}
function experiencedBoxing(c:TrainingConfig,variant:number):Exercise[]{
  const gym=c.equipment==='gym';const kit=gym?(c.boxingKit??[]):[];
  const sets=c.phase==='deload'?2:c.phase==='base'?2:3;
  const strength=c.phase==='deload'?'4 repeticiones en reserva':'2–3 repeticiones en reserva · sin fallo';
  const make=(id:string,name:string,group:string,block:Exercise['block'],dose:string,rest:string,cue:string,alternative:string):Exercise=>({id,name,group,block,sets,dose,rest,effort:block==='strength'||block==='muscle'?strength:block==='power'?'Máxima intención con carga controlable; corta si cae la velocidad':'Control y respiración; sin dolor',cue,alternative});
  const press=make('combat-press',gym?'Press de banca con mancuernas':'Press de suelo con mancuernas','A · Biserie de fuerza: empuje + tracción','strength','4–6','60–90 s antes de la tracción','Haz aproximaciones. Empuja con intención rápida y baja controlando. La carga debe permitir todas las repeticiones sin ayuda.','Press de suelo con mancuernas');
  const pull=make('combat-pull',gym?'Dominadas estrictas':'Remo unilateral con apoyo','A · Biserie de fuerza: empuje + tracción','strength',gym?'4–6':'6–8 por lado','120–180 s antes de repetir la vuelta','Alterna con el press; no es una carrera contra el reloj. Usa asistencia si necesitas conservar la reserva.','Jalón al pecho o remo unilateral con apoyo');
  const hinge=make('combat-hinge',kit.includes('trapBar')?'Peso muerto con barra hexagonal':gym?'Peso muerto rumano':'Peso muerto rumano con mancuernas','B · Fuerza de cadera + salto','strength','3–5','180 s antes del salto','Repite cada inicio desde una posición estable. Si llegas fatigado de técnica, reduce carga o separa la sesión.','Peso muerto rumano con mancuernas');
  const jump=make('combat-jump',kit.includes('box')?'Salto al cajón bajo':'Salto vertical con contramovimiento','B · Fuerza de cadera + salto','power','3 saltos de calidad','120–180 s antes de la siguiente vuelta','Recolócate entre saltos. Si la fuerza previa resta altura o control, realiza los saltos en un bloque separado al comienzo.','Salto vertical con contramovimiento');
  const rotation=make('combat-rotation',kit.includes('landmine')?'Press rotacional en landmine':c.medicineBall?'Lanzamiento rotacional de balón medicinal':gym?'Pallof press en polea':'Plancha lateral','C · Rotación y control del tronco',kit.includes('landmine')||c.medicineBall?'power':'core',kit.includes('landmine')?'5 por lado':c.medicineBall?'4 por lado':gym?'8–10 por lado':'25–35 s por lado','90–120 s','La velocidad se gana con coordinación. Sin anclaje seguro ni balón, el trabajo es de estabilidad y no un lanzamiento simulado.','Pallof press o plancha lateral');
  if(variant===2){
    const work=[{...rotation,group:'A · Coordinación y potencia'},
      {...press,group:'B · Empuje y espalda',dose:'6–8',effort:'3 repeticiones en reserva'},
      make('combat-c-row','Remo unilateral con apoyo','B · Empuje y espalda','strength','6–8 por brazo','120 s antes de repetir la vuelta','Mantén el tronco estable durante toda la tracción.','Remo en polea'),
      make('combat-c-squat','Sentadilla goblet','C · Piernas y tronco','strength','6–8','120 s','Carga delante, apoyo completo del pie y rodillas alineadas.','Sentadilla sin carga'),
      make('combat-c-core','Plancha lateral','C · Piernas y tronco','core','25–35 s por lado','60–90 s','Respira y mantén pelvis estable.','Plancha con rodillas apoyadas')];
    if(c.duration>=60)work.push(make('combat-c-shoulder','Elevaciones laterales','D · Accesorios','muscle','10–15','60–90 s','Sin balanceos ni encoger hombros.','Carga más ligera'));
    if(c.duration===75)work.push(make('combat-c-calf','Elevación de gemelos con mancuernas','D · Accesorios','muscle','10–15','60–90 s','Sube y baja controlando sobre una superficie estable.','Elevación sin carga'));
    return work;
  }
  if(!variant){
    const work=[press,pull,hinge,jump,rotation];
    if(c.duration>=60)work.push(make('combat-core',gym?'Giro ruso con pies apoyados':'Plancha lateral','C · Rotación y control del tronco','core',gym?'8 por lado':'25–35 s por lado','60–90 s antes de repetir la vuelta','Accesorio controlado, sin buscar velocidad ni máximo recorrido lumbar.','Plancha lateral'));
    if(c.duration===75)work.push(make('combat-upper','Elevaciones laterales','D · Accesorio de hombro','muscle','10–15','60–90 s','Mantén recorrido controlado y hombros lejos de las orejas.','Carga más ligera'));
    return work;
  }
  const work=[
    {...rotation,group:'A · Potencia rotacional'},
    make('combat-split','Sentadilla dividida con mancuernas','B · Biserie de fuerza unilateral + espalda','strength','5–6 por pierna','60–90 s antes del remo','Base estable, empuja el suelo con la pierna adelantada.','Sentadilla dividida sin carga'),
    make('combat-row','Remo unilateral con apoyo','B · Biserie de fuerza unilateral + espalda','strength','6–8 por brazo','120–180 s antes de repetir la vuelta','Tronco quieto, lleva el codo atrás sin girar la espalda.','Remo en polea'),
    kit.includes('kettlebell')?make('combat-swing','Swing con kettlebell','C · Potencia de cadera','power','6–8','90–120 s','Usa una carga que puedas acelerar con cadera; termina antes de perder velocidad.','Salto vertical con contramovimiento'):{...jump,group:'C · Potencia de piernas'},
    make('combat-push','Flexión inclinada con empuje rápido','D · Control y empuje','power','5–6','90–120 s','Elige una altura que permita un empuje rápido, sin despegar las manos ni fallar.','Press de suelo con mancuernas')
  ];
  if(c.duration>=60)work.push(make('combat-side','Plancha lateral','D · Control y empuje','core','25–35 s por lado','60–90 s','Mantén pelvis y hombros alineados, respira.','Plancha lateral con rodillas apoyadas'));
  if(c.duration===75&&gym)work.push(make('combat-chop','Elevación diagonal con disco','E · Accesorio diagonal','power','5 por lado','90 s','Carga ligera; gira con los apoyos y frena con control.','Pallof press en polea'));
  return work;
}
const splits:Record<number,{name:string;ids:string[]}[]>={
  2:[{name:'Cuerpo completo A',ids:['squat','bench','row','hinge','lateral','core']},{name:'Cuerpo completo B',ids:['split','shoulder','pull','hip','legcurl','curl']}],
  3:[{name:'Cuerpo completo A',ids:['squat','bench','row','hinge','lateral','core']},{name:'Cuerpo completo B',ids:['split','shoulder','pull','hip','legcurl','curl']},{name:'Cuerpo completo C',ids:['hinge','bench','row','split','triceps','calf']}],
  4:[{name:'Torso A',ids:['bench','row','shoulder','pull','lateral','triceps']},{name:'Pierna A',ids:['squat','hinge','split','legcurl','calf','core']},{name:'Torso B',ids:['shoulder','pull','bench','row','curl','lateral']},{name:'Pierna B',ids:['hinge','split','hip','legcurl','calf','core']}],
  5:[{name:'Torso',ids:['bench','row','shoulder','pull','curl','triceps']},{name:'Pierna',ids:['squat','hinge','split','legcurl','calf','core']},{name:'Empuje',ids:['bench','shoulder','lateral','triceps','core']},{name:'Tirón',ids:['pull','row','curl','lateral','core']},{name:'Pierna B',ids:['hinge','split','hip','legcurl','calf','core']}],
};
export const allTrainingSessions=(plan:TrainingPlan)=>[...plan.sessions,...(plan.extraSessions??[])].sort((a,b)=>a.day-b.day||(a.kind==='lift'?-1:1));
export const workoutKey=(planId:string,session:TrainingSession,date:string)=>planId+':'+session.day+':'+date+(session.slot?':'+session.slot:'');
export function trainingLoadWarnings(c:TrainingConfig):string[]{
  const split=boxingSchedule(c);const physical=c.sport==='boxing'?split.physicalDays:c.days;
  const running=c.sport==='boxing'?split.runningDays:[];const warnings:string[]=[];
  if(physical.length>3)warnings.push('Has elegido '+physical.length+' días de físico. Más frecuencia no garantiza más progreso: revisa volumen, intensidad y recuperación. Puedes mantener tu selección.');
  if(running.length>2)warnings.push('Has elegido '+running.length+' días de carrera por series. Acumular tantas sesiones exigentes no es lo recomendable por carga y desgaste. Puedes guardarlas; revisa intensidad y descanso.');
  const overlap=physical.filter(day=>running.includes(day));
  if(overlap.length)warnings.push('Físico y carrera coinciden en '+overlap.map(day=>trainingDays[day]).join(', ')+'. Se guardan como sesiones separadas. Vigila la fatiga acumulada y su efecto en el boxeo.');
  const triple=overlap.filter(day=>c.technicalDays.includes(day)||c.sparringDays.includes(day));
  if(triple.length)warnings.push('Hay '+triple.length+' días con físico, carrera y boxeo o sparring. Es una carga elevada; no es la distribución recomendada. La aplicación te avisa y permite continuar.');
  const busy=new Set([...physical,...running,...c.technicalDays,...c.sparringDays]);
  if(busy.size===7)warnings.push('No has dejado ningún día sin entrenamiento. La falta de recuperación puede acumular fatiga y desgaste. Puedes guardar esta semana; valora incluir descanso y revisar la carga con tu entrenador.');
  if(c.level==='beginner'&&physical.length>3)warnings.push('Para nivel inicial se aconseja empezar con menos sesiones de fuerza y aumentar gradualmente. Tu elección no se bloquea.');
  if(c.limitation)warnings.push('Has indicado dolor, lesión o limitación. Esta plantilla no se adapta a esa condición ni prescribe rehabilitación: revísala con un profesional antes de realizarla.');
  return warnings;
}
export function generateTrainingPlan(raw:TrainingConfig):TrainingPlan{
  const input=raw.sport==='boxing'&&Array.isArray(raw.physicalDays)&&Array.isArray(raw.runningDays)?{...raw,days:[],conditioningDays:0}:raw;
  const parsed=trainingConfigSchema.safeParse(input);
  if(!parsed.success){
    const field=String(parsed.error.issues[0]?.path[0]??'');
    const messages:Record<string,string>={physicalDays:'Revisa los días de físico: usa días de lunes a domingo sin duplicarlos en el mismo selector.',runningDays:'Revisa los días de carrera: usa días de lunes a domingo sin duplicarlos en el mismo selector.',days:'Revisa los días de entrenamiento.',conditioningDays:'Selecciona de 0 a 7 días de carrera.',level:'Selecciona tu experiencia en preparación física.',phase:'Selecciona la estrategia del bloque.',duration:'Selecciona 45, 60 o 75 minutos.',equipment:'Selecciona el material disponible.',notes:'Las notas pueden tener un máximo de 800 caracteres.',technicalDays:'Revisa los días de técnica.',sparringDays:'Revisa los días de sparring.'};
    throw new Error(messages[field]??'Revisa los ajustes de la rutina: falta un campo válido.');
  }
  const c=parsed.data;c.days=[...c.days].sort((a,b)=>a-b);
  const schedule=boxingSchedule(c);
  if(c.sport==='boxing'){
    c.physicalDays=schedule.physicalDays;c.runningDays=schedule.runningDays;c.conditioningDays=schedule.runningDays.length;
    c.days=[...new Set([...schedule.physicalDays,...schedule.runningDays])].sort((a,b)=>a-b);
  }
  const warnings=trainingLoadWarnings(c);const sorted=c.days;
  if(c.sport==='boxing'){
    warnings.push(...sparringWarnings(c));
    if(c.technicalDays.length===0&&c.sparringDays.length===0)warnings.push('No has indicado técnica ni sparring: la carga total de boxeo todavía no está contemplada.');
    if(sorted.some(d=>c.technicalDays.includes(d)))warnings.push('Hay días con técnica y preparación física: separa sesiones cuando puedas y acuerda la carga con tu entrenador.');
    warnings.push('Preparación física complementaria. La táctica, el sparring y la puesta a punto antes de competir se acuerdan con tu entrenador.');
    if(c.conditioningDays>recommendBoxing(c).conditioningDays)warnings.push('Has elegido más carrera que la propuesta inicial para tu carga declarada. Puedes mantenerla; revisa la recuperación con tu entrenador.');
    if(c.level==='beginner'&&!c.medicineBall)warnings.push('Sin balón medicinal, la rotación se practica en sombra; no equivale al estímulo de un lanzamiento lastrado.');
  }
  if(sorted.some(d=>sorted.includes((d+1)%7)))warnings.push('Hay sesiones en días consecutivos, también contando domingo y lunes. Vigila rendimiento, sueño y molestias antes de aumentar la carga.');
  if(c.sport==='hypertrophy'&&sorted.length<=3&&sorted.some(d=>sorted.includes((d+1)%7)))warnings.push('Se aconseja separar las sesiones de cuerpo completo con un día sin pesas. Puedes mantener estos días.');
  const count=c.duration===45?4:c.duration===60?5:6;
  const sessions:TrainingSession[]=trainingDays.map((_,day)=>({day,title:c.sparringDays.includes(day)?'Sparring · con tu entrenador':c.technicalDays.includes(day)?'Técnica de boxeo':'Recuperación',focus:'Sin sesión física adicional. Movilidad suave y descanso según necesidades.',minutes:0,kind:'rest',warmup:'',exercises:[]}));
  const extraSessions:TrainingSession[]=[];
  if(c.sport==='hypertrophy')sorted.forEach((day,index)=>{
    const extended=[splits[5][2],splits[5][3],splits[5][4],splits[5][2],splits[5][3],splits[5][4],{name:'Accesorios y tronco',ids:['lateral','curl','calf','core']}];
    const template=sorted.length===1?splits[2][0]:sorted.length>=6?extended[index]:splits[sorted.length][index];
    sessions[day]={day,slot:'physical',title:template.name,kind:'lift',minutes:c.duration,focus:'Acumula series de calidad y progresa en repeticiones antes de subir el peso.',warmup:'5–8 min suaves, movilidad específica y 2–3 aproximaciones del primer ejercicio. No cuentan como series de trabajo.',exercises:template.ids.slice(0,count).map(id=>lift(id,c))};
  });
  else{
    schedule.physicalDays.forEach((day,index)=>{
      const variant=index%3;const title=c.level==='beginner'?['Físico A · fundamentos','Físico B · base unilateral','Físico C · base de cuerpo completo'][variant]:['Físico A · fuerza y potencia','Físico B · rotación y cadena posterior','Físico C · fuerza de apoyo y tronco'][variant];
      sessions[day]={day,slot:'physical',title,kind:'lift',minutes:c.duration,focus:'Bloques complementarios de fuerza, potencia y control. Ajusta la carga a tu experiencia y a lo que hayas realizado en el ring.',warmup:'8–10 min: desplazamientos suaves, movilidad de tobillo, cadera y columna torácica. Ensaya la potencia y añade aproximaciones antes de las cargas de fuerza.',exercises:boxingWork(c,variant)};
    });
    schedule.runningDays.forEach((day,index)=>{
      const short=index%2===0;const reduced=c.phase==='deload';const bouts=reduced?4:c.level==='beginner'?5:short?8:6;const specific=c.phase==='build';
      const running:TrainingSession={day,slot:'running',title:short?'Carrera · intervalos cortos':'Carrera · intervalos sostenidos',kind:'conditioning',minutes:reduced?25:short?30:35,focus:short?'Repite esfuerzos rápidos manteniendo la mecánica; no son sprints máximos.':'Sostén esfuerzos controlados y recupera entre repeticiones. No persigas un ritmo fijo si pierdes técnica.',warmup:'10 min de trote progresivo y movilidad. Añade 2–3 aceleraciones suaves. Termina con 5–8 min suaves.',exercises:[{id:short?'run-short':'run-long',name:short?'Intervalos de carrera cortos':'Intervalos de carrera sostenidos',block:'interval',sets:bouts,dose:short?(specific?'30 s rápidos':'20 s rápidos'):(specific?'90 s controlados':'60 s controlados'),rest:short?'90 s caminando o trotando':'120 s de trote suave',effort:reduced?'RPE 6/10':c.level==='beginner'?'RPE 6–7/10':'RPE 7–8/10, nunca a tope',cue:'Adapta el ritmo a tu nivel y terreno. Si no corres habitualmente, empieza alternando carrera y marcha. Detén la sesión si hay dolor.',alternative:'Bicicleta estática con los mismos tiempos y esfuerzo percibido'}]};
      if(sessions[day].kind==='lift')extraSessions.push(running);else sessions[day]=running;
    });
  }
  if(c.phase==='deload')warnings.push('Descarga: menos series o intervalos, lejos del fallo. Valora la recuperación antes de volver a subir el volumen.');
  for(const session of [...sessions,...extraSessions])for(const exercise of session.exercises){
    const record=findExerciseRecord(exercise);if(!record)throw new Error('Falta la ficha del ejercicio '+exercise.name+'. No se ha guardado la rutina.');exercise.catalogId=record.id;
  }
  return trainingPlanSchema.parse({id:crypto.randomUUID(),created:new Date().toISOString(),config:c,sessions,extraSessions,warnings});
}

/** Replace an edited session, never double-count its minutes in the daily journal. */
export function reconcileWorkout(logs:WorkoutLog[],raw:WorkoutLog,currentMinutes:number){
  const log=workoutLogSchema.parse(raw);
  const old=logs.find(x=>x.id===log.id);
  if(old&&(old.date!==log.date||old.planId!==log.planId||old.day!==log.day))throw new Error('La identidad de la sesión no coincide.');
  if(!old&&logs.length>=200)throw new Error('Has alcanzado 200 sesiones. Exporta una copia antes de archivar tu historial.');
  const minutes=currentMinutes-(old?.minutes??0)+log.minutes;
  if(minutes<0||minutes>600)throw new Error('Revisa los minutos del registro diario antes de guardar esta sesión (máximo 600).');
  return {logs:[...logs.filter(x=>x.id!==log.id),log],minutes};
}
