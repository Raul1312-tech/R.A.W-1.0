import {redirect} from 'next/navigation';
import {createClient} from '../lib/supabase/server';
import {configured} from '../lib/supabase/config';
import Dashboard from './dashboard';
export const dynamic='force-dynamic';
export default async function Page(){
  if(!configured())redirect('/login');
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)redirect('/login');
  return <Dashboard/>;
}
