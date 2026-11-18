import type {Profile} from './model.ts';
import {generateTrainingPlan,trainingPlanSchema,type TrainingConfig,type TrainingData} from './training-model.ts';
import {clubForDate,dailySessions,monthDates,planForDate,sessionsForDate} from './training-calendar-model.ts';

/** Same reviewed configuration in onboarding and future months, without rewriting the past. */
export function configuredTrainingMonth(data:TrainingData,selection:TrainingConfig,month:string,today:string,clubRecords:Record<string,unknown>={}){
 const config=selection.limitation?{...selection,days:[],physicalDays:[],runningDays:[],conditioningDays:0}:selection;
 const generated={...generateTrainingPlan(config),month};
 const overrides=[],clubOverrides:Record<string,'none'|'technique'|'sparring'>={};
 for(const date of monthDates(month)){
  const previous=planForDate(data,date);
  if(date<today||dailySessions(data,date).some(s=>s.pinned)||clubRecords[date]){
   overrides.push({date,source:'manual' as const,sessions:previous?structuredClone(sessionsForDate(previous,date)):[]});
   clubOverrides[date]=clubForDate(previous,date)??'none';
  }
 }
 return trainingPlanSchema.parse({...generated,overrides,clubOverrides});
}
export function applyOnboardingTraining(profile:Profile,selection:TrainingConfig,today:string):Profile{
 const data=profile.workouts??{plans:[],logs:[]};
 const end=new Date(Date.parse(today+'T12:00:00Z')+6*86400000).toISOString().slice(0,7);
 const months=[...new Set([today.slice(0,7),end,...data.plans.flatMap(p=>p.month&&p.month>today.slice(0,7)?[p.month]:[])])].sort();
 const plans=months.map(month=>configuredTrainingMonth(data,selection,month,today,profile.preparation?.clubRecords));
 return {...profile,workouts:{...data,plans:[...data.plans,...plans].slice(-12),logs:data.logs}};
}
