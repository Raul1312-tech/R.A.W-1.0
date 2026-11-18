import {redirect} from 'next/navigation';
import {PlatformError,dbFailure} from '../../lib/platform-server';
import {createClient} from '../../lib/supabase/server';
import {hasPrivateAccess} from '../../lib/password-auth';
import type {PlatformContext} from '../../lib/platform-model';
export const dynamic='force-dynamic';
export default async function Page(){
 try{
  const db=await createClient(),{data:{user},error:authError}=await db.auth.getUser();if(authError||!hasPrivateAccess(user))throw new PlatformError('Inicia sesión.',401);
  const {data,error}=await db.rpc('platform_memberships');if(error)dbFailure(error);const context=data as Pick<PlatformContext,'memberships'|'superAdmin'>;
  return <main className="management-shell"><header className="management-top"><a href="/">Volver a mi app</a>{context.superAdmin&&<a className="button orange" href="/superadmin">Abrir superadmin</a>}</header><div className="management-heading"><span className="eyebrow">TU ESPACIO DE TRABAJO</span><h1>Mis empresas</h1><p>Cada empresa conserva sus propios registros, equipo y marca.</p></div><div className="management-company-grid">{context.memberships.map(({organization:c,role,status})=><article className="management-card" key={c.id}>{c.brand.logo&&<img className="company-preview-logo" src={c.brand.logo} alt={c.name}/>}<h2>{c.name}</h2><p>{role==='admin'?'Administrador':role==='coach'?'Entrenador':'Usuario'} · {status==='active'&&c.status==='active'?'Acceso activo':'Acceso suspendido'}</p>{status==='active'&&c.status==='active'&&<div className="raw-actions"><a className="button orange" href={'/o/'+c.slug}>Entrar en mi app</a>{role!=='user'&&<a className="button outline" href={'/admin/'+c.slug}>Gestionar empresa</a>}</div>}</article>)}</div></main>;
 }catch(error){if(error instanceof PlatformError&&error.status===401)redirect('/login');return <main className="auth-card"><h1>Mis empresas</h1><p>No se pudo cargar el acceso. Si recibiste una invitación, ábrela para incorporarte a tu empresa.</p><a href="/login">Volver al acceso</a></main>}
}
