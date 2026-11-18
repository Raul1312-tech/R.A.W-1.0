'use client';
import {useOrganization} from './organization-context';
import type {Modality} from './modality';
export default function Brand({onLight=false,modality='boxing'}:{onLight?:boolean;modality?:Modality|null}){
 const company=useOrganization()?.organization;
 if(company&&company.slug!=='rise')return company.brand.logo?<img className="tenant-logo" src={company.brand.logo} width="176" height="66" alt={company.name}/>:<span className={'tenant-wordmark '+(onLight?'on-light':'')}>{company.name}</span>;
 return modality==='boxing'?<img className="rise-logo" src={onLight?'/brand/rise-boxing-ink.svg':'/brand/rise-boxing.svg'} width="176" height="66" alt="RISE Boxing"/>:<span className="rise-gym-brand"><b>RISE</b><small>{modality==='hypertrophy'?'HIPERTROFIA':'ELIGE TU CAMINO'}</small></span>;
}
