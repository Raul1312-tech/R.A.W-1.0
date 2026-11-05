import {z} from 'zod';
import {createClient} from '../../../../lib/supabase/server';
import {hasPrivateAccess} from '../../../../lib/password-auth';
import {reply,readLimitedJson,sameOrigin} from '../../../../lib/request';
import {weeklyReviewSchema} from '../../../../lib/coach-weekly';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const db=await createClient(),{data:{user},error}=await db.auth.getUser();
 if(error||!hasPrivateAccess(user))return reply({error:'Inicia sesión.'},401);
 const profile=new URL(request.url).searchParams.get('profile');if(!profile||profile.length>100)return reply({error:'Perfil no válido.'},400);
 const {data,error:readError}=await db.from('coach_weekly_reviews').select('id,review,reviewed_at,dismissed').eq('owner',user!.id).eq('profile',profile).order('week',{ascending:false}).limit(1).maybeSingle();
 if(readError)return reply({error:'No se pudo consultar la revisión semanal.'},503);
 if(!data||data.dismissed)return reply({review:null});
 const review=weeklyReviewSchema.safeParse(data.review);if(!review.success)return reply({error:'Revisión no disponible.'},503);
 return reply({review:{...data,review:review.data}});
}
export async function PATCH(request:Request){
 if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
 const db=await createClient(),{data:{user},error}=await db.auth.getUser();
 if(error||!hasPrivateAccess(user))return reply({error:'Inicia sesión.'},401);
 let input;try{input=z.object({id:z.string().uuid()}).strict().parse(await readLimitedJson(request))}catch{return reply({error:'Solicitud no válida.'},400)}
 const {error:writeError}=await db.from('coach_weekly_reviews').update({dismissed:true}).eq('id',input.id).eq('owner',user!.id);
 return writeError?reply({error:'No se pudo archivar.'},503):reply({ok:true});
}
