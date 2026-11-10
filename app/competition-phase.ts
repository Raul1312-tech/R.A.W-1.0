import type {Competition} from './preparation-schema';
import {weightTrend,type Profile} from './model.ts';
export const phaseNames={camp:'Campamento',taper:'Puesta a punto','fight-week':'Fight week','weigh-in':'Día de pesaje',recovery:'Recuperación tras el pesaje','fight-day':'Día de combate',complete:'Competición finalizada'};
export type CompetitionPhase=keyof typeof phaseNames;
const dateFormatters=new Map<string,Intl.DateTimeFormat>();
export function localCompetitionDate(instant:string,c:Competition){
 const zone=c.timeZone??'Europe/Madrid';let formatter=dateFormatters.get(zone);
 if(!formatter){formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});dateFormatters.set(zone,formatter)}
 return formatter.format(new Date(instant));
}
const distance=(from:string,to:string)=>Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000);
export function competitionPhase(c:Competition,date:string){
 const weighDay=localCompetitionDate(c.weighIn,c),fightDay=localCompetitionDate(c.fight,c),daysToWeigh=distance(date,weighDay),daysToFight=distance(date,fightDay);
 const hours=(Date.parse(c.fight)-Date.parse(c.weighIn))/3600000;
 const weighed=!!c.weighInResult&&localCompetitionDate(c.weighInResult.at,c)<=date;
 const phase:CompetitionPhase=daysToFight<0?'complete':date===fightDay?'fight-day':weighed||date>weighDay?'recovery':date===weighDay?'weigh-in':daysToWeigh<=7?'fight-week':daysToFight<=14?'taper':'camp';
 return {phase,label:phaseNames[phase],weighDay,fightDay,daysToWeigh,daysToFight,hours,sameDay:weighDay===fightDay,shortRecovery:hours<12,weighed,active:phase!=='complete'};
}
export function competitionStatus(p:Profile,date:string){
 const c=p.preparation?.competition,pending=p.athlete?.competitionWeight.mode==='target'?p.athlete.competitionWeight:undefined;
 if(!date||!c&&!pending)return null;
 const latest=Object.entries(p.days).filter(([dt,d])=>dt<=date&&d.weight!==null).sort(([a],[b])=>a.localeCompare(b)).at(-1);
 const context=c?competitionPhase(c,date):null;
 const result=context?.weighed?c!.weighInResult:undefined;
 const weight=result?.weight??latest?.[1].weight??p.weight,target=c?.weight??pending!.weight;
 const trend=weightTrend({...p,days:Object.fromEntries(Object.entries(p.days).filter(([dt])=>dt<=date))});
 const recentTrend=trend&&distance(trend.end,date)<=7?trend:null;
 const gap=Math.max(0,Math.round((weight-target)*10)/10),active=context?.active??true;
 const trendGap=recentTrend?Math.max(0,recentTrend.current-target):null;
 const trajectory=recentTrend&&context&&context.daysToWeigh>0&&trendGap!==null?recentTrend.current+recentTrend.change*context.daysToWeigh/7:null;
 return {context,weight,target,gap,trend:recentTrend,trajectory,weightDate:result?localCompetitionDate(result.at,c!):latest?.[0],red:active&&gap>0,needsDates:!c,staleWeight:!result&&(!latest||distance(latest[0],date)>7),event:pending?.event,notes:c?.notes,active};
}
