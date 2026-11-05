import {z} from 'zod';
import {coachContext,validateCoachChoice,type CoachAction} from '../app/coach-model.ts';
import type {Profile} from '../app/model.ts';
export const weeklyReviewSchema=z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),source:z.enum(['ai','rules']),signature:z.string().max(18000),choice:z.object({priority:z.array(z.string()).max(4),action:z.enum(['keep','ease','fuel','coordinate','strategy'])}),facts:z.array(z.object({id:z.string(),title:z.string(),text:z.string(),why:z.string()})).max(20),summary:z.string().max(1500)});
export type WeeklyReview=z.infer<typeof weeklyReviewSchema>;
export function weeklyResult(p:Profile,date:string,raw:unknown,source:'ai'|'rules'):WeeklyReview{
 const context=coachContext(p,date),choice=validateCoachChoice(raw,context);
 return weeklyReviewSchema.parse({date,source,signature:context.signature,choice,facts:context.facts,summary:choice.action==='strategy'?context.options.strategy!.reasons.join(' '):choice.action==='keep'?'La revisión no propone aplicar cambios con la información disponible. Consulta las señales y los datos que faltan.':choice.action==='ease'?'Se propone revisar la carga por las señales de recuperación registradas.':'Se propone revisar las cantidades pendientes y su relación con el objetivo nutricional.'});
}
export function currentWeeklyAction(review:WeeklyReview,p:Profile,date:string):CoachAction|null{
 const context=coachContext(p,date);
 // Old daily changes must never be carried into another date.
 if(review.date!==date&&review.choice.action!=='strategy'&&review.choice.action!=='keep')return null;
 if(!context.allowedActions.includes(review.choice.action))return null;
 if(Date.parse(date+'T12:00:00Z')-Date.parse(review.date+'T12:00:00Z')>6*86400000)return null;
 return review.choice.action;
}
