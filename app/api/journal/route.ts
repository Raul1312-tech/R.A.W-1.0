import {z} from 'zod';
import {createClient} from '../../../lib/supabase/server';
import {configured} from '../../../lib/supabase/config';
import {readLimitedJson,reply,sameOrigin} from '../../../lib/request';
import {stateSchema} from '../../validation';
import {hasPrivateAccess} from '../../../lib/password-auth';
export const dynamic='force-dynamic';
export async function GET(){
  if(!configured())return reply({error:'La conexión aún no está configurada.'},503);
  const db=await createClient();const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user)return reply({error:'Inicia sesión para consultar tu seguimiento.'},401);
  if(!hasPrivateAccess(user))return reply({error:'Esta cuenta no tiene acceso a la app privada.'},403);
  const {data,error}=await db.from('journals').select('payload,revision,updated_at').eq('owner',user.id).maybeSingle();
  if(error)return reply({error:'No se pudo cargar tu historial. Reintenta en unos momentos.'},503);
  return reply({state:data?.payload??null,revision:data?.revision??0,updatedAt:data?.updated_at??null});
}
export async function PUT(request:Request){
  if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
  if(!configured())return reply({error:'La conexión aún no está configurada.'},503);
  const db=await createClient();const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user)return reply({error:'Tu sesión ha caducado. Exporta los cambios antes de volver a entrar.'},401);
  if(!hasPrivateAccess(user))return reply({error:'Esta cuenta no tiene acceso a la app privada.'},403);
  let input;try{input=await readLimitedJson(request)}catch(error){return reply({error:error instanceof RangeError?'Exporta tu historial: el registro supera el límite de 2 MB.':'Datos no válidos.'},error instanceof RangeError?413:400)}
  const parsed=z.object({state:stateSchema,revision:z.number().int().min(0).max(2147483646)}).safeParse(input);
  if(!parsed.success)return reply({error:'Revisa los campos: hay valores no válidos.'},400);
  const {data,error}=await db.rpc('save_journal',{new_payload:parsed.data.state,expected_revision:parsed.data.revision});
  if(error)return reply({error:'No se pudo guardar. Tus cambios siguen disponibles para exportarlos.'},503);
  if(data===null)return reply({error:'Hay cambios más recientes en otro dispositivo. Exporta esta copia y recarga antes de continuar.'},409);
  return reply({revision:data});
}
