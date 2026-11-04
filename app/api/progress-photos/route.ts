import {createClient} from '../../../lib/supabase/server';
import {configured} from '../../../lib/supabase/config';
import {reply,sameOrigin} from '../../../lib/request';
import {PHOTO_BUCKET,validProfile,validPhotoDate,validView,photoName,parsePhotoName,readPhotoBody} from '../../../lib/progress-photos';
export const dynamic='force-dynamic';
async function context(request:Request){
  if(!configured())return reply({error:'El álbum privado aún no está configurado.'},503);
  const profile=new URL(request.url).searchParams.get('profile')??'';if(!validProfile(profile))return reply({error:'Perfil no válido.'},400);
  const db=await createClient();const {data:{user},error}=await db.auth.getUser();if(error||!user||user.is_anonymous)return reply({error:'Inicia sesión para abrir tu álbum privado.'},401);
  const {data:journal,error:journalError}=await db.from('journals').select('payload').eq('owner',user.id).maybeSingle();
  if(journalError)return reply({error:'No se pudo comprobar tu perfil.'},503);
  if(!journal?.payload?.profiles?.some((p:{id:string})=>p.id===profile))return reply({error:'Guarda este perfil antes de añadir fotos.'},404);
  return {db,profile,prefix:`${user.id}/${profile}`};
}
export async function GET(request:Request){
  const ctx=await context(request);if(ctx instanceof Response)return ctx;
  const params=new URL(request.url).searchParams;const name=params.get('name');const storage=ctx.db.storage.from(PHOTO_BUCKET);
  if(name){if(!parsePhotoName(name,ctx.profile))return reply({error:'Foto no válida.'},400);const {data,error}=await storage.download(`${ctx.prefix}/${name}`);if(error||!data)return reply({error:'No se pudo abrir esta foto.'},404);return new Response(data,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="progreso.jpg"'}})}
  const offset=Number(params.get('offset')??0);if(!Number.isInteger(offset)||offset<0||offset>100000)return reply({error:'Página no válida.'},400);
  const {data,error}=await storage.list(ctx.prefix,{limit:100,offset,sortBy:{column:'name',order:'desc'}});if(error)return reply({error:'No se pudo cargar el álbum. Vuelve a intentarlo.'},503);
  return reply({photos:data.map(item=>parsePhotoName(item.name,ctx.profile)).filter(Boolean),next:data.length===100?offset+100:null});
}
export async function POST(request:Request){
  if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);const ctx=await context(request);if(ctx instanceof Response)return ctx;
  const params=new URL(request.url).searchParams;const date=params.get('date')??'',view=params.get('view')??'';
  if(!validPhotoDate(date)||!validView(view))return reply({error:'Revisa la fecha y la vista.'},400);
  let bytes;try{bytes=await readPhotoBody(request)}catch(e){return reply({error:(e as Error).message},400)}
  const name=photoName(date,view,crypto.randomUUID());const {error}=await ctx.db.storage.from(PHOTO_BUCKET).upload(`${ctx.prefix}/${name}`,bytes,{contentType:'image/jpeg',upsert:false,cacheControl:'0'});
  return error?reply({error:'No se pudo guardar la foto. Conserva el original y reintenta.'},503):reply({photo:parsePhotoName(name,ctx.profile)},201);
}
export async function DELETE(request:Request){
  if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);const ctx=await context(request);if(ctx instanceof Response)return ctx;
  const name=new URL(request.url).searchParams.get('name')??'';if(!parsePhotoName(name,ctx.profile))return reply({error:'Foto no válida.'},400);
  const {error}=await ctx.db.storage.from(PHOTO_BUCKET).remove([`${ctx.prefix}/${name}`]);return error?reply({error:'No se pudo eliminar la foto.'},503):reply({ok:true});
}
