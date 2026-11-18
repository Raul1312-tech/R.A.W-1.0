import {createClient} from './supabase/server';
import {configured} from './supabase/config';
import {hasPrivateAccess} from './password-auth';
import {reply} from './request';
import {slugSchema,type PlatformContext,type ModuleKey} from './platform-model';
export class PlatformError extends Error{constructor(message:string,public status=403){super(message)}}
export function dbFailure(error:{code?:string;message?:string}):never{
 const expected=['42501','P0001','P0002','23505','23514','22023'];
 if(error.code==='40001')throw new PlatformError(error.message??'La configuración ha cambiado. Actualiza el panel.',409);
 throw new PlatformError(expected.includes(error.code??'')?(error.code==='23505'?'Ya existe un registro con ese identificador.':error.message??'No se pudo completar la operación.'):'No se pudo completar la operación. Reintenta en unos momentos.',error.code==='42501'?403:error.code==='P0002'?404:expected.includes(error.code??'')?400:503);
}
export async function platformContext(requested='rise',memberRequired=false){
 if(!configured())throw new PlatformError('La conexión aún no está configurada.',503);
 if(!slugSchema.safeParse(requested).success)throw new PlatformError('Empresa no válida.',400);
 const db=await createClient();const {data:{user},error}=await db.auth.getUser();
 if(error||!user||!hasPrivateAccess(user))throw new PlatformError('Inicia sesión para continuar.',401);
 const {data,error:contextError}=await db.rpc('platform_context',{requested});
 if(contextError)dbFailure(contextError);
 const context=data as PlatformContext;
 if(!context?.organization?.id)throw new PlatformError('No se pudo abrir tu empresa.',503);
 if(memberRequired&&(!context.role||context.organization.status!=='active'))throw new PlatformError('No tienes un acceso activo a esta empresa.');
 return {db,user,context};
}
export async function requestContext(request:Request,module?:ModuleKey){
 const result=await platformContext(new URL(request.url).searchParams.get('organization')??'rise',true);
 if(module&&!result.context.organization.modules[module])throw new PlatformError('Este módulo no está activo en tu empresa.');
 return result;
}
export async function readJournal(db:Awaited<ReturnType<typeof createClient>>,organization:string,subject?:string){
 const {data,error}=await db.rpc('platform_journal',{org:organization,...(subject?{subject}:{})});if(error)dbFailure(error);
 return data as {payload:unknown;revision:number;updated_at:string|null};
}
export function platformError(error:unknown){return error instanceof PlatformError?reply({error:error.message},error.status):reply({error:'No se pudo completar la operación. Reintenta en unos momentos.'},503)}
export async function publicCompany(slug:string){
 if(!configured()||!slugSchema.safeParse(slug).success)return null;
 const db=await createClient();const {data,error}=await db.rpc('organization_brand',{requested:slug});
 return error?null:data as Pick<PlatformContext['organization'],'name'|'slug'|'brand'|'status'|'modules'|'kind'>|null;
}
