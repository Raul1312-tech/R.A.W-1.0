import {NextResponse} from 'next/server';
import {createClient} from '../../../lib/supabase/server';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  const url=new URL(request.url);const code=url.searchParams.get('code');
  if(code){const db=await createClient();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL('/',url.origin),{headers:{'Cache-Control':'private, no-store'}})}
  return NextResponse.redirect(new URL('/auth/error',url.origin),{headers:{'Cache-Control':'private, no-store'}});
}
