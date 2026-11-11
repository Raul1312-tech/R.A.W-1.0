import type {Profile} from './model.ts';
import {situationEnergy} from './nutrition-estimates.ts';

export function hydrationReference(p:Profile,date:string){
 const manual=p.preparation?.hydration;
 const base=Math.min(3000,Math.max(2500,Math.round(p.weight*35/250)*250));
 const minutes=situationEnergy(p,{training:p.days[date]?.nutrition?.training??'usual'},date).minutes;
 const extra=Math.min(1500,Math.round(minutes/60*500/250)*250)+(manual?.heat?250:0);
 return {base,exercise:extra,goal:manual?.mode==='manual'?manual.manualGoal??p.waterGoal:base+extra};
}
