import {allTrainingSessions,type TrainingPlan} from './training-model.ts';

const canonical=(value:unknown):string=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);

/** Recover the unlabelled month-prefix snapshots made by the old catalog refresh.
 * Require a complete prefix of at least a week, exactly matching one older weekly
 * plan. An isolated edit, a different prescription or an explicit origin stays fixed.
 */
export function recognizeCopiedWeeks(plan:TrainingPlan,plans:TrainingPlan[]):TrainingPlan{
  if(plan.config.sport!=='boxing'||!plan.month||plan.config.catalogVersion!==2||!plan.created.startsWith(plan.month))return plan;
  const count=Number(plan.created.slice(8,10))-1;
  if(count<7)return plan;
  const prefix=Array.from({length:count},(_,i)=>plan.month+'-'+String(i+1).padStart(2,'0'));
  const copies=prefix.map(date=>plan.overrides?.find(o=>o.date===date));
  if(copies.some(o=>!o||o.source))return plan;
  const original=plans.find(old=>old.id!==plan.id&&old.created<=plan.created&&old.config.sport==='boxing'&&copies.every(o=>{
    const day=(new Date(o!.date+'T12:00:00Z').getUTCDay()+6)%7;
    // Manually edited dates in the older plan are not inferred to be generated copies.
    if(old.overrides?.some(x=>x.date===o!.date))return false;
    return canonical(o!.sessions)===canonical(allTrainingSessions(old).filter(s=>s.day===day&&s.kind!=='rest'));
  }));
  if(!original)return plan;
  return {...plan,overrides:plan.overrides?.map(o=>prefix.includes(o.date)?{...o,source:'weekly-copy' as const}:o)};
}
