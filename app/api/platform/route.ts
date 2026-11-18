import {createHash} from 'node:crypto';
import {clientPlanCommand,applyClientPlanCommand,mergeStoredClientPlan} from '../../../lib/client-plan-editor';
import {z} from 'zod';
import {platformContext,readJournal,platformError,PlatformError,dbFailure} from '../../../lib/platform-server';
import {reply,readLimitedJson,sameOrigin} from '../../../lib/request';
import {companyInput,brandSchema,subscriptionInput,invoiceInput,clientMetrics} from '../../../lib/platform-model';
import {templateInput,applyCompanyTemplate,type CompanyTemplate} from '../../../lib/company-templates';
import {stateSchema} from '../../validation';
export const dynamic='force-dynamic';
const uuid=z.string().uuid(),role=z.enum(['admin','coach','user']);
const actionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('client_plan'),args:z.object({organization_id:uuid,user_id:uuid,profile_id:z.string().min(1).max(100),revision:z.number().int().min(1).max(2147483646),command:clientPlanCommand,commit:z.boolean(),previewToken:z.string().length(64).optional()}).strict()}),
 z.object({action:z.literal('create_company'),args:companyInput}),
 z.object({action:z.literal('update_company'),args:z.object({organization_id:uuid,company:companyInput,expected_updated_at:z.string().datetime({offset:true})}).strict()}),
 z.object({action:z.literal('brand'),args:z.object({organization_id:uuid,name:z.string().trim().min(2).max(100),brand:brandSchema,expected_updated_at:z.string().datetime({offset:true})}).strict()}),
 z.object({action:z.literal('invite'),args:z.object({organization_id:uuid,email:z.string().trim().email().max(254),role}).strict()}),
 z.object({action:z.literal('member'),args:z.object({organization_id:uuid,user_id:uuid,role,status:z.enum(['active','suspended']),coach_id:uuid.nullable()}).strict()}),
 z.object({action:z.literal('revoke_invite'),args:z.object({organization_id:uuid,id:uuid}).strict()}),
 z.object({action:z.literal('consent'),args:z.object({organization_id:uuid,share_followup:z.boolean()}).strict()}),
 z.object({action:z.literal('accept_invite'),args:z.object({token:z.string().regex(/^[a-f0-9]{64}$/)}).strict()}),
 z.object({action:z.literal('subscription'),args:subscriptionInput}),
 z.object({action:z.literal('invoice'),args:invoiceInput}),
 z.object({action:z.literal('invoice_status'),args:z.object({organization_id:uuid,id:uuid,status:z.enum(['draft','open','paid','void'])}).strict()}),
 z.object({action:z.literal('note'),args:z.object({organization_id:uuid,user_id:uuid,content:z.string().trim().min(1).max(4000)}).strict()}),
 z.object({action:z.literal('template'),args:templateInput}),
 z.object({action:z.literal('delete_template'),args:z.object({organization_id:uuid,id:uuid}).strict()}),
 z.object({action:z.literal('apply_template'),args:z.object({organization_id:uuid,user_id:uuid,profile_id:z.string().min(1).max(100),template_id:uuid,revision:z.number().int().min(0).max(2147483646)}).strict()})
]);
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export async function GET(request:Request){
 try{
  const url=new URL(request.url),{db,user,context}=await platformContext(url.searchParams.get('organization')??'rise');
  if(url.searchParams.has('client')){
   if(!context.superAdmin&&(!context.role||!['admin','coach'].includes(context.role)))throw new PlatformError('Seguimiento no autorizado.');
   const subject=uuid.parse(url.searchParams.get('client'));
   const {data,error}=await db.rpc('platform_client_detail',{org:context.organization.id,subject});if(error)dbFailure(error);
   const {data:member,error:memberError}=await db.from('organization_members').select('organization_id,user_id,role,status,display_name,coach_id,share_followup,last_seen,created_at').eq('organization_id',context.organization.id).eq('user_id',subject).maybeSingle();if(memberError)dbFailure(memberError);if(!member||member.status!=='active')throw new PlatformError('Usuario sin acceso activo.');
   return reply({...data,member});
  }
  const all=url.searchParams.get('scope')==='all';if(all&&!context.superAdmin)throw new PlatformError('Solo superadmin.');
  const page=z.coerce.number().int().min(0).max(10000).parse(url.searchParams.get('page')??0),search=z.string().max(100).parse(url.searchParams.get('q')??'');
  const {data,error}=await db.rpc('platform_snapshot_page',{org:all?null:context.organization.id,member_page:page,search});if(error)dbFailure(error);
  return reply({...data,context,userId:user.id,today:today()});
 }catch(error){return error instanceof z.ZodError?reply({error:'Solicitud no válida.'},400):platformError(error)}
}
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
 try{
  const parsed=actionSchema.parse(await readLimitedJson(request));
  // Accepting an invitation must work before the user is a member of the company.
  if(parsed.action==='accept_invite'){
   const {createClient}=await import('../../../lib/supabase/server'),db=await createClient();
   const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user||!user.email_confirmed_at||user.is_anonymous)throw new PlatformError('Inicia sesión con el correo de la invitación.',401);
   const {data,error}=await db.rpc('platform_action',{kind:parsed.action,args:parsed.args});if(error)dbFailure(error);return reply(data);
  }
  const {db,context}=await platformContext(new URL(request.url).searchParams.get('organization')??'rise');
  if(parsed.action==='client_plan'){
   const args=parsed.args;if(context.organization.id!==args.organization_id)throw new PlatformError('Empresa no válida.');
   const {data:detail,error:detailError}=await db.rpc('platform_client_detail',{org:args.organization_id,subject:args.user_id});if(detailError)dbFailure(detailError);
   if(!detail.canEdit)throw new PlatformError('No tienes permiso para editar los planes de este alumno.');
   if(detail.revision!==args.revision)return reply({error:'El alumno tiene cambios más recientes. Vuelve a abrir su ficha antes de editar.'},409);
   const result=applyClientPlanCommand(stateSchema.parse(detail.state),args.profile_id,args.command,today()),next=mergeStoredClientPlan(detail.state,result.state,args.profile_id,result.change);stateSchema.parse(next);
   if(new TextEncoder().encode(JSON.stringify(next)).length>2000000)return reply({error:'El registro supera 2 MB. Exporta y revisa el historial antes de añadir más planificación.'},413);
   const previewToken=createHash('sha256').update(JSON.stringify({org:args.organization_id,user:args.user_id,profile:args.profile_id,revision:args.revision,command:args.command,today:today(),change:result.change})).digest('hex');
   if(!args.commit)return reply({...result,state:next,previewToken});
   if(args.previewToken!==previewToken)return reply({error:'La propuesta ha cambiado. Revisa de nuevo las fechas antes de confirmar.'},409);
   const {data:revision,error:saveError}=await db.rpc('platform_save_client_plan',{org:args.organization_id,subject:args.user_id,new_payload:next,expected:args.revision,change:{kind:result.change.kind,month:result.change.month,dates:result.change.dates,profile:args.profile_id}});if(saveError)dbFailure(saveError);
   if(revision===null)return reply({error:'Hay un guardado más reciente. Vuelve a abrir la ficha; no se han sobrescrito sus datos.'},409);
   return reply({...result,state:next,revision,previewToken,updatedAt:new Date().toISOString()});
  }
  if(parsed.action==='apply_template'){
   const args=parsed.args;
   if(context.organization.id!==args.organization_id||!context.role||!['admin','coach'].includes(context.role))throw new PlatformError('Seguimiento no autorizado.');
   const journal=await readJournal(db,args.organization_id,args.user_id);
   if(journal.revision!==args.revision)return reply({error:'El registro cambió. Vuelve a abrir el seguimiento antes de aplicar una plantilla.'},409);
   const {data:snapshot,error:readError}=await db.rpc('platform_snapshot',{org:args.organization_id});if(readError)dbFailure(readError);
   const template=(snapshot.templates as CompanyTemplate[]).find(t=>t.id===args.template_id);if(!template)throw new PlatformError('Plantilla no encontrada.',404);
   if(!context.organization.modules[template.kind==='training'?'training':'nutrition'])throw new PlatformError('El módulo de esta plantilla está desactivado.');
   const state=stateSchema.parse(applyCompanyTemplate(stateSchema.parse(journal.payload),args.profile_id,template,today()));
   const {data,error}=await db.rpc('platform_save_journal',{org:args.organization_id,subject:args.user_id,new_payload:state,expected:args.revision});if(error)dbFailure(error);
   return data===null?reply({error:'Hay cambios nuevos del usuario. Revisa el seguimiento.'},409):reply({revision:data});
  }
  const args=parsed.action==='update_company'?{organization_id:parsed.args.organization_id,...parsed.args.company,expected_updated_at:parsed.args.expected_updated_at}:parsed.args;
  const {data,error}=await db.rpc('platform_action',{kind:parsed.action,args});if(error)dbFailure(error);return reply(data);
 }catch(error){if(error instanceof z.ZodError)return reply({error:error.issues[0]?.message??'Revisa los datos.'},400);if(error instanceof RangeError)return reply({error:'La solicitud es demasiado grande.'},413);if(error instanceof Error&&!(error instanceof PlatformError))return reply({error:error.message},400);return platformError(error)}
}
