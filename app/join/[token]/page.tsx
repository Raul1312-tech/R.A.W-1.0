import {createClient} from '../../../lib/supabase/server';
import {configured} from '../../../lib/supabase/config';
import JoinCompany from '../../join-company';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!configured()||!/^[a-f0-9]{64}$/.test(token))return <main className="auth-card"><h1>Invitación no disponible</h1><p>Solicita un nuevo enlace a tu empresa.</p><a href="/login">Ir al acceso</a></main>;
 const db=await createClient(),{data,error}=await db.rpc('platform_invite_info',{token});
 if(error||!data)return <main className="auth-card"><h1>Invitación no disponible</h1><p>Puede haber caducado, estar revocada o haberse utilizado. Solicita un enlace nuevo.</p><a href="/empresas">Mis empresas</a></main>;
 const {data:{user}}=await db.auth.getUser();
 return <JoinCompany token={token} company={data} email={user?.email??null}/>;
}
