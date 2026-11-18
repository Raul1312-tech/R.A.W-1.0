import {redirect} from 'next/navigation';
import Dashboard from './dashboard';
import {OrganizationProvider} from './organization-context';
import {platformContext,PlatformError} from '../lib/platform-server';
export const dynamic='force-dynamic';
export default async function Page(){
 try{const {context}=await platformContext('rise',true);return <OrganizationProvider value={context}><Dashboard/></OrganizationProvider>}
 catch(error){if(error instanceof PlatformError&&error.status===401)redirect('/login');return <main className="auth-card"><h1>Tu espacio</h1><p>{error instanceof PlatformError?error.message:'No se pudo abrir tu empresa.'}</p><a className="button orange" href="/empresas">Ver mis empresas y accesos</a><a href="/superadmin">Gestión de plataforma</a></main>}
}
