'use client';
import {useOrganization} from './organization-context';
import type {Modality} from './modality';
export default function Brand({onLight=false,modality='boxing',layout='compact'}:{onLight?:boolean;modality?:Modality|null;layout?:'compact'|'emblem'}){
 const company=useOrganization()?.organization;
 if(company?.slug==='team-alache'&&company.brand.logo==='/brand/team-alache-white.svg'&&layout==='compact')return <img className="tenant-logo tenant-logo-horizontal" src={onLight?'/brand/team-alache-horizontal-ink.svg':'/brand/team-alache-horizontal-white.svg'} width="176" height="50" alt="Team Alache 44"/>;
 if(company&&company.slug!=='rise')return company.brand.logo?<img className="tenant-logo" src={company.brand.logo} width="176" height="66" alt={company.name}/>:<span className={'tenant-wordmark '+(onLight?'on-light':'')}>{company.name}</span>;
 return modality==='boxing'?<img className="rise-logo" src={onLight?'/brand/rise-boxing-ink.svg':'/brand/rise-boxing.svg'} width="176" height="66" alt="RISE Boxing"/>:<span className="rise-gym-brand"><b>RISE</b><small>{modality==='hypertrophy'?'HIPERTROFIA':'ELIGE TU CAMINO'}</small></span>;
}
