import {total,type Profile,type Meal,type Day,type Plan,type Item} from './model.ts';
import {foodSnapshot} from './daily-food-model.ts';
import type {Supplement,Competition} from './preparation-schema.ts';
import {mealSlots} from './meal-layout.ts';
export const mealCompatible=(p:Profile,m:Meal)=>m.items.every(i=>!p.excluded.includes(i.food.id)&&!i.food.allergens.some(a=>p.allergens.includes(a)));
export function saveFavorite(p:Profile,meal:Meal,slot:number,count=p.mealCount??5):Profile{
 const favorites=p.preparation?.favorites??[];
 if(favorites.some(f=>f.slot===mealSlots(count)[slot]&&f.meal.name===meal.name&&f.meal.prep===meal.prep&&f.meal.items.length===meal.items.length&&f.meal.items.every((it,i)=>it.grams===meal.items[i].grams&&(['id','name','unit','k','p','c','f'] as const).every(key=>it.food[key]===meal.items[i].food[key]))))return p;
 if(favorites.length>=40)throw new Error('Puedes guardar hasta 40 comidas. Elimina alguna para añadir otra.');
 if(!meal.items.length)throw new Error('Esta comida no tiene alimentos.');
 return {...p,preparation:{...p.preparation,favorites:[...favorites,{id:crypto.randomUUID(),slot:mealSlots(count)[slot],meal:structuredClone(meal),repeat:false}]}};
}
export function useFavorite(day:Day,plan:Plan|undefined,date:string,p:Profile,id:string,slot:number):Day{
 const favorite=p.preparation?.favorites?.find(f=>f.id===id),snapshot=foodSnapshot(day,plan,date);
 if(!favorite||!snapshot||!snapshot.meals[slot]||snapshot.records.some(r=>r.slot===slot))throw new Error('Solo puedes cambiar una comida pendiente.');
 if(!mealCompatible(p,favorite.meal))throw new Error('Esta comida no es compatible con tus restricciones actuales.');
 return {...day,foodPlan:{...snapshot,meals:snapshot.meals.map((m,i)=>i===slot?structuredClone(favorite.meal):m)}};
}
export function applyRepeats(p:Profile,meals:Meal[]):Meal[]{
 return meals.map((meal,slot)=>{const favorite=p.preparation?.favorites?.find(f=>f.repeat&&f.slot===mealSlots(meals.length)[slot]&&mealCompatible(p,f.meal));return favorite?structuredClone(favorite.meal):meal});
}
export function freezeMonth(p:Profile,plan:Plan,month:string):Profile{
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Selecciona un mes válido.');
 const [y,m]=month.split('-').map(Number),count=new Date(Date.UTC(y,m,0)).getUTCDate();
 const days=Array.from({length:count},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0');const weekday=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;return {date,meals:applyRepeats(p,plan.week?.[weekday].meals??plan.meals)}});
 if(days.some(d=>d.meals.some(m=>!mealCompatible(p,m))))throw new Error('Revisa alergias y exclusiones antes de fijar el mes.');
 return {...p,preparation:{...p.preparation,monthlyMenus:[...(p.preparation?.monthlyMenus??[]).filter(m=>m.month!==month),{month,created:new Date().toISOString(),days}].slice(-6)}};
}
export function planForFoodDate(p:Profile,plan:Plan|undefined,date:string):Plan|undefined{
 const fixed=p.preparation?.monthlyMenus?.find(m=>m.month===date.slice(0,7))?.days.find(d=>d.date===date);
 if(fixed){return {id:'month-'+date.slice(0,7),created:date+'T12:00:00Z',seed:0,target:plan?.target??p.days[date]?.target??total(fixed.meals.flatMap(m=>m.items)),meals:structuredClone(fixed.meals)}}
 if(!plan)return;
 return {...plan,meals:applyRepeats(p,plan.meals),week:plan.week?.map(d=>({...d,meals:applyRepeats(p,d.meals)}))};
}
export function monthlyShopping(p:Profile,month:string):Item[]{
 const fixed=p.preparation?.monthlyMenus?.find(m=>m.month===month);if(!fixed)return [];
 const sums=new Map<string,Item>();
 for(const d of fixed.days){const actual=p.days[d.date]?.foodPlan?.meals??d.meals;for(const it of actual.flatMap(m=>m.items))sums.set(it.food.id,{...it,grams:(sums.get(it.food.id)?.grams??0)+it.grams});}
 return [...sums.values()].sort((a,b)=>a.food.name.localeCompare(b.food.name,'es'));
}
export function toggleSupplement(day:Day,s:Supplement):Day{
 const id='supplement-'+s.id,existing=day.items.some(i=>i.id===id);
 if(existing)return {...day,items:day.items.filter(i=>i.id!==id)};
 if(day.items.length>=200)throw new Error('El registro del día está lleno.');
 const grams=s.unit==='capsules'?s.amount*s.gramsPerUnit:s.amount;
 const food={id,name:s.name,unit:'por 100 g de producto',allergens:s.allergens,k:s.kind==='creatine'?0:s.k,p:s.kind==='creatine'?0:s.p,c:s.kind==='creatine'?0:s.c,f:s.kind==='creatine'?0:s.f};
 return {...day,items:[...day.items,{id,meal:s.timing==='postworkout'?'Suplementos · Postentreno':s.timing==='breakfast'?'Suplementos · Desayuno':'Suplementos · Noche',food,grams}]};
}
export function supplementsForDay(p:Profile,day:Day):Supplement[]{
 return (p.preparation?.supplements??[]).flatMap(s=>{
  const choice=day.nutrition?.supplements.find(x=>x.id===s.id);
  return !day.nutrition?[s]:choice?[{...s,amount:choice.amount,timing:choice.timing}]:day.items.some(i=>i.id==='supplement-'+s.id)?[s]:[];
 });
}
export function competitionContext(c:Competition,date:string){
 const days=Math.ceil((Date.parse(c.fight)-Date.parse(date+'T23:59:59'))/86400000);
 const hours=(Date.parse(c.fight)-Date.parse(c.weighIn))/3600000;
 return {days,hours,taper:c.taper&&days>=0&&days<=7,sameDay:new Date(c.fight).toLocaleDateString('en-CA')===new Date(c.weighIn).toLocaleDateString('en-CA')};
}
