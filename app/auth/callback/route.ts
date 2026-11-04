import {NextResponse} from 'next/server';
import {createClient} from '../../../lib/supabase/server';
import {hasPrivateAccess} from '../../../lib/password-auth';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  const url=new URL(request.url);const code=url.searchParams.get('code');
  // Recovery, signup confirmations and previous magic links share this fixed,
  // protected destination. Never accept an arbitrary redirect from the URL.
  if(code){
    const db=await createClient();const {error}=await db.auth.exchangeCodeForSession(code);
    if(!error){
      const {data:{user},error:identityError}=await db.auth.getUser();
      if(!identityError&&hasPrivateAccess(user))return NextResponse.redirect(new URL('/auth/password',url.origin),{headers:{'Cache-Control':'private, no-store'}});
      await db.auth.signOut({scope:'local'});
    }
  }
  return NextResponse.redirect(new URL('/auth/error',url.origin),{headers:{'Cache-Control':'private, no-store'}});
}
