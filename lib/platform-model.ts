import {z} from 'zod';
import type {State} from '../app/model.ts';

export const moduleLabels={nutrition:'Alimentación',training:'Entrenamiento',boxing:'Boxeo',competition:'Competición',ai:'Mentor IA',photos:'Fotos de progreso',learning:'Aprende',progress:'Seguimiento'} as const;
export type ModuleKey=keyof typeof moduleLabels;
export const moduleKeys=Object.keys(moduleLabels) as ModuleKey[];
export const allModules=Object.fromEntries(moduleKeys.map(key=>[key,true])) as Record<ModuleKey,boolean>;
export const roleLabels={admin:'Administrador',coach:'Entrenador',user:'Usuario'} as const;
export type CompanyRole=keyof typeof roleLabels;
export const slugSchema=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(2).max(60);
const logo=z.string().max(180000).refine(value=>value===''||/^https:\/\/[^\s<>"]+$/.test(value)||/^\/(?!\/)[a-zA-Z0-9/_.-]+$/.test(value)||/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value),'Usa una imagen PNG, JPEG o WebP, o una dirección HTTPS.');
export const brandSchema=z.object({logo:logo.default(''),primary:z.string().regex(/^#[0-9a-fA-F]{6}$/),accent:z.string().regex(/^#[0-9a-fA-F]{6}$/),tagline:z.string().trim().max(160).default('Tu progreso, acompañado.')}).strict();
export const modulesSchema=z.object(Object.fromEntries(moduleKeys.map(key=>[key,z.boolean()])) as Record<ModuleKey,z.ZodBoolean>).strict().refine(m=>!m.boxing||m.training,'Boxeo necesita Entrenamiento.').refine(m=>!m.competition||(m.training&&m.nutrition),'Competición necesita Alimentación y Entrenamiento.');
export const companyInput=z.object({name:z.string().trim().min(2).max(100),slug:slugSchema,kind:z.enum(['boxing','gym','academy','mixed']),status:z.enum(['active','suspended']),brand:brandSchema,modules:modulesSchema,max_users:z.number().int().min(1).max(100000),max_staff:z.number().int().min(1).max(1000),self_signup:z.boolean().default(false)}).strict();
export type Company=z.infer<typeof companyInput>&{id:string;created_at:string;updated_at:string};
export type Membership={organization_id:string;user_id:string;role:CompanyRole;status:'active'|'suspended';display_name:string;email?:string;coach_id:string|null;share_followup:boolean;last_seen:string|null;created_at:string};
export type PlatformContext={demo?:boolean;superAdmin:boolean;organization:Company;role:CompanyRole|null;shareFollowup:boolean;memberships:{organization:Company;role:CompanyRole;status:string}[]};
export const riseCompany:Company={id:'rise',name:'RISE Boxing',slug:'rise',kind:'boxing',status:'active',brand:{logo:'',primary:'#006747',accent:'#d3a44a',tagline:'Disciplina. Oficio. Evolución.'},modules:allModules,max_users:100000,max_staff:1000,self_signup:true,created_at:'2026-11-18T00:00:00Z',updated_at:'2026-11-18T00:00:00Z'};
export const invoiceInput=z.object({organization_id:z.string().uuid(),number:z.string().trim().min(1).max(60),description:z.string().trim().min(1).max(200),amount_cents:z.number().int().min(0).max(100000000),due_date:z.string().date(),status:z.enum(['draft','open','paid','void']),period_start:z.string().date(),period_end:z.string().date()}).strict().refine(v=>v.period_end>=v.period_start,'Revisa el periodo de la factura.');
export const subscriptionInput=z.object({organization_id:z.string().uuid(),plan:z.string().trim().min(1).max(80),status:z.enum(['trial','active','past_due','cancelled']),monthly_cents:z.number().int().min(0).max(10000000),currency:z.literal('EUR'),renewal_date:z.string().date().nullable(),billing_email:z.string().email().max(254).or(z.literal('')),tax_id:z.string().max(40).default(''),legal_name:z.string().max(160).default('')}).strict();
export type Subscription=z.infer<typeof subscriptionInput>;
export type Invoice=z.infer<typeof invoiceInput>&{id:string;created_at:string};
export type Activity={id:string;organization_id:string|null;actor_id:string|null;actor_name:string;action:string;target:string|null;details:Record<string,unknown>;created_at:string};
export type ClientMetrics={profiles:number;lastRecord:string|null;days7:number;completed7:number;workouts7:number;minutes7:number;weight:number|null;weightChange:number|null;waterDays7:number;nutritionDays7:number};
export function clientMetrics(state:State|null,today:string):ClientMetrics{
 const p=state?.profiles.find(p=>p.id===state.active);
 const empty:ClientMetrics={profiles:state?.profiles.length??0,lastRecord:null,days7:0,completed7:0,workouts7:0,minutes7:0,weight:null,weightChange:null,waterDays7:0,nutritionDays7:0};
 if(!p)return empty;
 const start=new Date(Date.parse(today+'T12:00:00Z')-6*86400000).toISOString().slice(0,10);
 const days=Object.entries(p.days).filter(([d])=>d<=today).sort(([a],[b])=>a.localeCompare(b));
 const recent=days.filter(([d])=>d>=start),weights=days.filter(([,d])=>d.weight!==null);
 const latest=weights.at(-1)?.[1].weight??null;
 const previous=weights.filter(([d])=>d<start).at(-1)?.[1].weight??null;
 const actual=days.filter(([,d])=>d.items.length||d.minutes||d.water||d.weight!==null||d.steps!==null||d.sleep!==null);
 return {...empty,lastRecord:actual.at(-1)?.[0]??null,days7:recent.filter(([,d])=>d.items.length||d.minutes||d.water||d.weight!==null).length,completed7:recent.filter(([,d])=>d.complete).length,workouts7:(p.workouts?.logs??[]).filter(l=>l.date>=start&&l.date<=today).length+Object.keys(p.preparation?.clubRecords??{}).filter(d=>d>=start&&d<=today).length,minutes7:recent.reduce((n,[,d])=>n+d.minutes,0),weight:latest,weightChange:latest!==null&&previous!==null?Math.round((latest-previous)*10)/10:null,waterDays7:recent.filter(([,d])=>d.water>0).length,nutritionDays7:recent.filter(([,d])=>d.items.length>0).length};
}
export const canManage=(role:CompanyRole|null,superAdmin=false)=>superAdmin||role==='admin';
export function canFollow(actor:{id:string;role:CompanyRole|null},member:Membership){return actor.id===member.user_id||(member.share_followup&&(actor.role==='admin'||actor.role==='coach'&&member.coach_id===actor.id))}
export function canUseModule(company:Pick<Company,'status'|'modules'>,key:ModuleKey){return company.status==='active'&&company.modules[key]===true}
export function commercialMetrics(companies:Company[],subscriptions:Subscription[],invoices:Invoice[],today:string){
 const active=new Set(companies.filter(c=>c.status==='active').map(c=>c.id));
 return {companies:companies.length,activeCompanies:active.size,mrrCents:subscriptions.filter(s=>active.has(s.organization_id)&&s.status==='active').reduce((n,s)=>n+s.monthly_cents,0),paidCents:invoices.filter(i=>i.status==='paid').reduce((n,i)=>n+i.amount_cents,0),overdueCents:invoices.filter(i=>i.status==='open'&&i.due_date<today).reduce((n,i)=>n+i.amount_cents,0)};
}
export const money=(cents:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100);
export function scopedApi(input:string,path:string){
 const match=path.match(/^\/o\/([a-z0-9-]+)(?:\/|$)/);
 if(!match||!input.startsWith('/api/'))return input;
 return input+(input.includes('?')?'&':'?')+'organization='+encodeURIComponent(match[1]);
}
