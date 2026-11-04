import {redirect} from 'next/navigation';
import {createClient} from '../lib/supabase/server';
import {configured} from '../lib/supabase/config';
import Dashboard from './dashboard';
import {hasPrivateAccess} from '../lib/password-auth';
export const dynamic='force-dynamic';
export default async function Page(){
  if(!configured())redirect('/login');
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!hasPrivateAccess(user))redirect('/login');
  return <Dashboard/>;
}
