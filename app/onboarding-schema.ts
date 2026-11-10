import {foodPreferencesSchema} from './preparation-preferences.ts';
import {z} from 'zod';

export const choices={
  sport:{boxing:'Boxeo',strength:'Musculación'},
  goal:{performance:'Rendir y recuperarme mejor',gain:'Ganar masa muscular',maintain:'Mantener mi peso',competition:'Preparar una categoría de competición',unsure:'Quiero que me orientéis'},
  success:{energy:'Tener más energía',recovery:'Recuperarme mejor',strength:'Ganar fuerza',consistency:'Ser más constante',weight:'Estabilizar mi peso'},
  trend:{steady:'Se mantiene',up:'Ha subido',down:'Ha bajado',unknown:'No lo sé'},
  activity:{seated:'Paso gran parte del día sentado',mixed:'Alterno estar sentado y moverme',active:'Estoy de pie o camino bastante',physical:'Mi trabajo es físico'},
  schedule:{regular:'Horario diurno habitual',early:'Empiezo temprano',late:'Empiezo y termino tarde',variable:'Turnos u horarios variables'},
  mealSlot:{breakfast:'Desayuno',lunch:'Comida',snack:'Merienda o tentempié',dinner:'Cena',none:'Ninguna en especial'},
  mealBarrier:{time:'Me falta tiempo',appetite:'Tengo poco apetito',outside:'Suelo comer fuera',late:'Salgo tarde de entrenar',access:'No tengo comida preparada',other:'Otro motivo'},
  intake:{home:'Comida casera',packed:'Comida que llevé preparada',outside:'Restaurante o comida a domicilio',prepared:'Plato preparado',snack:'Tentempié o batido',skipped:'Me la salté'},
  foodGroup:{fruit:'Fruta o verdura',grain:'Pan, avena, arroz, pasta o patata',dairy:'Lácteos',animal:'Huevos, carne o pescado',plant:'Legumbres o tofu',fat:'Frutos secos o aceite',ready:'Dulces o aperitivos'},
  intakeSize:{small:'Ligera',usual:'Habitual para mí',large:'Abundante'},
  drink:{water:'Agua',milk:'Leche o bebida vegetal',coffee:'Café o té',soda:'Refresco',sports:'Bebida deportiva',alcohol:'Alcohol'},
  aroundTraining:{meal:'Suelo hacer una comida',snack:'Suelo tomar algo ligero',drink:'Suelo tomar una bebida o batido',nothing:'Suelo entrenar sin comer cerca de la sesión',variable:'Depende del día'},
  tolerance:{fine:'Me sienta bien',heavy:'Noto pesadez',discomfort:'Tengo molestias digestivas',unknown:'No lo tengo claro'},
  supplement:{caffeine:'Café o cafeína',energy:'Bebidas energéticas',protein:'Proteína en polvo',creatine:'Creatina',other:'Otros suplementos'},
  cook:{quick:'Hasta 10 minutos',standard:'Entre 10 y 30 minutos',batch:'Cocino por tandas',flexible:'Puedo cocinar con calma'},
  access:{home:'Suelo comer en casa',packed:'Puedo llevar comida',outside:'Suelo comer fuera',variable:'Depende del día'},
  menuStyle:{fixed:'Menú con cantidades concretas',flexible:'Opciones que pueda intercambiar'},
  foodReview:{none:'Ninguna',medical:'Tengo indicaciones de un profesional',preferPrivate:'Prefiero hablarlo en privado'},
  competition:{none:'No tengo combate previsto',possible:'Es posible, aún sin confirmar',confirmed:'Tengo un combate confirmado'},
  categoryStatus:{pending:'Pendiente de acordar',estimated:'Orientativa',confirmed:'Acordada con mi entrenador'},
  weighHistory:{none:'Sería mi primer pesaje',fine:'Ya he dado el peso y me encontré bien',affected:'Me afectó a la energía o al rendimiento',unknown:'Prefiero revisarlo con mi equipo'},
  support:{coach:'Entrenador',dietitian:'Dietista deportivo',both:'Entrenador y dietista',none:'Todavía nadie'},
  boxingExperience:{new:'Estoy empezando',regular:'Entreno con regularidad',compete:'Ya compito'},
  clubActivity:{technique:'Técnica, saco o manoplas',sparring:'Sparring',circuit:'Circuito físico del club',mixed:'Mezcla de técnica y físico'},
  roundLimit:{breath:'Me falta aire',legs:'Noto las piernas pesadas',arms:'Se me cansan los brazos',recovery:'Me cuesta recuperar entre asaltos',unknown:'Aún no lo tengo claro'},
  strengthGoal:{muscle:'Ganar músculo',strength:'Ganar fuerza',start:'Empezar a entrenar',return:'Retomar tras una pausa'},
  muscle:{balanced:'Reparto equilibrado',legs:'Piernas y glúteos',back:'Espalda',upper:'Pecho, hombros y brazos'},
  strengthFrequency:{none:'Ningún día',occasional:'Algún día suelto',oneTwo:'Uno o dos días por semana',threePlus:'Tres o más días por semana'},
  strengthPractice:{none:'Estoy empezando de cero',circuit:'Circuitos del club',bodyweight:'Ejercicios con mi peso',weights:'Máquinas, mancuernas o barra'},
  intensity:{gentle:'Empezar con calma',steady:'Entrenar con margen',experienced:'Ya manejo cargas exigentes'},
  confidence:{guided:'Quiero aprender desde cero',some:'Conozco algunos movimientos',confident:'Hago los movimientos básicos con confianza'},
  equipment:{gym:'Máquinas y pesas del gimnasio',dumbbells:'Mancuernas',bodyweight:'Mi peso corporal y espacio libre'},
  exercisePattern:{squat:'Sentadilla o levantarte de una silla',hinge:'Levantar un peso del suelo',push:'Empujar con los brazos',pull:'Remar o tirar hacia ti',core:'Estabilizar el tronco'},
  runningFrequency:{none:'Ninguna',occasional:'Alguna vez',weekly:'Una vez por semana',often:'Varias veces por semana'},
  runningMode:{walk:'Caminé',walkRun:'Alterné caminar y trotar',steady:'Troté seguido',fast:'Hice tramos rápidos'},
  runningEffort:{easy:'Podía hablar',hard:'Me costaba hablar',stop:'Tuve que parar',pain:'Tuve molestias'},
  runningPlace:{outside:'Calle, parque o pista',treadmill:'Cinta',bike:'Tengo bici estática',unknown:'Aún no lo sé'},
  recovery:{ready:'Llego con ganas de entrenar',tired:'Llego algo cansado',low:'A menudo sigo sin recuperar'},
  limitation:{none:'Ninguna',pain:'Hay dolor o una lesión',professional:'Tengo indicaciones de un profesional'},
  barrier:{time:'Falta de tiempo',schedule:'Horarios cambiantes',fatigue:'Cansancio',technique:'No sé hacer algunos ejercicios',equipment:'Falta de material',none:'Por ahora ninguna'},
  tracking:{simple:'Solo marcar la sesión',sets:'Series y repeticiones',detailed:'También peso, esfuerzo y descanso'},
  review:{weekly:'Ver una propuesta cada semana',manual:'Pedir ajustes cuando los necesite'},
  planning:{auto:'Que R.A.W. me proponga el reparto',manual:'Quiero elegir los días de físico y carrera'},
} as const;

