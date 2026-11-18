import {publicCompany} from '../../lib/platform-server';
import {OrganizationProvider} from '../organization-context';
import {riseCompany} from '../../lib/platform-model';
import Login from './screen';
import {configured,credentials} from '../../lib/supabase/config';
export const dynamic='force-dynamic';
export async function generateMetadata({searchParams}:{searchParams:Promise<{company?:string}>}){const {company}=await searchParams,c=company?await publicCompany(company):null;return {title:c?c.name+' · Acceso':'RISE Boxing · Acceso'}}
export default async function Page({searchParams}:{searchParams:Promise<{mode?:string|string[];company?:string;invite?:string}>}){
  const {mode,company,invite}=await searchParams;
  const brand=company?await publicCompany(company):null;
  let googleEnabled=false;
  if(configured())try{
    const {url,key}=credentials();
    const response=await fetch(`${url}/auth/v1/settings`,{headers:{apikey:key},cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(response.ok){const settings=await response.json();googleEnabled=settings.external?.google===true&&settings.disable_signup!==true}
  }catch{/* Fail closed while provider settings cannot be checked. */}
  return <OrganizationProvider value={{organization:{...riseCompany,...brand},superAdmin:false,role:null,memberships:[],shareFollowup:false}}><Login configured={configured()} googleEnabled={googleEnabled} initialMode={mode==='recover'?mode:'signin'} company={company} invite={invite}/></OrganizationProvider>;
}
