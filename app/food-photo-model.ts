import {z} from 'zod';
import type {Item} from './model.ts';
export const photoEstimateSchema=z.object({
 message:z.string().max(500),assumptions:z.array(z.string().max(250)).max(6),
 items:z.array(z.object({name:z.string().trim().min(1).max(120),grams:z.number().finite().min(1).max(2000),basis:z.string().max(160),k:z.number().min(0).max(950),p:z.number().min(0).max(100),c:z.number().min(0).max(100),f:z.number().min(0).max(100)}).strict().refine(x=>x.p+x.c+x.f<=105&&Math.abs(x.k-(4*x.p+4*x.c+9*x.f))<=Math.max(50,x.k*.25),'Composición incoherente')).max(12),
}).strict();
export type PhotoEstimate=z.infer<typeof photoEstimateSchema>;
export function photoItems(input:unknown):Item[]{
 const result=photoEstimateSchema.parse(input);
 return result.items.map(item=>({grams:Math.round(item.grams),food:{id:'photo-'+crypto.randomUUID(),name:item.name.slice(0,95)+' · estimación por foto',unit:'por 100 g · '+item.basis.slice(0,100),k:item.k,p:item.p,c:item.c,f:item.f,allergens:[]}}));
}
