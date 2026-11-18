import Dashboard from '../dashboard';
import DemoOrganization from '../demo-organization';
import {publicCompany} from '../../lib/platform-server';
export const metadata={title:'RISE · Modo de prueba',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{company?:string}>}){const {company}=await searchParams;const brand=company?await publicCompany(company):null;return <DemoOrganization slug={company} initial={brand}><Dashboard demo/></DemoOrganization>}
