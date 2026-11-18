import {redirect} from 'next/navigation';
import {platformContext,PlatformError} from '../../lib/platform-server';
import Management from '../management';
export const dynamic='force-dynamic';
export default async function Page(){
 try{const {context}=await platformContext();if(!context.superAdmin)return <main className="auth-card"><h1>Acceso reservado</h1><p>Este panel está disponible para el superadmin de la plataforma.</p><a href="/empresas">Mis empresas</a></main>;return <Management mode="super"/>}
 catch(error){if(error instanceof PlatformError&&error.status===401)redirect('/login');return <main className="auth-card"><h1>Panel de plataforma</h1><p>No se pudo abrir tu acceso. Reintenta en unos momentos.</p><a href="/login">Volver al acceso</a></main>}
}
