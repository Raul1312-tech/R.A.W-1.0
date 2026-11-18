import {z} from 'zod';
import {cookies} from 'next/headers';
import {reply,sameOrigin,readLimitedJson} from '../../../lib/request';
import {slugSchema} from '../../../lib/platform-model';
import {loginDestination} from '../../../lib/auth-context';
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
 try{const body=z.object({company:slugSchema.optional(),invite:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict().parse(await readLimitedJson(request));
 const jar=await cookies(),path=loginDestination(body.company,body.invite);
 if(path==='/')jar.delete('raw-return');else jar.set('raw-return',path,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:600});
 return reply({ok:true});}catch{return reply({error:'Destino de acceso no válido.'},400)}
}
