import {generatePlan,total,type Profile,type Day,type DailyFoodPlan,type Item,type Macro,type Meal,type MealRecord,type Plan} from './model.ts';
import {mealLabelsFor} from './meal-layout.ts';
import {outsideMealEstimate} from './nutrition-estimates.ts';
export const displayMeal=(label:string)=>label==='Primera comida'?'Desayuno':label==='Tentempié'?'Almuerzo':label;
/** Replace a pending meal only in this day's snapshot, keeping all logged food intact. */
export function refreshDailyMeal(day:Day,plan:Plan|undefined,date:string,slot:number,profile:Profile):Day{
  const snapshot=foodSnapshot(day,plan,date);
  if(!snapshot||!Number.isInteger(slot)||!snapshot.meals[slot])throw new Error('No hay una comida prevista para actualizar.');
  if(snapshot.records.some(r=>r.slot===slot))throw new Error('Deshaz el registro antes de cambiar esta comida.');
  const previous:Plan={id:snapshot.planId,created:'',seed:plan?.seed??0,target:day.target,meals:snapshot.meals,week:Array.from({length:7},()=>({day:'',meals:snapshot.meals}))};
  const old=snapshot.meals[slot];
  const replacement=generatePlan({...profile,mealCount:snapshot.meals.length,preparation:{...profile.preparation,energyTarget:day.target.k}},Math.floor(Math.random()*1000000),previous)?.meals[slot];
  if(!replacement)throw new Error('No hay otra opción compatible con tus restricciones. Puedes registrar una alternativa.');
  const ratio=total(old.items).k/total(replacement.items).k;
  const meal={...replacement,items:replacement.items.map(it=>({...it,grams:Math.max(1,Math.round(it.grams*ratio))}))};
  if(meal.items.some(it=>it.grams>3000))throw new Error('No se han podido ajustar las cantidades de esta opción.');
  return {...day,foodPlan:{...snapshot,meals:snapshot.meals.map((m,i)=>i===slot?meal:m)}};
}
export function foodSnapshot(day:Day,plan:Plan|undefined,date:string):DailyFoodPlan|undefined{
  if(day.foodPlan)return day.foodPlan;
  if(!plan||!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
  const weekday=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;
  const meals=structuredClone(plan.week?.[weekday].meals??plan.meals);
  const labels=mealLabelsFor(meals.length);
  const records:MealRecord[]=labels.flatMap((label,slot)=>{
    const items=day.items.filter(it=>it.meal===label||it.meal===displayMeal(label));
    return items.length?[{slot,status:'alternative',itemIds:items.map(it=>it.id)}]:[];
  });
  return {planId:plan.id,meals,labels,records,autoAdjust:true};
}
const fixedFoods=new Set(['veg','tomato','broccoli','carrot','zucchini','pepper','spinach','greenbeans','banana','apple','orange','pear','kiwi','berries']);
const keys=['k','p','c','f'] as const;
/** Bounded same-day portion adjustment. ±20% is a product limit, not a clinical prescription. */
export function foodDayView(day:Day,plan:Plan|undefined,date:string){
  const snapshot=foodSnapshot(day,plan,date);if(!snapshot)return undefined;
  const meals=structuredClone(snapshot.meals);
  const done=new Set(snapshot.records.map(r=>r.slot));
  const cursor=Math.max(-1,...snapshot.records.map(r=>r.slot));
  const pending=meals.map((_,i)=>i).filter(i=>!done.has(i));
  const eligible=pending.filter(i=>i>cursor);
  const recorded=total(day.items);
  const projected=()=>{
    const actual=total([...day.items,...pending.flatMap(i=>meals[i].items)]);
    for(const [id,expected] of Object.entries(day.supplementForecast??{}))if(!day.items.some(it=>it.id==='supplement-'+id))for(const key of keys)actual[key]+=expected[key];
    for(const slot of pending){const reserve=outsideMealEstimate(day,slot);if(reserve&&!meals[slot].items.length)for(const key of keys)actual[key]+=reserve[key]}
    return actual;
  };
  const baseline=projected();
  const hasAlternatives=!!day.nutrition||snapshot.records.some(r=>r.status!=='planned')||day.items.some(it=>!snapshot.records.some(r=>r.itemIds.includes(it.id)));
  const denominators=[Math.max(500,day.target.k),Math.max(30,day.target.p),Math.max(50,day.target.c),Math.max(20,day.target.f)];
  const weights=[1.5,1,.7,.7];
  const score=(macro:Macro)=>keys.reduce((n,k,i)=>n+weights[i]*((macro[k]-day.target[k])/denominators[i])**2,0);
  if(snapshot.autoAdjust&&hasAlternatives&&eligible.length&&cursor<meals.length-1){
    const vars=eligible.flatMap(slot=>meals[slot].items.flatMap((it,index)=>fixedFoods.has(it.food.id)?[]:[{slot,index,grams:it.grams,scale:1,a:keys.map((k,i)=>it.food[k]*it.grams/100/denominators[i])}]));
    const residual=keys.map((k,i)=>(day.target[k]-baseline[k])/denominators[i]);const regularization=.003;
    for(let pass=0;pass<50;pass++)for(const v of vars){
      const numerator=v.a.reduce((n,a,i)=>n+weights[i]*a*residual[i],0)+regularization*(1-v.scale);
      const denominator=v.a.reduce((n,a,i)=>n+weights[i]*a*a,0)+regularization;
      const next=Math.max(.8,Math.min(1.2,v.scale+numerator/denominator));
      for(let i=0;i<4;i++)residual[i]-=v.a[i]*(next-v.scale);v.scale=next;
    }
    for(const v of vars){const min=Math.min(v.grams,Math.ceil(v.grams*.8)),max=Math.max(v.grams,Math.floor(v.grams*1.2));meals[v.slot].items[v.index].grams=Math.min(max,Math.max(min,Math.round(v.grams*v.scale)))}
    if(score(projected())>=score(baseline)-.00001)for(const slot of eligible)meals[slot]=structuredClone(snapshot.meals[slot]);
  }
  const adjustments=pending.flatMap(slot=>meals[slot].items.flatMap((it,i)=>it.grams!==snapshot.meals[slot].items[i].grams?[{slot,name:it.food.name,before:snapshot.meals[slot].items[i].grams,after:it.grams}]:[]));
  return {snapshot,meals,recorded,projected:projected(),adjustments,pending,cursor,finished:cursor===meals.length-1};
}
export function recordMeal(day:Day,plan:Plan|undefined,date:string,slot:number,status:MealRecord['status'],items?:Item[]):Day{
  const view=foodDayView(day,plan,date);if(!view||!view.meals[slot])throw new Error('No hay una comida prevista para este día.');
  const snapshot=view.snapshot;const old=snapshot.records.find(r=>r.slot===slot);
  // A repeated one-tap confirmation is idempotent, including very quick double taps.
  if(status==='planned'&&old?.status==='planned')return day;
  const chosen=status==='skipped'?[]:status==='planned'?view.meals[slot].items:items??[];
  if(status!=='skipped'&&(!chosen.length||chosen.some(it=>!Number.isFinite(it.grams)||it.grams<.1||it.grams>3000)))throw new Error('Añade alimentos y revisa sus cantidades.');
  if(chosen.length>20)throw new Error('Puedes registrar hasta 20 alimentos por comida.');
  const kept=day.items.filter(it=>!old?.itemIds.includes(it.id));
  if(kept.length+chosen.length>200)throw new Error('Este día ha alcanzado el límite de alimentos.');
  const added=chosen.map(it=>({...structuredClone(it),id:crypto.randomUUID(),meal:snapshot.labels[slot]}));
  const records=[...snapshot.records.filter(r=>r.slot!==slot),{slot,status,itemIds:added.map(it=>it.id)}];
  return {...day,complete:records.length===snapshot.meals.length,items:[...kept,...added],foodPlan:{...snapshot,records}};
}
export function undoMeal(day:Day,slot:number):Day{
  const snapshot=day.foodPlan;if(!snapshot)return day;const record=snapshot.records.find(r=>r.slot===slot);
  return {...day,complete:false,items:day.items.filter(it=>!record?.itemIds.includes(it.id)),foodPlan:{...snapshot,records:snapshot.records.filter(r=>r.slot!==slot)}};
}
export function replaceLooseFood(day:Day,items:Item[],meal:string):Day{
  if(!items.length||items.length>20||items.some(it=>!Number.isFinite(it.grams)||it.grams<.1||it.grams>3000))throw new Error('Revisa los alimentos y las cantidades.');
  if(day.items.length+items.length>200)throw new Error('Este día ha alcanzado el límite de alimentos.');
  return {...day,complete:false,items:[...day.items,...items.map(it=>({...structuredClone(it),id:crypto.randomUUID(),meal}))]};
}
export function syncFoodRecords(day:Day,items:Day['items']):Day['foodPlan']{
  const snapshot=day.foodPlan;if(!snapshot)return;
  return {...snapshot,records:snapshot.records.flatMap(record=>{
    if(record.status==='skipped')return [record];
    const previous=day.items.filter(it=>record.itemIds.includes(it.id));
    const next=items.filter(it=>record.itemIds.includes(it.id)||it.meal===snapshot.labels[record.slot]);
    return next.length?[{...record,itemIds:next.map(it=>it.id),status:JSON.stringify(previous)===JSON.stringify(next)?record.status:'alternative' as const}]:[];
  })};
}
