import {scopedApi} from './platform-model';
/** Scope every request to the page, so two company tabs cannot exchange journals. */
export function tenantFetch(input:string,init?:RequestInit){return fetch(scopedApi(input,typeof window==='undefined'?'/':window.location.pathname),init)}
