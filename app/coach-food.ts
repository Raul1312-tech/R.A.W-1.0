import {emptyDay,total,foods,type Profile,type Macro} from './model.ts';
import {foodDayView} from './daily-food-model.ts';
import {planForFoodDate,mealCompatible} from './preparation-model.ts';

const keys=['k','p','c','f'] as const;
const fixed=new Set(['whey','coffee','veg','tomato','broccoli','carrot','zucchini','pepper','spinach','greenbeans','banana','apple','orange','pear','kiwi','berries']);
const adjustableFoods=new Set(foods.filter(f=>!fixed.has(f.id)).map(f=>f.id));
/** Product bounds, not a new calorie prescription. Start from the visible menu. */
export function coachFoodProposal(p:Profile,date:string){
 const day=p.days[date]??emptyDay(p),plan=planForFoodDate(p,p.plans.at(-1),date);
 const view=foodDayView(day,plan,date);
 if(!p.confirmed||!view||view.finished||day.complete||p.preparation?.coach?.events.some(e=>e.date===date&&e.foodAdjusted))return null;
 if(view.meals.some(m=>!mealCompatible(p,m)))return null;
 // Do not reinterpret skipped meals as a deficit to compensate.
 if(view.snapshot.records.some(r=>r.status==='skipped'))return null;
 const meals=structuredClone(view.meals),target=day.target;
 const eligible=view.pending.filter(s=>s>view.cursor);
 const baseline=view.projected;
 // A balanced menu is not a problem to optimise away: avoid gram-level busywork.
 if(Math.abs(baseline.k-target.k)<=target.k*.05&&Math.abs(baseline.p-target.p)<=Math.max(10,target.p*.1))return null;
 const den=keys.map(k=>Math.max(k==='k'?500:30,target[k]));
 const weights=[2,1,1,.7];
 const score=(m:Macro)=>keys.reduce((s,k,i)=>s+weights[i]*((m[k]-target[k])/den[i])**2,0);
 const variables=eligible.flatMap(slot=>meals[slot].items.flatMap((it,index)=>!adjustableFoods.has(it.food.id)?[]:[{slot,index,grams:it.grams,scale:1,a:keys.map((k,i)=>it.food[k]*it.grams/100/den[i])}]));
 const residual=keys.map((k,i)=>(target[k]-baseline[k])/den[i]);
 for(let pass=0;pass<40;pass++)for(const v of variables){
  const numerator=v.a.reduce((s,a,i)=>s+weights[i]*a*residual[i],0)+.003*(1-v.scale);
  const denominator=v.a.reduce((s,a,i)=>s+weights[i]*a*a,0)+.003;
  const scale=Math.max(.9,Math.min(1.1,v.scale+numerator/denominator));
  for(let i=0;i<4;i++)residual[i]-=v.a[i]*(scale-v.scale);v.scale=scale;
 }
 for(const v of variables)meals[v.slot].items[v.index].grams=Math.max(Math.ceil(v.grams*.9),Math.min(3000,Math.floor(v.grams*1.1),Math.round(v.grams*v.scale)));
 const projected=total([...day.items,...view.pending.flatMap(s=>meals[s].items)]);
 // Require a meaningful improvement, with no material worsening of energy/protein.
 if(score(projected)>score(baseline)*.95||Math.abs(projected.k-target.k)>Math.abs(baseline.k-target.k)+5||Math.abs(projected.p-target.p)>Math.abs(baseline.p-target.p)+2)return null;
 const changes=eligible.flatMap(slot=>meals[slot].items.flatMap((it,i)=>it.grams===view.meals[slot].items[i].grams?[]:[{slot,meal:view.snapshot.labels[slot],name:it.food.name,before:view.meals[slot].items[i].grams,after:it.grams}]));
 if(!changes.length||Math.abs(projected.k-baseline.k)<20&&Math.abs(projected.p-baseline.p)<3)return null;
 return {before:baseline,after:projected,target,changes,day:{...day,foodPlan:{...view.snapshot,meals,autoAdjust:false}}};
}
