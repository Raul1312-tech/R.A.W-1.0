import {newProfile,generatePlan,type State} from './model.ts';
import {defaultTrainingConfig,generateTrainingPlan} from './training-model.ts';
export function reviewState(today:string):State{
 const profiles=[5,6].map(days=>{
  const p={...newProfile('Hipertrofia · '+days+' días'),confirmed:true,athlete:{sport:'strength' as const,level:'experienced' as const,goal:'gain' as const,schedule:'regular' as const,competitionWeight:{mode:'none' as const}},surplus:150};
  return {...p,plans:[generatePlan(p,days)!],workouts:{plans:[{...generateTrainingPlan({...defaultTrainingConfig(),sport:'hypertrophy',level:'intermediate',phase:'build',duration:75,days:Array.from({length:days},(_,i)=>i)}),month:today.slice(0,7)}],logs:[]}};
 });
 return {active:profiles[0].id,profiles};
}
