import type {Profile} from './model.ts';
import {emptyDay,total} from './model.ts';
import type {Supplement} from './preparation-schema.ts';
import {competitionPhase} from './competition-phase.ts';
import {foodDayView} from './daily-food-model.ts';
import {withCoordinatedDay} from './preparation-engine.ts';
import {situationEnergy} from './nutrition-estimates.ts';

export function supplementRecommendations(p:Profile,date:string){
 const day=withCoordinatedDay(p,date,p.plans.at(-1)).days[date]??emptyDay(p);
 const view=foodDayView(day,p.plans.at(-1),date);
 const foodProtein=view?total([...day.items,...view.pending.flatMap(slot=>view.meals[slot].items)]).p:0;
 const gap=Math.max(0,day.target.p-foodProtein);
 const phase=p.preparation?.competition?competitionPhase(p.preparation.competition,date):undefined;
 const near=!!phase?.active&&phase.daysToWeigh<=14;
 const review=p.onboarding?.completed?.answers.food.health;
 const result:{product:Supplement;reason:string}[]=[];
 const owned=p.preparation?.supplements??[];
 if(!p.confirmed||near||review==='medical'||review==='preferPrivate')return {result,message:near?'Pesaje próximo. Revisa las tomas con tu equipo antes de iniciar un producto.':review?'Hay indicaciones de salud pendientes de revisión. Mantén las tomas acordadas con tu profesional.':'Completa el perfil para valorar las tomas.'};
 if(!owned.some(s=>s.kind==='creatine'))result.push({product:{id:'recommended-creatine',name:'Creatina monohidrato',kind:'creatine',timing:'breakfast',amount:3,unit:'g',gramsPerUnit:1,k:0,p:0,c:0,f:0,allergens:[]},reason:'Propuesta opcional de mantenimiento para un adulto: 3 g diarios junto a una comida, también en descanso. Revisa con tu equipo la tolerancia, medicación y el producto.'});
 if(view&&gap>=10&&!p.allergens.includes('leche')&&!owned.some(s=>s.kind==='protein'))result.push({product:{id:'recommended-protein',name:'Proteína en polvo · referencia genérica',kind:'protein',timing:'postworkout',amount:Math.min(40,Math.ceil(gap/.8)),unit:'g',gramsPerUnit:1,k:400,p:80,c:8,f:6,allergens:['leche']},reason:'Faltan aproximadamente '+Math.round(gap)+' g de proteína respecto a la referencia del día. La cantidad se estima con un producto al 80 % de proteína. Confirma los valores del envase.'});
 const minutes=situationEnergy(p,{training:day.nutrition?.training??'usual'},date).minutes;
 if(minutes>=75&&!owned.some(s=>s.kind==='sportsDrink'))result.push({product:{id:'recommended-sportsdrink',name:'Bebida deportiva · referencia genérica',kind:'sportsDrink',timing:'during',amount:500,unit:'ml',gramsPerUnit:1,k:24,p:0,c:6,f:0,allergens:[]},reason:'La sesión prevista es larga. Puedes valorar 500 ml de bebida con hidratos y electrolitos durante la sesión. La referencia aporta 30 g de hidratos; revisa la etiqueta y tu tolerancia.'});
 return {result,message:view&&gap<10?'Las comidas previstas ya cubren aproximadamente la referencia de proteína.':undefined};
}
