import {createHash} from 'node:crypto';
import {z} from 'zod';
import {createClient} from '../../../lib/supabase/server';
import {hasPrivateAccess} from '../../../lib/password-auth';
import {reply,sameOrigin,readLimitedJson} from '../../../lib/request';
import {stateSchema} from '../../validation';
import {coachContext,validateCoachChoice} from '../../coach-model';
import {selectCoachPriorities} from '../../../lib/coach-ai';
import type {Profile} from '../../model';
export const dynamic='force-dynamic';
export const maxDuration=40;
const requestSchema=z.object({profile:z.string().min(1).max(100),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),signature:z.string().max(18000)}).strict();
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
 const db=await createClient();const {data:{user},error}=await db.auth.getUser();
 if(error||!hasPrivateAccess(user))return reply({error:'Inicia sesión para usar la revisión IA.'},401);
 let body;try{body=requestSchema.parse(await readLimitedJson(request))}catch{return reply({error:'Solicitud no válida.'},400)}
 if(!process.env.OPENAI_API_KEY)return reply({error:'La conexión IA aún no está disponible. Las explicaciones del plan siguen funcionando.'},503);
 const {data:journal,error:readError}=await db.from('journals').select('payload').eq('owner',user!.id).maybeSingle();
 if(readError)return reply({error:'No se pudo comprobar el plan guardado.'},503);
 const saved=stateSchema.safeParse(journal?.payload);if(!saved.success)return reply({error:'Guarda tu perfil antes de solicitar una revisión.'},409);
 const p=saved.data.profiles.find(p=>p.id===body.profile) as Profile|undefined;
 if(!p?.confirmed||!p.preparation?.coach?.enabled)return reply({error:'Activa la revisión IA en este perfil antes de continuar.'},403);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(body.date)||Number.isNaN(Date.parse(body.date+'T12:00:00Z')))return reply({error:'Fecha no válida.'},400);
 const context=coachContext(p,body.date);if(context.signature!==body.signature)return reply({error:'Hay cambios pendientes de guardar. La revisión se hará sobre el plan guardado.'},409);
 const hash=createHash('sha256').update(context.signature).digest('hex'),day=new Date().toISOString().slice(0,10);
 const {data:cached,error:cacheError}=await db.from('coach_reviews').select('choice,created_at,input_hash,profile,slot').eq('owner',user!.id).eq('request_day',day);
 if(cacheError)return reply({error:'El registro de revisiones no está disponible. No se ha consultado a la IA.'},503);
 const match=cached?.find(r=>r.input_hash===hash&&r.profile===p.id);
 if(match){if(!match.choice)return reply({error:'Esta revisión está en curso o no pudo completarse. Puedes volver a revisarla mañana.'},409);try{return reply({choice:validateCoachChoice(match.choice,context),signature:context.signature,reviewedAt:match.created_at})}catch{return reply({error:'La revisión guardada no es válida.'},503)}}
 // Three account-wide slots per UTC day. Unique key makes concurrent requests safe.
 let slot=-1;
 for(let i=0;i<3;i++){
  const {error:claim}=await db.from('coach_reviews').insert({owner:user!.id,request_day:day,slot:i,profile:p.id,input_hash:hash});
  if(!claim){slot=i;break}if(claim.code!=='23505')return reply({error:'No se pudo reservar la revisión.'},503);
 }
 if(slot<0)return reply({error:'Has usado las tres revisiones IA de hoy. Las explicaciones del plan siguen actualizándose; podrás revisar de nuevo mañana (00:00 UTC).'},429);
 try{
  const {signature:_,canEase:__,...input}=context;
  const choice=validateCoachChoice(await selectCoachPriorities(input,process.env.OPENAI_API_KEY),context);
  const {error:writeError}=await db.from('coach_reviews').update({choice}).eq('owner',user!.id).eq('request_day',day).eq('slot',slot);
  if(writeError)throw new Error('CACHE_WRITE');
  return reply({choice,signature:context.signature,reviewedAt:new Date().toISOString()});
 }catch{return reply({error:'No se pudo completar la revisión IA. Tu plan no ha cambiado y las explicaciones verificadas siguen disponibles.'},503)}
}
