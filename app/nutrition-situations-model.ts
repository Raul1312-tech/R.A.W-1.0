import {emptyDay,generatePlan,targets,total,type Profile,type Plan,type Day,type Macro} from './model.ts';
import {foodSnapshot} from './daily-food-model.ts';
import {planForFoodDate} from './preparation-model.ts';
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
/** Builds the actual dated menu, without changing the reference week or consuming food. */
export function previewNutritionSituation(p:Profile,input:unknown,date:string,seed=1){
  const situation=nutritionSituationSchema.parse(input);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Selecciona una fecha válida.');
  checkSupplements(p,situation);
  const profile={...p,mealCount:situation.mealCount,preparation:{...p.preparation,energyTarget:situation.energyTarget}};
  if(targets(profile).c<100)throw Error('Este objetivo deja muy pocos hidratos con tu reparto actual. Revisa el objetivo energético.');
  const calculated=targets(profile);
  const target:Macro={k:calculated.k,p:calculated.p,c:calculated.c,f:calculated.f};
  const supplementMacros=total(situation.supplements.map(chosen=>{
    const s=p.preparation!.supplements!.find(x=>x.id===chosen.id)!;
    return {food:{...s,k:s.kind==='creatine'?0:s.k,p:s.kind==='creatine'?0:s.p,c:s.kind==='creatine'?0:s.c,f:s.kind==='creatine'?0:s.f},grams:chosen.amount*(s.unit==='capsules'?s.gramsPerUnit:1)};
  }));
  const mealTarget=Object.fromEntries((['k','p','c','f'] as const).map(key=>[key,target[key]-supplementMacros[key]])) as Macro;
  if(Object.values(mealTarget).some(n=>n<=0))throw Error('Las cantidades de suplementos superan el reparto del día. Revisa cantidades y objetivo.');
  const generated=generatePlan(profile,seed,undefined,mealTarget);
  if(!generated)throw Error('No se puede construir una dieta con esas cantidades y restricciones. Prueba otro objetivo o número de comidas.');
  const weekday=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;
  const plan:Plan={...generated,id:'situation-'+situation.id,meals:generated.week![weekday].meals,week:undefined};
  const day=p.days[date]??emptyDay(p);
  const {id,...settings}=situation;
  return {...day,target,foodPlan:foodSnapshot({...day,foodPlan:undefined,items:[]},plan,date)!,nutrition:{situationId:id,...structuredClone(settings)}};
}
export function applyNutritionSituation(p:Profile,id:string,date:string):Profile{
  if(hasNutritionRecords(p.days[date]))throw Error('Este día ya tiene alimentos registrados. Elige otro día para conservar lo que has comido.');
  const s=p.preparation?.situations?.find(x=>x.id===id);
  if(!s)throw Error('Guarda primero la situación.');
  const day=previewNutritionSituation(p,s,date);
  return validate({...p,days:{...p.days,[date]:day}});
}
export function clearNutritionSituation(p:Profile,date:string,reference:Plan|undefined):Profile{
  if(hasNutritionRecords(p.days[date]))throw Error('Este día ya tiene alimentos registrados. Se conserva su planificación.');
  const day={...(p.days[date]??emptyDay(p)),nutrition:undefined,foodPlan:undefined,target:targets(p)};
  const plan=planForFoodDate(p,reference,date);
  return validate({...p,days:{...p.days,[date]:{...day,foodPlan:foodSnapshot(day,plan,date)}}});
}
