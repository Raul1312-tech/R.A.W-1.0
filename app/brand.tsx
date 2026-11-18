'use client';
import {useOrganization} from './organization-context';
export default function Brand({onLight=false}:{onLight?:boolean}){
 const context=useOrganization(),company=context?.organization;
 if(company&&company.slug!=='rise')return company.brand.logo?<img className="tenant-logo" src={company.brand.logo} width="176" height="66" alt={company.name}/>:<span className={'tenant-wordmark '+(onLight?'on-light':'')}>{company.name}</span>;
 return <img className="rise-logo" src={onLight?'/brand/rise-boxing-ink.svg':'/brand/rise-boxing.svg'} width="176" height="66" alt="RISE Boxing"/>;
}