const option=<K extends string>(values:Record<K,string>)=>z.enum(Object.keys(values) as [K,...K[]]);
const activityDay=z.number().int().min(0).max(6);
const minutes=z.number().int().min(20).max(120);
const unique=<T extends z.ZodTypeAny>(item:T,max:number)=>z.array(item).max(max).refine(values=>new Set(values).size===values.length);
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const calendarDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{
  const date=new Date(value+'T12:00:00Z');
  return Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===value;
});
const weight=z.number().finite().min(30).max(250);
const ids=unique(z.string().min(1).max(100),40);
const dayRows=<T extends z.ZodRawShape>(shape:T)=>z.array(z.object({day:activityDay,...shape}).strict()).max(7)
  .refine(rows=>new Set(rows.map(row=>row.day)).size===rows.length);

const basics=z.object({
  sport:option(choices.sport),name:z.string().min(1).max(60).refine(value=>value.trim().length>0),age:z.number().int().min(18).max(90),
  sex:z.enum(['male','female']),height:z.number().finite().min(120).max(230),weight,
  goal:option(choices.goal),goalWeight:weight.optional(),trend:option(choices.trend),activity:option(choices.activity),success:option(choices.success).optional(),
}).strict();
const nutrition=z.object({
  schedule:option(choices.schedule),currentMeals:z.number().int().min(1).max(6),mealCount:z.number().int().min(3).max(6),
  difficultMeal:option(choices.mealSlot),mealBarrier:option(choices.mealBarrier).optional(),
  wake:time.optional(),sleep:time.optional(),firstMeal:time.optional(),lastMeal:time.optional(),
  mealSources:z.object({breakfast:option(choices.intake).optional(),lunch:option(choices.intake).optional(),dinner:option(choices.intake).optional()}).strict().optional(),
  mealFoods:z.object({breakfast:unique(option(choices.foodGroup),7).optional(),lunch:unique(option(choices.foodGroup),7).optional(),dinner:unique(option(choices.foodGroup),7).optional()}).strict().optional(),
  mealSizes:z.object({breakfast:option(choices.intakeSize).optional(),lunch:option(choices.intakeSize).optional(),dinner:option(choices.intakeSize).optional()}).strict().optional(),
  drinks:unique(option(choices.drink),6).optional(),
  aroundTraining:option(choices.aroundTraining).optional(),tolerance:option(choices.tolerance).optional(),
  supplements:unique(option(choices.supplement),5).optional(),
}).strict();
const food=z.object({
  preferences:foodPreferencesSchema.optional(),
  reviewedRestrictions:z.boolean().refine(v=>v),allergies:ids,intolerances:ids,excluded:ids,preferred:ids,
  cook:option(choices.cook),access:option(choices.access),budget:z.number().finite().min(1).max(1000).optional(),
  menuStyle:option(choices.menuStyle),health:option(choices.foodReview).optional(),
}).strict();
const competition=z.object({
  status:option(choices.competition),categoryStatus:option(choices.categoryStatus).optional(),category:weight.optional(),
  weighDate:calendarDate.optional(),weighTime:time.optional(),fightDate:calendarDate.optional(),fightTime:time.optional(),
  timeZone:z.string().min(1).max(100).refine(zone=>{try{new Intl.DateTimeFormat('es',{timeZone:zone});return true}catch{return false}}).optional(),
  history:option(choices.weighHistory).optional(),support:option(choices.support).optional(),
}).strict();
const boxing=z.object({
  experience:option(choices.boxingExperience),
  club:dayRows({kind:option(choices.clubActivity),minutes:z.number().int().min(15).max(180),time:time.optional()}),
  hardestDay:activityDay.optional(),roundLimit:option(choices.roundLimit),
}).strict();
const strength=z.object({
  intensity:option(choices.intensity).optional(),
  frequency:option(choices.strengthFrequency),practice:option(choices.strengthPractice),confidence:option(choices.confidence),
  // Keep accepting scalar selections from already saved v1 profiles and drafts.
  equipment:z.union([option(choices.equipment),unique(option(choices.equipment),3)]),patterns:unique(option(choices.exercisePattern),5).optional(),
  recent:z.object({exerciseId:z.string().min(1).max(100),kg:z.number().finite().min(0).max(500).optional(),reps:z.number().int().min(1).max(100).optional(),effort:option(choices.runningEffort).optional()}).strict().optional(),
}).strict();
const muscle=z.object({
  goal:option(choices.strengthGoal),priority:option(choices.muscle),
}).strict();
const running=z.object({
  frequency:option(choices.runningFrequency),mode:option(choices.runningMode).optional(),
  minutes:z.number().int().min(1).max(180).optional(),effort:option(choices.runningEffort).optional(),
  place:option(choices.runningPlace),preferBike:z.boolean().optional(),
}).strict();
const availability=z.object({
  slots:dayRows({minutes,kind:z.enum(['auto','physical','running'])}),restDays:unique(activityDay,7),
  coachPhysicalDays:unique(activityDay,7).optional(),mode:option(choices.planning),
}).strict();
const recovery=z.object({
  sleepHours:z.number().finite().min(0).max(24).optional(),state:option(choices.recovery),limitation:option(choices.limitation),
  barrier:option(choices.barrier).optional(),tracking:option(choices.tracking),review:option(choices.review).optional(),
}).strict();

