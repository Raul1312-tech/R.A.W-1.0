import {z} from 'zod';
import {coachSettings} from './coach-schema.ts';
import {nutritionSituationSchema} from './nutrition-situation-schema.ts';
const num=(a:number,b:number)=>z.number().finite().min(a).max(b);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const food=z.object({id:z.string().max(100),name:z.string().max(120),unit:z.string().max(120),allergens:z.array(z.string().max(60)).max(20),k:num(0,10000),p:num(0,1000),c:num(0,2000),f:num(0,1000),group:z.string().max(60).optional()});
const meal=z.object({name:z.string().max(150),prep:z.string().max(1000).optional(),items:z.array(z.object({food,grams:num(.1,3000)})).min(1).max(20)});
export const competitionSchema=z.object({fight:z.string().datetime({offset:true}),weighIn:z.string().datetime({offset:true}),weight:num(30,250),taper:z.boolean(),notes:z.string().max(1200)}).refine(c=>Date.parse(c.weighIn)<=Date.parse(c.fight),'El pesaje debe ser anterior al combate.');
export const preparationSchema=z.object({
  coach:coachSettings.optional(),
  situations:z.array(nutritionSituationSchema).max(12).optional(),
  favorites:z.array(z.object({id:z.string().max(100),slot:num(0,5).int(),meal,repeat:z.boolean()})).max(40).optional(),
  supplements:z.array(z.object({id:z.string().max(100),name:z.string().min(1).max(100),kind:z.enum(['protein','creatine']),timing:z.enum(['breakfast','postworkout','evening']),amount:num(.1,200),unit:z.enum(['g','capsules']),gramsPerUnit:num(.01,100),k:num(0,1000),p:num(0,100),c:num(0,100),f:num(0,100),allergens:z.array(z.string().max(60)).max(20)})).max(12).optional(),
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
 if(p.supplements?.some(s=>s.amount*(s.unit==='capsules'?s.gramsPerUnit:1)>200))bad('Revisa la cantidad del suplemento.');
 if(new Set(p.monthlyMenus?.map(m=>m.month)).size!==(p.monthlyMenus?.length??0))bad('Meses duplicados.');
 for(const m of p.monthlyMenus??[]){const [y,n]=m.month.split('-').map(Number),length=new Date(Date.UTC(y,n,0)).getUTCDate();if(m.days.length!==length||m.days.some((d,i)=>d.date!==m.month+'-'+String(i+1).padStart(2,'0')))bad('El mes debe contener todos sus días en orden.');}
 if(Object.keys(p.prices??{}).length>500)bad('Demasiados precios guardados.');
});
export type Preparation=z.infer<typeof preparationSchema>;
export type Competition=z.infer<typeof competitionSchema>;
export type Supplement=NonNullable<Preparation['supplements']>[number];
