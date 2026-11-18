'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {OrganizationProvider,publicContext} from './organization-context';
import {riseCompany,type Company} from '../lib/platform-model';
import {PLATFORM_DEMO_KEY,demoPlatform} from '../lib/platform-demo';
export default function DemoOrganization({slug,initial,children}:{slug?:string;initial?:Partial<Company>|null;children:ReactNode}){
 const [company,setCompany]=useState<Partial<Company>|null>(initial??null);
 useEffect(()=>{if(!slug||initial)return;try{const raw=localStorage.getItem(PLATFORM_DEMO_KEY),snapshot=raw?JSON.parse(raw):demoPlatform();const c=snapshot.organizations.find((c:Company)=>c.slug===slug);if(c)setCompany(c)}catch{}},[slug,initial]);
 return company?<OrganizationProvider value={{...publicContext({...riseCompany,...company}),demo:true}}>{children}</OrganizationProvider>:children;
}
