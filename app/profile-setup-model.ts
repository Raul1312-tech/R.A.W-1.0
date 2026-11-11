import {z} from 'zod';
import {athleteSchema} from './athlete-schema.ts';
import {generatePlan,targets,type Profile} from './model.ts';
import {previewNutritionSituation} from './nutrition-situations-model.ts';
import {mealTimes,mealSlots} from './meal-layout.ts';
import {applyRepeats} from './preparation-model.ts';
import {stateSchema} from './validation.ts';

export const profileSetupSchema=z.object({
  name:z.string().trim().min(1,'Indica el nombre.').max(60),age:z.number().int().min(18).max(90),sex:z.enum(['male','female']),
  height:z.number().finite().min(120).max(230),weight:z.number().finite().min(30).max(250),goal:z.number().finite().min(30).max(250),
  activity:z.number().finite().min(1.2).max(2.2),waterGoal:z.number().finite().min(500).max(5000),
  mealCount:z.number().int().min(3).max(6),athlete:athleteSchema,
  health:z.string().max(2000),budget:z.string().max(200),allergens:z.array(z.string().max(60)).max(20),excluded:z.array(z.string().max(100)).max(40),confirmed:z.boolean(),
}).refine(value=>value.athlete.goal!=='gain'||value.goal>=value.weight,{path:['goal'],message:'Para ganar masa, el peso objetivo debe ser igual o superior al actual.'});

export const hasFoodHistory=(day:Profile['days'][string]|undefined)=>!!day&&(day.items.length>0||!!day.foodPlan?.records.length||day.complete);

/** Apply a reviewed setup atomically; recorded meals and past targets stay intact. */
export function saveProfileSetup(profile:Profile,input:unknown,today:string):Profile{
  const fields=profileSetupSchema.parse(input);
  const weightGoal=fields.athlete.competitionWeight;
  let competition=profile.preparation?.competition;
  if(weightGoal.mode==='none')competition=undefined;
  else if(competition)competition={...competition,weight:weightGoal.weight};
  const athlete={...fields.athlete,competitionWeight:weightGoal.mode==='target'&&competition?{...weightGoal,date:new Date(competition.weighIn).toLocaleDateString('en-CA')}:weightGoal};
  let next:Profile={...profile,...fields,athlete,surplus:fields.athlete.goal==='gain'?300:0,
    goal:fields.athlete.goal==='gain'?fields.goal:fields.weight,
    preparation:profile.preparation||competition?{...profile.preparation,competition}:undefined,
    workouts:profile.workouts?{...profile.workouts,plans:profile.workouts.plans.map(plan=>({...plan,config:{...plan.config,competition}}))}:undefined};
  if(fields.confirmed){
    const previous=profile.plans.at(-1);
    const plan=generatePlan(next,(previous?.seed??0)+1,previous);
    if(!plan)throw new Error('No podemos generar un menú con esta combinación de comidas, objetivo y exclusiones. Revisa el perfil; tus datos anteriores siguen guardados.');
    next={...next,plans:[...profile.plans,plan].slice(-36)};
    const target=targets(next);
    next.days=Object.fromEntries(Object.entries(profile.days).map(([date,day])=>{
      if(date<today)return [date,day];
      const oldCount=day.foodPlan?.meals.length??day.nutrition?.mealCount??profile.mealCount??5;
      const ordinary=!day.nutrition||['coordinated','profile-meal-count','sparring-week'].includes(day.nutrition.situationId)||day.nutrition.situationId.startsWith('quick-');
      if(oldCount!==next.mealCount&&ordinary&&!day.competition){
        const settings=day.nutrition,slots=mealSlots(next.mealCount!);
        const outsideMeals=[...new Map((settings?.outsideMeals??[]).map(outside=>{
          const slot=slots.reduce((best,slot)=>Math.abs(slot-outside.slot)<Math.abs(best-outside.slot)?slot:best,slots[0]);
          return [slot,{...outside,slot}];
        })).values()];
        const updated=previewNutritionSituation({...next,days:{...next.days,[date]:day}},{
          id:settings?.situationId??'profile-meal-count',name:settings?.name??'Nuevo reparto de comidas',
          mealCount:next.mealCount!,times:mealTimes(next.mealCount!,next.athlete?.schedule??'regular',next.onboarding?.completed?.answers.nutrition),
          training:settings?.training??'usual',supplements:settings?.supplements??[],outsideMeals,
        },date,plan.seed);
        return [date,updated];
      }
      return [date,!hasFoodHistory(day)&&!day.nutrition?{...day,target,foodPlan:undefined}:day];
    }));
    if(next.preparation?.monthlyMenus)next.preparation={...next.preparation,monthlyMenus:next.preparation.monthlyMenus.map(month=>({...month,created:month.days.some(day=>day.date>=today&&!hasFoodHistory(profile.days[day.date]))?new Date().toISOString():month.created,days:month.days.map(day=>{
      if(day.date<today||hasFoodHistory(profile.days[day.date]))return day;
      const weekday=(new Date(day.date+'T12:00:00Z').getUTCDay()+6)%7;
      return {...day,meals:applyRepeats(next,plan.week![weekday].meals)};
    })}))};
  }
  stateSchema.parse({active:next.id,profiles:[next]});
  return next;
}
