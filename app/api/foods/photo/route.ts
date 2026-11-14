import {createHash} from 'node:crypto';
import {z} from 'zod';
import {createClient} from '../../../../lib/supabase/server';
import {hasPrivateAccess} from '../../../../lib/password-auth';
import {reply,sameOrigin,readLimitedJson} from '../../../../lib/request';
import {estimateFoodPhoto} from '../../../../lib/food-photo-ai';
import {photoEstimateSchema} from '../../../food-photo-model';
export const maxDuration=45;
export const dynamic='force-dynamic';
const schema=z.object({image:z.string().max(1_600_000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/),note:z.string().trim().max(400),consent:z.literal(true)}).strict();
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL)return reply({error:'Para analizar fotos abre la app con tu cuenta. Esta prueba local permite registrar manualmente.'},503);
 const db=await createClient(),{data:{user},error}=await db.auth.getUser();
 if(error||!hasPrivateAccess(user))return reply({error:'Inicia sesión con tu cuenta para analizar fotos. El registro manual sigue disponible.'},401);
 let body;try{body=schema.parse(await readLimitedJson(request));if(!Buffer.from(body.image.split(',')[1],'base64').subarray(0,3).equals(Buffer.from([255,216,255])))throw Error()}catch{return reply({error:'Foto no válida. Usa una imagen de comida y vuelve a intentarlo.'},400)}
 if(!process.env.OPENAI_FOOD_API_KEY)return reply({error:'El análisis por foto todavía no está configurado en este servidor.'},503);
 const hash=createHash('sha256').update('food-photo-v1|'+body.image+'|'+body.note).digest('hex'),day=new Date().toISOString().slice(0,10);
 const {data:rows,error:readError}=await db.from('coach_reviews').select('choice,input_hash,slot').eq('owner',user!.id).eq('request_day',day);
 if(readError)return reply({error:'No se pudo comprobar la disponibilidad del análisis.'},503);
 const match=rows?.find(row=>row.input_hash===hash);
 if(match){const parsed=photoEstimateSchema.safeParse(match.choice);return parsed.success?reply({estimate:parsed.data}):reply({error:'Este análisis ya está en curso o no se completó. Usa el registro manual.'},409)}
 let slot=-1;
 for(let i=0;i<3;i++){const {error:claim}=await db.from('coach_reviews').insert({owner:user!.id,request_day:day,slot:i,profile:'food-photo',input_hash:hash});if(!claim){slot=i;break}if(claim.code!=='23505')return reply({error:'No se pudo reservar el análisis.'},503)}
 if(slot<0)return reply({error:'Has utilizado las tres consultas IA de hoy, compartidas con el coordinador. Puedes registrar manualmente y volver mañana (00:00 UTC).'},429);
 try{
  const estimate=await estimateFoodPhoto(body.image,body.note,process.env.OPENAI_FOOD_API_KEY);
  // The existing usage ledger has a 2 kB cap. Keep a compact result when it fits,
  // otherwise just a receipt; never store the image or the user's note.
  const cached=Buffer.byteLength(JSON.stringify(estimate),'utf8')<1900?estimate:{foodPhoto:true,completed:true};
  const {error:writeError}=await db.from('coach_reviews').update({choice:cached}).eq('owner',user!.id).eq('request_day',day).eq('slot',slot);
  if(writeError)throw Error('No se pudo guardar el resultado del análisis.');
  return reply({estimate});
 }catch{return reply({error:'No se pudo completar el análisis. Tu comida no se ha registrado; puedes introducirla manualmente.'},503)}
}
