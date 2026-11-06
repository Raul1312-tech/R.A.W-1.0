import {z} from 'zod';
import {mealSlots} from './meal-layout.ts';

const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const settings={
  name:z.string().trim().min(1).max(60),
  mealCount:z.number().int().min(2).max(6),
  times:z.array(time).min(2).max(6),
  // Retained for old exports; new situations always calculate their energy.
  energyTarget:z.number().finite().min(1200).max(6500).optional(),
  training:z.enum(['usual','training','rest']),
  trainingMinutes:z.number().int().min(15).max(240).optional(),
  trainingIntensity:z.enum(['light','moderate','hard']).optional(),
  outsideMeals:z.array(z.object({slot:z.number().int().min(0).max(5),size:z.enum(['normal','large'])})).max(6).optional(),
  supplements:z.array(z.object({id:z.string().min(1).max(100),amount:z.number().finite().min(.1).max(200),timing:z.enum(['breakfast','postworkout','evening'])})).max(12),
};
const validTimes=(s:{mealCount:number;times:string[]})=>s.times.length===s.mealCount&&s.times.every((t,i)=>!i||t>s.times[i-1]);
const uniqueSupplements=(s:{supplements:{id:string}[]})=>new Set(s.supplements.map(x=>x.id)).size===s.supplements.length;
const outsideSlots=(s:{mealCount:number;outsideMeals?:{slot:number}[]})=>new Set(s.outsideMeals?.map(m=>m.slot)).size===(s.outsideMeals?.length??0)&&(s.outsideMeals??[]).every(m=>mealSlots(s.mealCount).includes(m.slot));
export const nutritionSituationSchema=z.object({id:z.string().min(1).max(100),...settings})
  .refine(validTimes,'Indica una hora distinta y en orden para cada comida.')
  .refine(uniqueSupplements,'Hay suplementos repetidos.')
  .refine(outsideSlots,'Revisa las comidas fuera de casa.');
export const appliedNutritionSchema=z.object({situationId:z.string().min(1).max(100),...settings})
  .refine(validTimes).refine(uniqueSupplements).refine(outsideSlots);
export type NutritionSituation=z.infer<typeof nutritionSituationSchema>;
export type AppliedNutrition=z.infer<typeof appliedNutritionSchema>;
