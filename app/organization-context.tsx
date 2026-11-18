'use client';
import {createContext,useContext,type ReactNode,type CSSProperties,useState} from 'react';
import {riseCompany,type PlatformContext} from '../lib/platform-model';
import {tenantFetch} from '../lib/tenant-fetch';
const Context=createContext<PlatformContext|null>(null);
export const useOrganization=()=>useContext(Context);
export function OrganizationProvider({value,children}:{value:PlatformContext;children:ReactNode}){
 const c=value.organization;return <Context.Provider value={value}><div data-organization={c.slug} style={{'--tenant-primary':c.brand.primary,'--tenant-accent':c.brand.accent,'--orange':c.brand.primary,'--green':c.brand.primary} as CSSProperties}>{children}</div></Context.Provider>;
}
export function OrganizationTools(){
 const ctx=useOrganization(),[shared,setShared]=useState(ctx?.shareFollowup??false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 if(!ctx)return null;
 const company=ctx.organization;
 if(ctx.demo)return <aside className="organization-tools"><span>{company.name} · Vista de marca de prueba</span><a href={'/demo/gestion/'+company.slug}>Volver al panel de prueba</a></aside>;
 return <aside className="organization-tools" aria-label="Mi empresa"><span>{company.name}</span><div><a href="/empresas">Mis empresas</a>{(ctx.role==='admin'||ctx.role==='coach'||ctx.superAdmin)&&<a href={'/admin/'+company.slug}>Gestión de empresa</a>}{ctx.superAdmin&&<a href="/superadmin">Superadmin</a>}
 <details><summary>Permisos de seguimiento</summary><p>Comparte los registros y perfiles de esta empresa con sus administradores y tu entrenador asignado. Puedes revocarlo. Las fotos siguen siendo privadas.</p><label className="checkbox"><input type="checkbox" checked={shared} disabled={busy} onChange={async e=>{const enabled=e.target.checked;setBusy(true);setMessage('');try{const r=await tenantFetch('/api/platform',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'consent',args:{organization_id:company.id,share_followup:enabled}})});const body=await r.json();if(!r.ok)throw Error(body.error);setShared(enabled);setMessage('Permiso actualizado.')}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}}/> Compartir mi seguimiento con {company.name}</label>{message&&<p role="status">{message}</p>}</details></div></aside>;
}
export function publicContext(company:Partial<PlatformContext['organization']>):PlatformContext{return {superAdmin:false,role:'user',shareFollowup:false,memberships:[],organization:{...riseCompany,...company}}}
