import {z} from 'zod';

const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const settings={
  name:z.string().trim().min(1).max(60),
  mealCount:z.number().int().min(2).max(6),
  times:z.array(time).min(2).max(6),
  energyTarget:z.number().finite().min(1200).max(6500),
  training:z.enum(['training','rest']),
  supplements:z.array(z.object({id:z.string().min(1).max(100),amount:z.number().finite().min(.1).max(200),timing:z.enum(['breakfast','postworkout','evening'])})).max(12),
};
const validTimes=(s:{mealCount:number;times:string[]})=>s.times.length===s.mealCount&&s.times.every((t,i)=>!i||t>s.times[i-1]);
const uniqueSupplements=(s:{supplements:{id:string}[]})=>new Set(s.supplements.map(x=>x.id)).size===s.supplements.length;
export const nutritionSituationSchema=z.object({id:z.string().min(1).max(100),...settings})
  .refine(validTimes,'Indica una hora distinta y en orden para cada comida.')
  .refine(uniqueSupplements,'Hay suplementos repetidos.');
export const appliedNutritionSchema=z.object({situationId:z.string().min(1).max(100),...settings})
  .refine(validTimes).refine(uniqueSupplements);
export type NutritionSituation=z.infer<typeof nutritionSituationSchema>;
export type AppliedNutrition=z.infer<typeof appliedNutritionSchema>;