export const answersSchema=z.object({
  basics:basics.partial(),nutrition:nutrition.partial(),food:food.partial(),competition:competition.partial(),
  boxing:boxing.partial(),strength:strength.partial(),muscle:muscle.partial(),running:running.partial(),
  availability:availability.partial(),recovery:recovery.partial(),
}).strict();
export type OnboardingAnswers=z.infer<typeof answersSchema>;
export const emptyAnswers=():OnboardingAnswers=>({basics:{},nutrition:{},food:{},competition:{},boxing:{},strength:{},muscle:{},running:{},availability:{},recovery:{}});

export const draftSchema=z.object({step:z.number().int().min(0).max(7),answers:answersSchema}).strict();
export type OnboardingDraft=z.infer<typeof draftSchema>;

export function selectedEquipment(value:OnboardingAnswers['strength']['equipment']){
  return value===undefined?[]:Array.isArray(value)?value:[value];
}

/** Field paths are shared by persisted validation and accessible inline feedback. */
export function stepIssues(a:OnboardingAnswers,step:number):Record<string,string>{
  const errors:Record<string,string>={};
  function check(schema:z.ZodTypeAny,section:keyof OnboardingAnswers,value:unknown=a[section]){
    const result=schema.safeParse(value);
    if(result.success)return;
    for(const issue of result.error.issues){
      const path=[section,...issue.path].join('.');
      errors[path]=issue.code==='too_small'?'Revisa el valor mínimo permitido.':issue.code==='too_big'?'Revisa el valor máximo permitido.':'Completa esta respuesta para continuar.';
    }
  }
  function equipment(){
    if(!selectedEquipment(a.strength.equipment).length)errors['strength.equipment']='Marca al menos una opción de material.';
  }
  switch(step){
    case 0:
      check(a.basics.sport!=='strength'?basics.omit({goal:true,goalWeight:true,success:true}):basics,'basics',
        a.basics.sport!=='strength'?(({goal,goalWeight,success,...rest})=>rest)(a.basics):a.basics);
      if(a.basics.sport==='strength'&&a.basics.goal==='competition')errors['basics.goal']='Elige un objetivo de musculación.';
      if(a.basics.sport==='strength'&&a.basics.goal==='gain'&&a.basics.goalWeight!==undefined&&a.basics.goalWeight<a.basics.weight!)errors['basics.goalWeight']='El peso objetivo debe ser igual o superior al actual. Puedes dejarlo en blanco.';
      break;
    case 1:
      check(nutrition,'nutrition');
      if(a.nutrition.difficultMeal&&a.nutrition.difficultMeal!=='none'&&!a.nutrition.mealBarrier)errors['nutrition.mealBarrier']='Indica qué te dificulta resolver esta comida.';
      break;
    case 2:
      check(food,'food');
      // These arrays are initialized together by the restrictions confirmation.
      for(const key of ['allergies','intolerances','excluded','preferred']){
        if(errors['food.'+key]&&a.food[key as keyof typeof a.food]===undefined){
          delete errors['food.'+key];errors['food.reviewedRestrictions']='Revisa y confirma tus restricciones alimentarias.';
        }
      }
      if(new Set([...(a.food.allergies??[]),...(a.food.intolerances??[])]).size>20)errors['food.allergies']='Puedes indicar hasta 20 alergias o intolerancias en total.';
      break;
    case 3:
      if(a.basics.sport==='strength')break;
      check(competition,'competition');
      if(a.competition.status==='none')break;
      if(a.competition.categoryStatus==='confirmed'&&a.competition.category===undefined)errors['competition.category']='Indica el peso de la categoría confirmada.';
      if(a.competition.weighDate&&a.competition.fightDate&&
        (a.competition.weighDate>a.competition.fightDate||a.competition.weighDate===a.competition.fightDate&&
        a.competition.weighTime&&a.competition.fightTime&&a.competition.weighTime>a.competition.fightTime))errors['competition.weighDate']='El pesaje debe ser anterior al combate. Revisa sus fechas y horas.';
      break;
    case 4:
      if(a.basics.sport==='boxing')check(boxing,'boxing');
      else {check(muscle,'muscle');check(strength.pick({frequency:true}),'strength',{frequency:a.strength.frequency})}
      break;
    case 5:
      if(a.basics.sport==='boxing')check(strength,'strength');
      else check(availability,'availability');
      equipment();
      break;
    case 6:
      if(a.basics.sport==='boxing')check(running,'running');
      else {check(strength,'strength');equipment()}
      break;
    case 7:
      check(availability,'availability');check(recovery,'recovery');
      if(a.availability.slots?.some(slot=>a.availability.restDays?.includes(slot.day)))errors['availability.slots']='Un día de descanso no puede tener un hueco de entreno.';
      if(a.basics.sport==='boxing'&&a.availability.mode==='manual')a.availability.slots?.forEach((slot,index)=>{
        if(slot.kind==='auto')errors[`availability.slots.${index}.kind`]='Elige físico o carrera para este día.';
      });
      break;
    default:errors.step='Paso de onboarding no válido.';
  }
  return errors;
}

export function stepProblem(a:OnboardingAnswers,step:number):string|null{
  return Object.values(stepIssues(a,step))[0]??null;
}

export const onboardingSchema=z.object({
  version:z.literal(1),
  draft:draftSchema.optional(),
  completed:z.object({at:z.string().datetime(),answers:answersSchema.superRefine((a,ctx)=>{
    for(let step=0;step<8;step++){
      const message=stepProblem(a,step);
      if(message)ctx.addIssue({code:z.ZodIssueCode.custom,message,path:[step]});
    }
  })}).strict().optional(),
}).strict().refine(state=>!!state.draft||!!state.completed);
export type Onboarding=z.infer<typeof onboardingSchema>;
