import {NextResponse} from 'next/server';
import {createClient} from '../../../lib/supabase/server';
import {reply,sameOrigin} from '../../../lib/request';
export async function POST(request:Request){
  if(!sameOrigin(request))return reply({error:'Origen no permitido.'},403);
  const db=await createClient();const {error}=await db.auth.signOut({scope:'local'});
  if(error)return reply({error:'No se pudo cerrar la sesión. Reintenta.'},503);
  return NextResponse.redirect(new URL('/login',request.url),{status:303,headers:{'Cache-Control':'private, no-store'}});
}
