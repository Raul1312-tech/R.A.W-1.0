import {z} from 'zod';

export const foodPreferenceIds={
  carbs:['bread','rice','sweetpotato','potato','pasta','oats','couscous','quinoa','cornflakes','tortilla'],
  protein:['chicken','beef','turkey','egg','eggwhite','yogurt','cottage','quark','tofu','lentils','beans','chickpeas'],
} as const;
const preference=z.enum(['usual','like','avoid']);
export const foodPreferencesSchema=z.object({
  foods:z.object(Object.fromEntries(Object.values(foodPreferenceIds).flat().map(id=>[id,preference.optional()]))).strict(),
  explore:z.boolean().optional(),
  variety:z.enum(['repeat','balanced','varied']),
  proteinStyle:z.enum(['any','fillet','minced']).optional(),
  certification:z.enum(['none','halal']),
}).strict();
export type FoodPreferences=z.infer<typeof foodPreferencesSchema>;
export const readinessSchema=z.object({sleep:z.enum(['good','fair','poor']),fatigue:z.enum(['low','mid','high']),pain:z.enum(['none','present']),motivation:z.enum(['high','mid','low'])}).strict();
export type Readiness=z.infer<typeof readinessSchema>;
export const baselineSchema=z.object({date:z.string().date(),runMinutes:z.number().int().min(1).max(180).optional(),runEffort:z.enum(['easy','moderate','hard']).optional(),movement:z.enum(['squat','push','pull']).optional(),reps:z.number().int().min(1).max(100).optional(),kg:z.number().min(0).max(500).optional()}).strict().refine(x=>(x.runMinutes!==undefined&&x.runEffort!==undefined)||(x.movement!==undefined&&x.reps!==undefined));
export type Baseline=z.infer<typeof baselineSchema>;
