import {z} from 'zod';
import {foodPreferencesSchema,readinessSchema,baselineSchema} from './preparation-preferences.ts';
import {coachSettings} from './coach-schema.ts';
import {nutritionSituationSchema} from './nutrition-situation-schema.ts';
const num=(a:number,b:number)=>z.number().finite().min(a).max(b);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const food=z.object({id:z.string().max(100),name:z.string().max(120),unit:z.string().max(120),allergens:z.array(z.string().max(60)).max(20),k:num(0,10000),p:num(0,1000),c:num(0,2000),f:num(0,1000),group:z.string().max(60).optional()});
const meal=z.object({name:z.string().max(150),prep:z.string().max(1000).optional(),items:z.array(z.object({food,grams:num(.1,3000)})).min(1).max(20)});
export const competitionSchema=z.object({fight:z.string().datetime({offset:true}),weighIn:z.string().datetime({offset:true}),weight:num(30,250),rounds:num(1,15).int().optional(),roundMinutes:num(1,5).int().optional(),taper:z.boolean(),notes:z.string().max(1200),timeZone:z.string().max(100).refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value});return true}catch{return false}},'Zona horaria no válida.').optional(),weighInResult:z.object({weight:num(30,250),at:z.string().datetime({offset:true})}).optional()}).refine(c=>Date.parse(c.weighIn)<=Date.parse(c.fight),'El pesaje debe ser anterior al combate.');
export const preparationSchema=z.object({
  clubTemplates:z.array(z.object({id:z.string().min(1).max(100),name:z.string().min(1).max(80),kind:z.enum(['technique','sparring','circuit','mixed']),minutes:num(10,180).int(),rounds:num(0,20).int(),roundMinutes:num(1,5).int()})).max(12).optional(),
  clubRecords:z.record(date,z.object({name:z.string().min(1).max(80),kind:z.enum(['technique','sparring','circuit','mixed']),minutes:num(10,180).int(),rounds:num(0,20).int(),roundMinutes:num(1,5).int(),rpe:num(1,10).int(),notes:z.string().max(600)})).refine(records=>Object.keys(records).length<=365).optional(),
  sparringWeeks:z.record(date,z.string().date().nullable()).refine(records=>Object.keys(records).length<=52).optional(),
  hydration:z.object({mode:z.enum(['auto','manual']),manualGoal:num(1000,6000).optional(),heat:z.boolean().optional()}).optional(),
  coach:coachSettings.optional(),
  foodPreferences:foodPreferencesSchema.optional(),
  readiness:z.record(date,readinessSchema).refine(x=>Object.keys(x).length<=90).optional(),
  baselines:z.array(baselineSchema).max(30).optional(),
  supplementFeedback:z.record(date,z.record(z.string().max(100),z.enum(['skipped','poor-tolerance'])).refine(x=>Object.keys(x).length<=12)).refine(x=>Object.keys(x).length<=90).optional(),

  situations:z.array(nutritionSituationSchema).max(12).optional(),
  favorites:z.array(z.object({id:z.string().max(100),slot:num(0,5).int(),meal,repeat:z.boolean()})).max(40).optional(),
  supplements:z.array(z.object({id:z.string().max(100),name:z.string().min(1).max(100),kind:z.enum(['protein','creatine','sportsDrink']),timing:z.enum(['breakfast','during','postworkout','evening']),amount:num(.1,1000),unit:z.enum(['g','capsules','ml']),gramsPerUnit:num(.01,100),k:num(0,1000),p:num(0,100),c:num(0,100),f:num(0,100),allergens:z.array(z.string().max(60)).max(20)})).max(12).optional(),
  monthlyMenus:z.array(z.object({month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),created:z.string().datetime(),days:z.array(z.object({date,meals:z.array(meal).min(3).max(6)})).min(28).max(31)})).max(6).optional(),
  prices:z.record(z.string().max(100),z.object({perKg:num(.01,1000),packGrams:num(1,10000),checked:date,source:z.string().max(300)})).optional(),
  energyTarget:num(1200,6500).optional(),postalCode:z.string().regex(/^\d{5}$/).optional(),competition:competitionSchema.optional(),
}).superRefine((p,ctx)=>{
 const bad=(message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,message});
 if(new Set(p.situations?.map(s=>s.id)).size!==(p.situations?.length??0))bad('Situaciones duplicadas.');
 if(new Set(p.favorites?.map(f=>f.id)).size!==(p.favorites?.length??0))bad('Comidas guardadas duplicadas.');
 const repeated=p.favorites?.filter(f=>f.repeat)??[];
 if(new Set(repeated.map(f=>f.slot)).size!==repeated.length)bad('Elige una comida habitual por franja.');
 if(new Set(p.supplements?.map(s=>s.id)).size!==(p.supplements?.length??0))bad('Suplementos duplicados.');
 if(p.supplements?.some(s=>s.unit!=='ml'&&s.amount*(s.unit==='capsules'?s.gramsPerUnit:1)>200))bad('Revisa la cantidad del suplemento.');
 if(new Set(p.monthlyMenus?.map(m=>m.month)).size!==(p.monthlyMenus?.length??0))bad('Meses duplicados.');
 for(const m of p.monthlyMenus??[]){const [y,n]=m.month.split('-').map(Number),length=new Date(Date.UTC(y,n,0)).getUTCDate();if(m.days.length!==length||m.days.some((d,i)=>d.date!==m.month+'-'+String(i+1).padStart(2,'0')))bad('El mes debe contener todos sus días en orden.');}
 if(Object.keys(p.prices??{}).length>500)bad('Demasiados precios guardados.');
});
export type Preparation=z.infer<typeof preparationSchema>;
export type Competition=z.infer<typeof competitionSchema>;
export type Supplement=NonNullable<Preparation['supplements']>[number];
