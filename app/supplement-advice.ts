import {total,type Profile,type Day} from './model.ts';
import type {Supplement} from './preparation-schema.ts';
import {competitionPhase} from './competition-phase.ts';
export function supplementAdvice(p:Profile,date:string,day:Day,s:Pick<Supplement,'kind'|'allergens'|'id'>){
 if(s.allergens.some(a=>p.allergens.includes(a)))return 'El producto coincide con un alérgeno de tu perfil. Revisa la etiqueta.';
 const recent=Object.entries(p.preparation?.supplementFeedback??{}).some(([dt,items])=>dt<=date&&Date.parse(date)-Date.parse(dt)<=7*86400000&&items[s.id]==='poor-tolerance');
 if(recent)return 'Has registrado mala tolerancia. Revisa el producto con tu equipo antes de repetirlo.';
 const c=p.preparation?.competition,phase=c?competitionPhase(c,date):undefined;
 if(phase?.active&&phase.daysToWeigh<=7)return 'Pesaje próximo: revisa este producto y su horario con tu equipo. Evita estrenar suplementos en competición.';
 if(s.kind==='sportsDrink')return 'Bebida con hidratos y electrolitos prevista alrededor de una sesión larga. Revisa la etiqueta, la tolerancia y la cantidad real tomada.';
 if(s.kind==='protein'){
  const mealPlan=day.foodPlan?.meals;
  const protein=mealPlan?total(mealPlan.flatMap(m=>m.items)).p:undefined;
  return protein!==undefined&&protein>=day.target.p*.98?'Las comidas previstas ya cubren aproximadamente la referencia de proteína. El batido es opcional.':'La proteína en polvo puede ser práctica si las comidas no cubren la referencia. Comprueba la ración, la etiqueta y los alérgenos.';
 }
 return 'La creatina puede apoyar el entrenamiento de fuerza y esfuerzos repetidos. Revisa tolerancia, medicación y control antidopaje con tu equipo.';
}
