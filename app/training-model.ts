import {z} from 'zod';

export const trainingDays=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const whole=(min:number,max:number)=>z.number().int().min(min).max(max);
const uniqueDays=z.array(whole(0,6)).max(7).refine(v=>new Set(v).size===v.length);
export const trainingConfigSchema=z.object({
  sport:z.enum(['hypertrophy','boxing']),level:z.enum(['beginner','intermediate','advanced']),
  phase:z.enum(['base','build','deload']),days:uniqueDays.refine(v=>v.length>=2&&v.length<=5),
  duration:z.union([z.literal(45),z.literal(60),z.literal(75)]),equipment:z.enum(['gym','dumbbells']),
  medicineBall:z.boolean(),conditioningDays:whole(0,2),technicalDays:uniqueDays,sparringDays:uniqueDays,
  limitation:z.boolean(),notes:z.string().max(800),
});
export type TrainingConfig=z.infer<typeof trainingConfigSchema>;
const exerciseSchema=z.object({id:z.string().max(100),name:z.string().max(160),block:z.enum(['power','strength','muscle','core','interval']),sets:whole(1,15),dose:z.string().max(100),rest:z.string().max(100),effort:z.string().max(160),cue:z.string().max(400),alternative:z.string().max(200)});
export type Exercise=z.infer<typeof exerciseSchema>;
const sessionSchema=z.object({day:whole(0,6),title:z.string().max(120),focus:z.string().max(400),minutes:whole(0,120),kind:z.enum(['lift','conditioning','rest']),warmup:z.string().max(500),exercises:z.array(exerciseSchema).max(10)});
export type TrainingSession=z.infer<typeof sessionSchema>;
export const trainingPlanSchema=z.object({id:z.string().max(100),created:z.string().datetime(),config:trainingConfigSchema,sessions:z.array(sessionSchema).length(7),warnings:z.array(z.string().max(500)).max(15)}).refine(p=>p.sessions.every((s,i)=>s.day===i));
export type TrainingPlan=z.infer<typeof trainingPlanSchema>;
const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v);
export const workoutLogSchema=z.object({id:z.string().max(200),planId:z.string().max(100),day:whole(0,6),date:dateSchema,title:z.string().max(120),sport:z.enum(['hypertrophy','boxing']),minutes:whole(1,240),rpe:z.number().min(1).max(10),notes:z.string().max(1000),entries:z.array(z.object({exerciseId:z.string().max(100),name:z.string().max(160),prescribed:z.string().max(300),sets:whole(0,20),actual:z.string().max(100),kg:z.number().min(0).max(500).nullable()})).max(10)});
export type WorkoutLog=z.infer<typeof workoutLogSchema>;
export const trainingDataSchema=z.object({plans:z.array(trainingPlanSchema).max(12),logs:z.array(workoutLogSchema).max(200)}).refine(v=>new Set(v.logs.map(l=>l.id)).size===v.logs.length&&new Set(v.plans.map(p=>p.id)).size===v.plans.length);
export type TrainingData=z.infer<typeof trainingDataSchema>;
export const defaultTrainingConfig=():TrainingConfig=>({sport:'hypertrophy',level:'beginner',phase:'base',days:[0,2,4],duration:60,equipment:'gym',medicineBall:false,conditioningDays:2,technicalDays:[],sparringDays:[],limitation:false,notes:''});
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
const splits:Record<number,{name:string;ids:string[]}[]>={
  2:[{name:'Cuerpo completo A',ids:['squat','bench','row','hinge','lateral','core']},{name:'Cuerpo completo B',ids:['split','shoulder','pull','hip','legcurl','curl']}],
  3:[{name:'Cuerpo completo A',ids:['squat','bench','row','hinge','lateral','core']},{name:'Cuerpo completo B',ids:['split','shoulder','pull','hip','legcurl','curl']},{name:'Cuerpo completo C',ids:['hinge','bench','row','split','triceps','calf']}],
  4:[{name:'Torso A',ids:['bench','row','shoulder','pull','lateral','triceps']},{name:'Pierna A',ids:['squat','hinge','split','legcurl','calf','core']},{name:'Torso B',ids:['shoulder','pull','bench','row','curl','lateral']},{name:'Pierna B',ids:['hinge','split','hip','legcurl','calf','core']}],
  5:[{name:'Torso',ids:['bench','row','shoulder','pull','curl','triceps']},{name:'Pierna',ids:['squat','hinge','split','legcurl','calf','core']},{name:'Empuje',ids:['bench','shoulder','lateral','triceps','core']},{name:'Tirón',ids:['pull','row','curl','lateral','core']},{name:'Pierna B',ids:['hinge','split','hip','legcurl','calf','core']}],
};
export function generateTrainingPlan(raw:TrainingConfig):TrainingPlan{
  const parsed=trainingConfigSchema.safeParse(raw);
  if(!parsed.success)throw new Error('Revisa los ajustes: selecciona entre 2 y 5 días distintos y completa los campos de la rutina.');
  const c=parsed.data;c.days=[...c.days].sort((a,b)=>a-b);
  if(c.limitation)throw new Error('Adapta primero la rutina con un profesional a la lesión o limitación indicada. El generador no prescribe rehabilitación.');
  if(c.sport==='boxing'&&c.days.length!==2+c.conditioningDays)throw new Error(`Selecciona ${2+c.conditioningDays} días: 2 de fuerza/potencia y ${c.conditioningDays} de carrera. La técnica se programa aparte.`);
  if(c.sport==='hypertrophy'&&c.level==='beginner'&&c.days.length>3)throw new Error('Para este nivel, empieza con 2 o 3 días de cuerpo completo.');
  const warnings:string[]=[];
  const sorted=c.days;
  if(c.sport==='boxing'){
    if(sorted.some(d=>c.sparringDays.includes(d)||c.sparringDays.includes((d+1)%7)))throw new Error('Hay preparación física el mismo día o la víspera de sparring. Cambia esos días; si no encaja, revisa la distribución con tu entrenador.');
    if(c.technicalDays.length===0&&c.sparringDays.length===0)warnings.push('No has indicado técnica ni sparring: la carga total de boxeo todavía no está contemplada.');
    if(sorted.some(d=>c.technicalDays.includes(d)))warnings.push('Hay días con técnica y preparación física: separa sesiones cuando puedas y acuerda la carga con tu entrenador.');
    warnings.push('Preparación física complementaria. La táctica, el sparring y la puesta a punto antes de competir se acuerdan con tu entrenador.');
    if(c.conditioningDays>recommendBoxing(c).conditioningDays)warnings.push('Has elegido más carrera que la propuesta inicial para tu carga declarada. Revisa esta decisión con tu entrenador.');
    if(!c.medicineBall)warnings.push('Sin balón medicinal, la rotación se practica en sombra; no equivale al estímulo de un lanzamiento lastrado.');
  }
  if(sorted.some(d=>sorted.includes((d+1)%7)))warnings.push('Hay días físicos consecutivos. Vigila el rendimiento, el sueño y las molestias antes de aumentar la carga.');
  if(c.sport==='hypertrophy'&&sorted.length<=3&&sorted.some(d=>sorted.includes((d+1)%7)))throw new Error('Separa las sesiones de cuerpo completo con al menos un día sin pesas, también entre domingo y lunes.');
  const count=c.duration===45?4:c.duration===60?5:6;
  const sessions:TrainingSession[]=trainingDays.map((_,day)=>({day,title:c.sparringDays.includes(day)?'Sparring · con tu entrenador':c.technicalDays.includes(day)?'Técnica de boxeo':'Recuperación',focus:'Sin sesión física adicional. Movilidad suave y descanso según necesidades.',minutes:0,kind:'rest',warmup:'',exercises:[]}));
  sorted.forEach((day,index)=>{
    if(c.sport==='hypertrophy'){
      const template=splits[sorted.length][index];
      sessions[day]={day,title:template.name,kind:'lift',minutes:c.duration,focus:'Acumula series de calidad y progresa en repeticiones antes de subir el peso.',warmup:'5–8 min de movimiento suave, movilidad específica y 2–3 series de aproximación del primer ejercicio. No cuentan como series de trabajo.',exercises:template.ids.slice(0,count).map(id=>lift(id,c))};
    }else if(index===0||index===(c.conditioningDays===0?1:2)){
      const variant=index===0?0:1;
      const work=[...power(c,variant),...((variant?['hinge','row']:['squat','bench']).map(id=>lift(id,c,'strength'))),lift(variant?'bench':'row',c),lift('core',c)];
      sessions[day]={day,title:'Fuerza + potencia '+(variant?'B':'A'),kind:'lift',minutes:c.duration,focus:'Primero saltos y rotaciones, después fuerza y un volumen moderado de hipertrofia. Conserva velocidad y técnica.',warmup:'8–10 min: actividad suave, movilidad de tobillo/cadera/torácica y aproximaciones. Ensaya aterrizajes antes de saltar.',exercises:work.slice(0,c.duration===45?5:6)};
    }else{
      const short=index===1;const reduced=c.phase==='deload';
      const bouts=reduced?4:c.level==='beginner'?5:short?8:6;
      const specific=c.phase==='build';
      sessions[day]={day,title:short?'Carrera · intervalos cortos':'Carrera · intervalos sostenidos',kind:'conditioning',minutes:reduced?25:short?30:35,focus:short?'Repite esfuerzos rápidos manteniendo la mecánica; no son sprints máximos.':'Sostén esfuerzos controlados y recupera entre repeticiones. No persigas un ritmo fijo si pierdes técnica.',warmup:'10 min de trote progresivo y movilidad. Añade 2–3 aceleraciones suaves. Termina con 5–8 min suaves.',exercises:[{id:short?'run-short':'run-long',name:short?'Intervalos de carrera cortos':'Intervalos de carrera sostenidos',block:'interval',sets:bouts,dose:short?(specific?'30 s rápidos':'20 s rápidos'):(specific?'90 s controlados':'60 s controlados'),rest:short?'90 s caminando o trotando':'120 s de trote suave',effort:reduced?'RPE 6/10':c.level==='beginner'?'RPE 6–7/10':'RPE 7–8/10, nunca a tope',cue:'Adapta el ritmo a tu nivel y terreno. Si no corres habitualmente, empieza alternando carrera y marcha. Detén la sesión si hay dolor.',alternative:'Bicicleta estática con los mismos tiempos y esfuerzo percibido'}]};
    }
  });
  if(c.phase==='deload')warnings.push('Semana de descarga: menos series o intervalos, lejos del fallo. Valora la recuperación antes de volver a subir el volumen.');
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
