import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {credentials} from '../../../../../lib/supabase/config';
import {reply,readLimitedJson} from '../../../../../lib/request';
import {stateSchema} from '../../../../validation';
import {coachContext} from '../../../../coach-model';
import {selectCoachPriorities} from '../../../../../lib/coach-ai';
import {weeklyResult} from '../../../../../lib/coach-weekly';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function POST(request:Request){
 let input;try{input=z.object({job:z.string().uuid(),secret:z.string().uuid()}).strict().parse(await readLimitedJson(request))}catch{return reply({error:'Solicitud no válida.'},400)}
 const {url,key}=credentials(),db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc('claim_coach_weekly',input);
 if(error||!data)return reply({error:'Trabajo no disponible.'},403);
 try{
  const p=stateSchema.parse({profiles:[data.profile],active:data.profile.id}).profiles[0];
  const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(data.date);
  const {signature:_,canEase:__,...context}=coachContext(p,date);
  let source:'ai'|'rules'='ai',choice:unknown;
  try{if(!process.env.OPENAI_API_KEY)throw new Error('Unavailable');choice=await selectCoachPriorities(context,process.env.OPENAI_API_KEY);weeklyResult(p,date,choice,'ai')}
  catch{source='rules';choice={priority:context.facts.slice(0,3).map(f=>f.id),action:'keep'}}
  const result=weeklyResult(p,date,choice,source);
  const {data:done,error:saveError}=await db.rpc('finish_coach_weekly',{...input,result});
  if(saveError||!done)return reply({error:'No se pudo guardar la revisión.'},503);
  return reply({ok:true});
 }catch{
  await db.rpc('finish_coach_weekly',{...input,result:null});
  return reply({error:'No se pudo preparar la revisión.'},503);
 }
}
