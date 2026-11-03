import {z} from 'zod';
import {findExerciseRecord} from './exercise-catalog.ts';

export const trainingDays=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const whole=(min:number,max:number)=>z.number().int().min(min).max(max);
const uniqueDays=z.array(whole(0,6)).max(7).refine(v=>new Set(v).size===v.length);
export const trainingConfigSchema=z.object({
  sport:z.enum(['hypertrophy','boxing']),level:z.enum(['beginner','intermediate','advanced']),
  phase:z.enum(['base','build','deload']),days:uniqueDays,
  duration:z.union([z.literal(45),z.literal(60),z.literal(75)]),equipment:z.enum(['gym','dumbbells']),
  medicineBall:z.boolean(),conditioningDays:whole(0,2),technicalDays:uniqueDays,sparringDays:uniqueDays,
  physicalDays:uniqueDays.optional(),runningDays:uniqueDays.optional(),boxingKit:z.array(z.enum(['trapBar','box','kettlebell','landmine'])).max(4).optional(),
  limitation:z.boolean(),notes:z.string().max(800),
});
export type TrainingConfig=z.infer<typeof trainingConfigSchema>;
const exerciseSchema=z.object({id:z.string().max(100),catalogId:z.string().max(100).optional(),group:z.string().max(160).optional(),name:z.string().max(160),block:z.enum(['power','strength','muscle','core','interval']),sets:whole(1,15),dose:z.string().max(100),rest:z.string().max(100),effort:z.string().max(160),cue:z.string().max(400),alternative:z.string().max(200)});
export type Exercise=z.infer<typeof exerciseSchema>;
const sessionSchema=z.object({day:whole(0,6),title:z.string().max(120),focus:z.string().max(400),minutes:whole(0,120),kind:z.enum(['lift','conditioning','rest']),warmup:z.string().max(500),exercises:z.array(exerciseSchema).max(10)});
export type TrainingSession=z.infer<typeof sessionSchema>;
export const trainingPlanSchema=z.object({id:z.string().max(100),created:z.string().datetime(),config:trainingConfigSchema,sessions:z.array(sessionSchema).length(7),warnings:z.array(z.string().max(500)).max(15)}).refine(p=>p.sessions.every((s,i)=>s.day===i));
export type TrainingPlan=z.infer<typeof trainingPlanSchema>;
const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v);
export const workoutLogSchema=z.object({id:z.string().max(200),planId:z.string().max(100),day:whole(0,6),date:dateSchema,title:z.string().max(120),sport:z.enum(['hypertrophy','boxing']),minutes:whole(1,240),rpe:z.number().min(1).max(10),notes:z.string().max(1000),entries:z.array(z.object({exerciseId:z.string().max(100),name:z.string().max(160),prescribed:z.string().max(300),sets:whole(0,20),setIndexes:z.array(whole(0,19)).max(20).optional(),actual:z.string().max(100),kg:z.number().min(0).max(500).nullable()})).max(10)});
export type WorkoutLog=z.infer<typeof workoutLogSchema>;
export const workoutDraftSchema=z.object({id:z.string().max(200),checked:z.record(z.string().max(100),z.array(whole(0,19)).max(20).refine(a=>new Set(a).size===a.length)),elapsedMs:z.number().min(0).max(86400000),runningSince:z.number().min(0).nullable(),rpe:z.number().min(1).max(10).nullable()});
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
  const work=variant?[...power(c,1),hinge,split,push,core,row]:[...power(c,0),split,press,row,core,push];
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
export function generateTrainingPlan(raw:TrainingConfig):TrainingPlan{
  // Validate source calendars before derived counts: temporarily picking a third day must not
  // poison conditioningDays, and old days must not invalidate an explicit 2 + 2 selection.
  const input=raw.sport==='boxing'&&Array.isArray(raw.physicalDays)&&Array.isArray(raw.runningDays)?{...raw,days:[],conditioningDays:0}:raw;
  const parsed=trainingConfigSchema.safeParse(input);
  if(!parsed.success){
    const field=String(parsed.error.issues[0]?.path[0]??'');
    const messages:Record<string,string>={physicalDays:'Revisa los días de físico: deben ser días distintos de lunes a domingo.',runningDays:'Revisa los días de carrera: deben ser días distintos de lunes a domingo.',days:'Revisa los días de entrenamiento: no puede haber días repetidos.',conditioningDays:'Revisa los días de carrera seleccionados.',level:'Selecciona tu experiencia en preparación física.',phase:'Selecciona la estrategia del bloque.',duration:'Selecciona 45, 60 o 75 minutos.',equipment:'Selecciona el material disponible.',notes:'Las notas pueden tener un máximo de 800 caracteres.',technicalDays:'Revisa los días de técnica.',sparringDays:'Revisa los días de sparring.'};
    throw new Error(messages[field]??'Revisa los ajustes de la rutina: falta un campo válido.');
  }
  const c=parsed.data;c.days=[...c.days].sort((a,b)=>a-b);
  if(c.limitation)throw new Error('Adapta primero la rutina con un profesional a la lesión o limitación indicada. El generador no prescribe rehabilitación.');
  const schedule=boxingSchedule(c);
  if(c.sport==='boxing'){
    if(schedule.physicalDays.length!==2)throw new Error('Selecciona exactamente 2 días de físico. Los días de carrera se eligen por separado.');
    if(schedule.runningDays.length>2)throw new Error('Selecciona entre 0 y 2 días de carrera.');
    if(schedule.physicalDays.some(d=>schedule.runningDays.includes(d)))throw new Error('Físico y carrera tienen selectores independientes: elige días distintos para estas dos sesiones.');
    c.physicalDays=schedule.physicalDays;c.runningDays=schedule.runningDays;
    c.conditioningDays=schedule.runningDays.length;
    c.days=[...schedule.physicalDays,...schedule.runningDays].sort((a,b)=>a-b);
  }
  if(c.sport==='hypertrophy'&&(c.days.length<2||c.days.length>5))throw new Error('Para musculación, selecciona entre 2 y 5 días de pesas.');
  if(c.sport==='hypertrophy'&&c.level==='beginner'&&c.days.length>3)throw new Error('Para este nivel, empieza con 2 o 3 días de cuerpo completo.');
  const warnings:string[]=[];
  const sorted=c.days;
  if(c.sport==='boxing'){
    warnings.push(...sparringWarnings(c));
    if(c.technicalDays.length===0&&c.sparringDays.length===0)warnings.push('No has indicado técnica ni sparring: la carga total de boxeo todavía no está contemplada.');
    if(sorted.some(d=>c.technicalDays.includes(d)))warnings.push('Hay días con técnica y preparación física: separa sesiones cuando puedas y acuerda la carga con tu entrenador.');
    warnings.push('Preparación física complementaria. La táctica, el sparring y la puesta a punto antes de competir se acuerdan con tu entrenador.');
    if(c.conditioningDays>recommendBoxing(c).conditioningDays)warnings.push('Has elegido más carrera que la propuesta inicial para tu carga declarada. Revisa esta decisión con tu entrenador.');
    if(c.level==='beginner'&&!c.medicineBall)warnings.push('Sin balón medicinal, la rotación se practica en sombra; no equivale al estímulo de un lanzamiento lastrado.');
  }
  if(sorted.some(d=>sorted.includes((d+1)%7)))warnings.push('Hay sesiones de físico o carrera en días consecutivos. Vigila el rendimiento, el sueño y las molestias antes de aumentar la carga.');
  if(c.sport==='hypertrophy'&&sorted.length<=3&&sorted.some(d=>sorted.includes((d+1)%7)))throw new Error('Separa las sesiones de cuerpo completo con al menos un día sin pesas, también entre domingo y lunes.');
  const count=c.duration===45?4:c.duration===60?5:6;
  const sessions:TrainingSession[]=trainingDays.map((_,day)=>({day,title:c.sparringDays.includes(day)?'Sparring · con tu entrenador':c.technicalDays.includes(day)?'Técnica de boxeo':'Recuperación',focus:'Sin sesión física adicional. Movilidad suave y descanso según necesidades.',minutes:0,kind:'rest',warmup:'',exercises:[]}));
  sorted.forEach((day,index)=>{
    if(c.sport==='hypertrophy'){
      const template=splits[sorted.length][index];
      sessions[day]={day,title:template.name,kind:'lift',minutes:c.duration,focus:'Acumula series de calidad y progresa en repeticiones antes de subir el peso.',warmup:'5–8 min de movimiento suave, movilidad específica y 2–3 series de aproximación del primer ejercicio. No cuentan como series de trabajo.',exercises:template.ids.slice(0,count).map(id=>lift(id,c))};
    }else if(schedule.physicalDays.includes(day)){
      const variant=schedule.physicalDays.indexOf(day);
      sessions[day]={day,title:c.level==='beginner'?(variant?'Físico B · base unilateral':'Físico A · fundamentos'):(variant?'Físico B · rotación y cadena posterior':'Físico A · fuerza y potencia'),kind:'lift',minutes:c.duration,focus:variant?'Frenar, estabilizar y volver a impulsar: potencia lateral, fuerza de cadera, apoyo unilateral y control del tronco.':'Transmitir fuerza desde el suelo: impulso vertical, rotación coordinada, fuerza unilateral y empuje. La técnica de golpeo se entrena aparte.',warmup:'8–10 min: 3 min de desplazamientos suaves; movilidad de tobillo, cadera y columna torácica; 2 ensayos suaves de cada movimiento de potencia. Añade aproximaciones antes de las cargas de fuerza.',exercises:boxingWork(c,variant)};
    }else{
      const short=schedule.runningDays.indexOf(day)===0;const reduced=c.phase==='deload';
      const bouts=reduced?4:c.level==='beginner'?5:short?8:6;
      const specific=c.phase==='build';
      sessions[day]={day,title:short?'Carrera · intervalos cortos':'Carrera · intervalos sostenidos',kind:'conditioning',minutes:reduced?25:short?30:35,focus:short?'Repite esfuerzos rápidos manteniendo la mecánica; no son sprints máximos.':'Sostén esfuerzos controlados y recupera entre repeticiones. No persigas un ritmo fijo si pierdes técnica.',warmup:'10 min de trote progresivo y movilidad. Añade 2–3 aceleraciones suaves. Termina con 5–8 min suaves.',exercises:[{id:short?'run-short':'run-long',name:short?'Intervalos de carrera cortos':'Intervalos de carrera sostenidos',block:'interval',sets:bouts,dose:short?(specific?'30 s rápidos':'20 s rápidos'):(specific?'90 s controlados':'60 s controlados'),rest:short?'90 s caminando o trotando':'120 s de trote suave',effort:reduced?'RPE 6/10':c.level==='beginner'?'RPE 6–7/10':'RPE 7–8/10, nunca a tope',cue:'Adapta el ritmo a tu nivel y terreno. Si no corres habitualmente, empieza alternando carrera y marcha. Detén la sesión si hay dolor.',alternative:'Bicicleta estática con los mismos tiempos y esfuerzo percibido'}]};
    }
  });
  if(c.phase==='deload')warnings.push('Semana de descarga: menos series o intervalos, lejos del fallo. Valora la recuperación antes de volver a subir el volumen.');
  for(const session of sessions)for(const exercise of session.exercises){
    const record=findExerciseRecord(exercise);
    if(!record)throw new Error(`Falta la ficha del ejercicio ${exercise.name}. No se ha guardado la rutina.`);
    exercise.catalogId=record.id;
  }
  return trainingPlanSchema.parse({id:crypto.randomUUID(),created:new Date().toISOString(),config:c,sessions,warnings});
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
