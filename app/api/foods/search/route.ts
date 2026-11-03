import {offSearchResult,type FoodSearchResult} from '../../../open-food-facts.ts';
export const maxDuration=30;
const cache=new Map<string,{until:number;value:FoodSearchResult}>();
const pending=new Map<string,Promise<FoodSearchResult>>();
let requests:number[]=[];
const headers={'Cache-Control':'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'};
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;const q=(params.get('q')??'').trim().replace(/\s+/g,' ');const page=Number(params.get('page')??1);
 if(q.length<3||q.length>80||!/[\p{L}\p{N}]/u.test(q)||!Number.isInteger(page)||page<1||page>20)return Response.json({error:'Escribe al menos 3 caracteres para buscar un alimento o una marca.'},{status:400});
 const key=q.toLocaleLowerCase('es')+'|'+page,now=Date.now();const cached=cache.get(key);if(cached&&cached.until>now)return Response.json(cached.value,{headers});
 if(!pending.has(key)){
  requests=requests.filter(time=>now-time<60000);
  if(requests.length>=8)return Response.json({error:'Hay muchas búsquedas en este momento. Espera un minuto; los alimentos guardados siguen disponibles.'},{status:429,headers:{'Retry-After':'60','Cache-Control':'no-store'}});
  requests.push(now);
  const job=(async()=>{
   // Fixed public endpoint. Never forward profiles, cookies, journal data or secrets.
   const plain=q.replace(/[^\p{L}\p{N}\s-]/gu,' ').trim();
   const response=await fetch('https://search.openfoodfacts.org/search',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'RAW/1.0 (https://raw-1-0.vercel.app)'},body:JSON.stringify({q:/^\d{8,14}$/.test(plain)?`code:"${plain}"`:plain,langs:['es','en'],page,page_size:24,fields:['code','product_name','product_name_es','brands','nutriments','allergens_tags','categories_tags']}),cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('Food provider unavailable');
   const result=offSearchResult(await response.json(),page);if(cache.size>=250)cache.delete(cache.keys().next().value!);cache.set(key,{until:Date.now()+86400000,value:result});return result;
  })();pending.set(key,job);
 }
 try{return Response.json(await pending.get(key),{headers})}catch{return Response.json({error:'El catálogo ampliado no responde ahora. Puedes usar los alimentos guardados o añadir la etiqueta.'},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'60'}})}finally{pending.delete(key)}
}
