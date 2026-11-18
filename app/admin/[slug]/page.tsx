import {redirect} from 'next/navigation';
import {platformContext,PlatformError} from '../../../lib/platform-server';
import Management from '../../management';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 try{const {context}=await platformContext(slug);if(!context.superAdmin&&context.role!=='admin'&&context.role!=='coach')return <main className="auth-card"><h1>Acceso reservado al equipo</h1><a href={'/o/'+slug}>Ir a mi app</a></main>;return <Management mode="company" slug={slug}/>}
 catch(error){if(error instanceof PlatformError&&error.status===401)redirect('/login?company='+encodeURIComponent(slug));return <main className="auth-card"><h1>Gestión de empresa</h1><p>{error instanceof PlatformError?error.message:'No se pudo abrir el acceso.'}</p><a href="/empresas">Mis empresas</a></main>}
}
