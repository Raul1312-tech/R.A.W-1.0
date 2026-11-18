import type {Profile} from '../app/model.ts';
import type {ModuleKey} from './platform-model.ts';
/** Keep prescriptions of unavailable modules intact when unrelated profile fields change. */
export function preserveDisabledFeatures(before:Profile,next:Profile,modules:Record<ModuleKey,boolean>):Profile{
 const result={...next};
 if(!modules.training){if(before.workouts)result.workouts=before.workouts;else delete result.workouts;}
 if(!modules.nutrition){result.plans=before.plans;result.days=Object.fromEntries(Object.entries(next.days).map(([date,day])=>[date,{...day,items:before.days[date]?.items??[],foodPlan:before.days[date]?.foodPlan}]));}
 return result;
}
