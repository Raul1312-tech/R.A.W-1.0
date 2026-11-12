import type {Profile} from './model.ts';
export type Modality='boxing'|'hypertrophy';
/** Explicit profile choice wins; old accounts retain their last saved sport. */
export function modalityOf(p:Profile):Modality|null{
 if(p.athlete?.sport==='strength')return 'hypertrophy';
 if(p.athlete?.sport==='boxing')return 'boxing';
 return p.workouts?.plans.at(-1)?.config.sport??null;
}
export const modalityName=(m:Modality|null)=>m==='boxing'?'Boxeo':m==='hypertrophy'?'Hipertrofia':'Elige tu camino';
