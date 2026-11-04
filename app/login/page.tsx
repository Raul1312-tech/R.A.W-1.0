import Login from './screen';
import {configured} from '../../lib/supabase/config';
export default async function Page({searchParams}:{searchParams:Promise<{mode?:string|string[]}>}){
  const {mode}=await searchParams;
  return <Login configured={configured()} initialMode={mode==='recover'?mode:'signin'}/>;
}
