import {strategyProposal,applyStrategy} from './coach-strategy.ts';
import {z} from 'zod';
import {emptyDay,targets,total,type Profile} from './model.ts';
import {planForFoodDate} from './preparation-model.ts';
import {dailySessions,planForDate,editCalendarDay} from './training-calendar-model.ts';
import {coachFoodProposal} from './coach-food.ts';
export type CoachAction='keep'|'ease'|'fuel'|'coordinate'|'strategy';
function planStamp(value:unknown){const text=JSON.stringify(value);let a=2166136261,b=5381;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i)}return `${text.length}:${a>>>0}:${b>>>0}`;}

export type CoachFact={id:string;area:'preparation'|'training'|'food'|'recovery';title:string;text:string;why:string;status:'active'|'review'|'missing'};
export function coachContext(p:Profile,date:string){
 const d=p.days[date]??emptyDay(p),t=d.target??targets(p),data=p.workouts??{plans:[],logs:[]};
 const plan=planForDate(data,date),sessions=dailySessions(data,date);
 const competition=p.preparation?.competition;
 const until=competition?Math.ceil((Date.parse(competition.fight)-Date.parse(date+'T23:59:59Z'))/86400000):null;
 const hours=competition?(Date.parse(competition.fight)-Date.parse(competition.weighIn))/3600000:null;
 const from=new Date(Date.parse(date+'T12:00:00Z')-6*86400000).toISOString().slice(0,10);
 const records=Object.entries(p.days).filter(([dt])=>dt>=from&&dt<=date);
 const sleep=records.filter(([,v])=>v.sleep!==null).map(([,v])=>v.sleep!);
 const poorSleep=sleep.filter(v=>v<6).length;
 const logs=data.logs.filter(l=>l.date>=from&&l.date<=date);
 const hard=logs.filter(l=>l.rpe>=8).length;
 const priorEvent=p.preparation?.coach?.events.findLast(e=>e.date===date);
 const facts:CoachFact[]=[];
 const add=(f:CoachFact)=>facts.push(f);
 if(competition&&until!==null&&until>=0)add({id:'competition',area:'preparation',status:'active',title:until===0?'Hoy compites':`A ${until} días del combate`,text:`Entre el pesaje y el combate hay ${Math.round(hours!*10)/10} horas.`,why:'El tiempo disponible para recuperar importa. La fecha no activa un déficit ni cambios de agua o sal.'});
 const taper=!!competition?.taper&&until!==null&&until>=0&&until<=7&&!plan?.overrides?.some(o=>o.date===date);
 const pinned=sessions.some(s=>s.pinned);
 if(taper&&plan)add({id:'taper',area:'training',status:'active',title:pinned?'Tu sesión iniciada se conserva':until!<=2?'Sin físico ni carrera adicional en el calendario':'Puesta a punto en tu calendario',text:pinned?'El seguimiento mantiene la prescripción con la que empezaste.':until!<=2?'La propuesta de puesta a punto retira esas sesiones en los dos últimos días.':'La puesta a punto reduce las series y la duración de las sesiones pendientes.',why:'Es la regla de puesta a punto que has activado. El boxeo técnico y el sparring se acuerdan aparte con tu equipo.'});
 if(priorEvent)add({id:'accepted',area:priorEvent.foodAdjusted&&!priorEvent.trainingAdjusted?'food':'training',status:'active',title:'Ajuste que has aceptado',text:priorEvent.strategy?priorEvent.reason:priorEvent.foodAdjusted?`Cantidades de comidas actualizadas para esta fecha.${priorEvent.trainingAdjusted?' También se ajustaron las series pendientes.':''}`:`Series previstas: ${priorEvent.before} → ${priorEvent.after}. Las sesiones iniciadas no se modificaron.`,why:priorEvent.reason});
 if(!plan)add({id:'no-training',area:'training',status:'missing',title:'Falta tu calendario',text:'Guarda una rutina para coordinar las sesiones de esta fecha.',why:'No inferimos actividad a partir de tu nivel o de tu objetivo de peso.'});
 else add({id:'sessions',area:'training',status:'active',title:sessions.length?`${sessions.length} sesiones en esta fecha`:'Día sin físico ni carrera programados',text:sessions.length?`${sessions.reduce((n,s)=>n+s.session.minutes,0)} minutos previstos entre físico y carrera. ${sessions.filter(s=>s.saved).length} sesiones registradas.`:'Esto no confirma descanso total: puede haber boxeo técnico u otra actividad.',why:'Usamos el calendario de esta fecha y conservamos las sesiones ya iniciadas.'});
 if(poorSleep>=2||hard>=2)add({id:'recovery',area:'recovery',status:'review',title:'Revisemos la recuperación',text:`En los últimos siete días: ${poorSleep} registros de sueño inferior a seis horas y ${hard} sesiones con esfuerzo de ocho o más sobre diez.`,why:'Son señales orientativas, no un diagnóstico ni una medida exacta de fatiga. No aumentamos cargas automáticamente.'});
 if(sleep.length<3)add({id:'missing-sleep',area:'recovery',status:'missing',title:'Nos falta saber cómo recuperas',text:`Hay ${sleep.length} registros de sueño en los últimos siete días.`,why:'Registra el descanso y el esfuerzo real. Los días vacíos no se interpretan como cero ni como recuperación buena.'});
 const foodPlan=planForFoodDate(p,p.plans.at(-1),date),meals=d.foodPlan?.meals??foodPlan?.week?.[(new Date(date+'T12:00:00Z').getUTCDay()+6)%7]?.meals??foodPlan?.meals;
 const menu=meals?total(meals.flatMap(m=>m.items)):null;
 add({id:'nutrition',area:'food',status:'active',title:'La alimentación conserva su referencia',text:`Referencia de esta fecha: ${Math.round(t.k)} kcal y ${Math.round(t.p)} g de proteína.`,why:'Acercarse a una pelea o reducir series no cambia por sí solo las calorías. Tampoco sumamos dos veces el gasto del entrenamiento.'});
 if(menu&&Math.abs(menu.k-t.k)>t.k*.1)add({id:'menu-gap',area:'food',status:'review',title:'Menú y objetivo necesitan revisión',text:`El menú previsto suma aproximadamente ${Math.round(menu.k)} kcal, frente a ${Math.round(t.k)} de referencia.`,why:'Las comidas habituales o cambios manuales pueden modificar el total. Revisa alimentación antes de asumir que el menú cumple el objetivo.'});
 if(competition&&until!==null&&until>=0&&p.goal>competition.weight)add({id:'goal-conflict',area:'preparation',status:'review',title:'Dos objetivos que hay que acordar',text:'El objetivo de peso del perfil está por encima de la categoría de competición.',why:'Revisa la estrategia con tu equipo. No convertimos los kilos de diferencia en un corte rápido ni reducimos agua, sal o comida automáticamente.'});
 add({id:'shopping',area:'food',status:'active',title:'La compra sigue a tus comidas',text:p.preparation?.monthlyMenus?.some(m=>m.month===date.slice(0,7))?'La lista mensual parte del menú fijado y de las modificaciones registradas.':'Fija el menú del mes para obtener su lista de compra.',why:'Esta revisión no cambia ingredientes ni cantidades; por tanto, no añade compras ni suplementos.'});
 const adjustable=sessions.filter(s=>!s.pinned&&s.session.exercises.some(e=>e.sets>1));
 const eligible=p.confirmed&&!plan?.config.limitation&&!p.preparation?.coach?.events.some(e=>e.date===date&&(e.trainingAdjusted??!e.foodAdjusted))&&!taper&&(poorSleep>=2||hard>=2)&&adjustable.length>0;
 const strategy=strategyProposal(p,date);
 if(strategy.enabled)add({id:'strategy',area:'preparation',status:'review',title:'Una nueva estrategia para los próximos siete días',text:strategy.reasons.join(' '),why:'Revisión de tendencia, adherencia y competición. Se aplica solo tras revisar el calendario y los objetivos propuestos.'});
 if(strategy.warnings.length)add({id:'strategy-context',area:'preparation',status:'missing',title:'Antes de cambiar tu estrategia',text:strategy.warnings.join(' '),why:'Los datos insuficientes no justifican aumentar el déficit ni la carga.'});
 const food=coachFoodProposal(p,date);
 if(food)add({id:'food-proposal',area:'food',status:'review',title:'Podemos acercar las comidas a tu objetivo',text:`Total previsto: ${Math.round(food.before.k)} → ${Math.round(food.after.k)} kcal; proteína: ${Math.round(food.before.p)} → ${Math.round(food.after.p)} g.`,why:'Solo cambian cantidades pendientes, hasta un 10 % sobre lo que ves ahora. Se conserva el objetivo y se actualiza la compra mensual. No se compensan comidas omitidas.'});
 const evidence={daysToFight:until,hoursAfterWeighIn:hours,sessionCount:sessions.length,plannedMinutes:sessions.reduce((n,s)=>n+s.session.minutes,0),sleepRecords:sleep.length,shortSleepRecords:poorSleep,hardSessions:hard,completeFoodDays:records.filter(([,d])=>d.complete).length,energy:t.k,protein:t.p,menuEnergy:menu?.k??null};
 const allowedActions:CoachAction[]=['keep',...(eligible?['ease' as const]:[]),...(food?['fuel' as const]:[]),...(eligible&&food?['coordinate' as const]:[]),...(strategy.enabled?['strategy' as const]:[])];
 const payload={version:3,date,evidence,facts,allowedActions,options:{strategy:strategy.enabled?{trend:strategy.trend,phase:strategy.phase,energyBefore:strategy.energyBefore,energyAfter:strategy.energyAfter,trainingDates:strategy.training.length,foodDates:strategy.foodDates.length,reasons:strategy.reasons,warnings:strategy.warnings}:null,training:eligible?{pendingSessions:adjustable.length,seriesBefore:adjustable.reduce((n,s)=>n+s.session.exercises.reduce((v,e)=>v+e.sets,0),0),seriesAfter:adjustable.reduce((n,s)=>n+s.session.exercises.reduce((v,e)=>v+Math.max(1,e.sets-1),0),0)}:null,food:food?{before:food.before,after:food.after,target:food.target,changedPortions:food.changes.length}:null}};
 // Bind acceptance to the exact local plan, not just aggregate calories/minutes.
 const source={strategyData:{days:p.days,workouts:p.workouts,preparation:p.preparation,goal:p.goal},day:d,sessions:sessions.map(s=>({session:s.session,pinned:s.pinned})),meals,allergens:p.allergens,excluded:p.excluded,events:p.preparation?.coach?.events};
 return {...payload,signature:JSON.stringify({payload,stamp:planStamp(source)}),canEase:eligible};
}
export function previewCoachAction(p:Profile,date:string,action:CoachAction){
 const context=coachContext(p,date);
 if(!context.allowedActions.includes(action))throw new Error('Esta propuesta ya no se puede aplicar.');
 const strategy=action==='strategy'?strategyProposal(p,date):null;
 const training=action==='ease'||action==='coordinate';
 const food=action==='fuel'||action==='coordinate'?coachFoodProposal(p,date):null;
 return {training:training?context.options.training:null,food,strategy};
}
export function applyCoachAction(p:Profile,date:string,signature:string,action:CoachAction):Profile{
 const context=coachContext(p,date);
 if(context.signature!==signature||!context.allowedActions.includes(action)||action==='keep')throw new Error('El plan ha cambiado. Revisa la propuesta de nuevo.');
 if(action==='strategy')return applyStrategy(p,date);
 const preview=previewCoachAction(p,date,action);
 let next=preview.training?easeCoachDay(p,date,signature):p;
 if(preview.food){
  const events=[...(next.preparation?.coach?.events??[])];
  if(preview.training)events.pop();
  events.push({date,at:new Date().toISOString(),before:preview.training?.seriesBefore??0,after:preview.training?.seriesAfter??0,foodAdjusted:true,trainingAdjusted:!!preview.training,reason:'Ajuste aceptado: porciones pendientes hasta ±10 % hacia el objetivo guardado; compra mensual sincronizada. Se conserva el registro y no cambian agua, sal ni suplementos.'});
  next={...next,days:{...next.days,[date]:preview.food.day},preparation:{...next.preparation,coach:{...p.preparation?.coach,enabled:p.preparation?.coach?.enabled??false,events:events.slice(-30)}}};
 }
 return next;
}
export function validateCoachChoice(raw:unknown,context:ReturnType<typeof coachContext>){
 const parsed=z.object({priority:z.array(z.string()).min(1).max(4),action:z.enum(['keep','ease','fuel','coordinate','strategy'])}).strict().parse(raw);
 if(new Set(parsed.priority).size!==parsed.priority.length||parsed.priority.some(id=>!context.facts.some(f=>f.id===id))||!context.allowedActions.includes(parsed.action))throw new Error('Propuesta fuera del plan permitido.');
 return parsed;
}
export function easeCoachDay(p:Profile,date:string,signature:string):Profile{
 const ctx=coachContext(p,date);if(ctx.signature!==signature||!ctx.canEase)throw new Error('El plan ha cambiado. Revisa la propuesta de nuevo.');
 const data=p.workouts!,plan=planForDate(data,date)!;
 const entries=dailySessions(data,date);
 let before=0,after=0;
 const sessions=entries.map(({session,pinned})=>{if(pinned)return session;return {...session,exercises:session.exercises.map(e=>{before+=e.sets;const sets=Math.max(1,e.sets-1);after+=sets;return {...e,sets}})}});
 const next=editCalendarDay(plan,date.slice(0,7),date,sessions,'date');
 return {...p,workouts:{...data,plans:[...data.plans.filter(x=>x.id!==next.id),next].slice(-12)},preparation:{...p.preparation,coach:{...p.preparation?.coach,enabled:p.preparation?.coach?.enabled??false,events:[...(p.preparation?.coach?.events??[]),{date,at:new Date().toISOString(),before,after,reason:'Señales de recuperación registradas. Has elegido una serie menos por ejercicio pendiente, sin cambiar pesos, repeticiones, descansos ni alimentación.'}].slice(-30)}}};
}
