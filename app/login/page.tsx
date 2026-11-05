import Login from './screen';
import {configured,credentials} from '../../lib/supabase/config';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{mode?:string|string[]}>}){
  const {mode}=await searchParams;
  let googleEnabled=false;
  if(configured())try{
    const {url,key}=credentials();
    const response=await fetch(`${url}/auth/v1/settings`,{headers:{apikey:key},cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(response.ok){const settings=await response.json();googleEnabled=settings.external?.google===true&&settings.disable_signup!==true}
  }catch{/* Fail closed while provider settings cannot be checked. */}
  return <Login configured={configured()} googleEnabled={googleEnabled} initialMode={mode==='recover'?mode:'signin'}/>;
}
