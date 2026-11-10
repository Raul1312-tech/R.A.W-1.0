import {emptyDay,generatePlan,targets,total,type Profile,type Plan,type Day,type Macro} from './model.ts';
import {foodSnapshot} from './daily-food-model.ts';
import {mealSlots,mealLabelsFor} from './meal-layout.ts';
import {situationEnergy} from './nutrition-estimates.ts';
import {applyRepeats,planForFoodDate} from './preparation-model.ts';
import {nutritionSituationSchema,type NutritionSituation} from './nutrition-situation-schema.ts';
import {stateSchema} from './validation.ts';

const validate=(p:Profile)=>{stateSchema.parse({active:p.id,profiles:[p]});return p};
export const hasNutritionRecords=(day:Day|undefined)=>!!day&&(day.items.length>0||!!day.foodPlan?.records.length||day.complete);
export function saveNutritionSituation(p:Profile,input:unknown):Profile{
  const situation=nutritionSituationSchema.parse(input);
  const existing=p.preparation?.situations??[];
  if(existing.length>=12&&!existing.some(s=>s.id===situation.id))throw Error('Puedes guardar hasta 12 situaciones.');
  checkSupplements(p,situation);
  return validate({...p,preparation:{...p.preparation,situations:[...existing.filter(s=>s.id!==situation.id),situation]}});
}
function checkSupplements(p:Profile,s:NutritionSituation){
  for(const chosen of s.supplements){
    const supplement=p.preparation?.supplements?.find(x=>x.id===chosen.id);
    if(!supplement)throw Error('Un suplemento ya no está en tu plan. Edita y guarda esta situación.');
    if(supplement.allergens.some(a=>p.allergens.includes(a)))throw Error('Un suplemento elegido entra en conflicto con tus alérgenos. Revisa esta situación.');
    if(chosen.amount*(supplement.unit==='capsules'?supplement.gramsPerUnit:1)>200)throw Error('Revisa la cantidad de los suplementos: máximo 200 g por toma.');
  }
}
/** Builds a dated plan, retaining every actual food item and recorded meal. */
export function previewNutritionSituation(p:Profile,input:unknown,date:string,seed=1,cache?:Map<string,Plan|null>){
  const situation=nutritionSituationSchema.parse(input);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Selecciona una fecha válida.');
  checkSupplements(p,situation);
  const day=p.days[date]??emptyDay(p),old=foodSnapshot(day,planForFoodDate(p,p.plans.at(-1),date),date);
  const required=(old?.records??[]).map(r=>mealSlots(old!.meals.length)[r.slot]);
  const count=[2,3,4,5,6].find(n=>n>=situation.mealCount&&required.every(slot=>mealSlots(n).includes(slot)))!;
  const target=situationEnergy(p,situation,date).target;
  const profile={...p,mealCount:count,preparation:{...p.preparation,energyTarget:target.k}};
  const supplements=situation.supplements.map(s=>situation.training==='rest'&&s.timing==='postworkout'?{...s,timing:'breakfast' as const}:s);
  const portions=supplements.map(chosen=>{
    const s=p.preparation!.supplements!.find(x=>x.id===chosen.id)!;
    return {food:{...s,k:s.kind==='creatine'?0:s.k,p:s.kind==='creatine'?0:s.p,c:s.kind==='creatine'?0:s.c,f:s.kind==='creatine'?0:s.f},grams:chosen.amount*(s.unit==='capsules'?s.gramsPerUnit:1)};
  });
  const supplementForecast=Object.fromEntries(portions.map((portion,i)=>[supplements[i].id,total([portion])]));
  const supplementMacros=total(portions);
  const mealTarget=Object.fromEntries((['k','p','c','f'] as const).map(key=>[key,target[key]-supplementMacros[key]])) as Macro;
  if(Object.values(mealTarget).some(n=>n<=0))throw Error('Las cantidades de suplementos superan el reparto del día. Revisa cantidades y objetivo.');
  const cacheKey=JSON.stringify({seed,count,target:mealTarget,allergens:profile.allergens,excluded:profile.excluded});
  const generated=cache?.has(cacheKey)?cache.get(cacheKey)!:generatePlan(profile,seed,undefined,mealTarget);
  cache?.set(cacheKey,generated);
  if(!generated)throw Error('No se puede construir una dieta con esas cantidades y restricciones. Prueba otro objetivo o número de comidas.');
  const weekday=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;
  const plan:Plan={...generated,id:'situation-'+situation.id,meals:generated.week![weekday].meals,week:undefined};
  const snapshot=foodSnapshot({...day,foodPlan:undefined,items:[]},plan,date)!;
  if(!situation.supplements.length&&!(situation.id.startsWith('competition-')))snapshot.meals=applyRepeats(p,snapshot.meals);
  for(const record of old?.records??[]){const slot=mealSlots(count).indexOf(mealSlots(old!.meals.length)[record.slot]);snapshot.meals[slot]=structuredClone(old!.meals[record.slot]);snapshot.records.push({...structuredClone(record),slot})}
  snapshot.meals=snapshot.meals.map((meal,slot)=>situation.outsideMeals?.some(outside=>outside.slot===mealSlots(count)[slot])&&!snapshot.records.some(r=>r.slot===slot)?{name:mealLabelsFor(count)[slot]+' fuera · pendiente de registrar',items:[]}:meal);
  const {id,...settings}=situation;
  const toMinutes=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3));
  const start=toMinutes(situation.times[0]),end=toMinutes(situation.times.at(-1)!);
  const times=count===situation.mealCount?situation.times:Array.from({length:count},(_,i)=>{const minute=Math.round(start+(end-start)*i/(count-1));return String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0')});
  return {...day,target,supplementForecast,complete:snapshot.records.length===count,foodPlan:snapshot,nutrition:{situationId:id,...structuredClone(settings),mealCount:count,times,energyTarget:target.k,supplements}};
}
export function applyNutritionSituation(p:Profile,id:string,date:string):Profile{
  const s=p.preparation?.situations?.find(x=>x.id===id);
  if(!s)throw Error('Guarda primero la situación.');
  return applyNutritionSettings(p,s,date);
}
export function applyNutritionSettings(p:Profile,settings:NutritionSituation,date:string):Profile{
  const day=previewNutritionSituation(p,settings,date);
  return validate({...p,days:{...p.days,[date]:day}});
}
export function clearNutritionSituation(p:Profile,date:string,reference:Plan|undefined):Profile{
  if(hasNutritionRecords(p.days[date]))throw Error('Este día ya tiene alimentos registrados. Se conserva su planificación.');
  const day={...(p.days[date]??emptyDay(p)),nutrition:undefined,foodPlan:undefined,supplementForecast:undefined,target:targets(p)};
  const plan=planForFoodDate(p,reference,date);
  return validate({...p,days:{...p.days,[date]:{...day,foodPlan:foodSnapshot(day,plan,date)}}});
}
