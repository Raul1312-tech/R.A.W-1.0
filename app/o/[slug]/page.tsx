import {redirect} from 'next/navigation';
import Dashboard from '../../dashboard';
import {OrganizationProvider} from '../../organization-context';
import {platformContext,PlatformError,publicCompany} from '../../../lib/platform-server';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const c=await publicCompany((await params).slug);return {title:c?c.name+' · Tu espacio':'Tu espacio',description:c?.brand.tagline??'Alimentación, entrenamiento y seguimiento privado.'}}
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 try{const {context}=await platformContext(slug,true);return <OrganizationProvider value={context}><Dashboard/></OrganizationProvider>}
 catch(error){if(error instanceof PlatformError&&error.status===401)redirect('/login?company='+encodeURIComponent(slug));return <main className="auth-card"><h1>Acceso a tu empresa</h1><p>{error instanceof PlatformError?error.message:'No se pudo abrir la empresa.'}</p><a href="/empresas">Ver mis empresas</a></main>}
}
