import {z} from 'zod';
import {readLimitedJson,reply,sameOrigin} from '../../../lib/request';
import {stateSchema} from '../../validation';
import {requestContext,readJournal,platformError,dbFailure} from '../../../lib/platform-server';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{const {db,context}=await requestContext(request),data=await readJournal(db,context.organization.id);
 return reply({state:data.payload,revision:data.revision,updatedAt:data.updated_at});}catch(error){return platformError(error)}
}
export async function PUT(request:Request){
 if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
 try{
  const {db,context}=await requestContext(request);
  let input;try{input=await readLimitedJson(request)}catch(error){return reply({error:error instanceof RangeError?'Exporta tu historial: el registro supera el límite de 2 MB.':'Datos no válidos.'},error instanceof RangeError?413:400)}
  const parsed=z.object({state:stateSchema,revision:z.number().int().min(0).max(2147483646)}).strict().safeParse(input);
  if(!parsed.success)return reply({error:'Revisa los campos: hay valores no válidos.'},400);
  const {data,error}=await db.rpc('platform_save_journal',{org:context.organization.id,new_payload:parsed.data.state,expected:parsed.data.revision});
  if(error)dbFailure(error);
  if(data===null)return reply({error:'Hay cambios más recientes en otro dispositivo. Exporta esta copia y recarga antes de continuar.'},409);
  return reply({revision:data});
 }catch(error){return platformError(error)}
}
