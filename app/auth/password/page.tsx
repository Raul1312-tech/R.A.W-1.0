import {redirect} from 'next/navigation';
import {createClient} from '../../../lib/supabase/server';
import {configured} from '../../../lib/supabase/config';
import PasswordScreen from './screen';
export const dynamic='force-dynamic';
export default async function Page(){
  if(!configured())redirect('/login');
  const db=await createClient();
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user)redirect('/login');
  return <PasswordScreen/>;
}
