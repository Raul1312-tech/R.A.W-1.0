import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {configured,credentials} from './lib/supabase/config';
export async function proxy(request:NextRequest){
  let response=NextResponse.next({request});
  if(request.nextUrl.pathname!=='/demo'&&configured()){
    const {url,key}=credentials();
    const supabase=createServerClient(url,key,{cookies:{
      getAll:()=>request.cookies.getAll(),
      setAll(values,headers){
        values.forEach(({name,value})=>request.cookies.set(name,value));
        response=NextResponse.next({request});
        values.forEach(({name,value,options})=>response.cookies.set(name,value,options));
        Object.entries(headers??{}).forEach(([k,v])=>response.headers.set(k,v));
      },
    }});
    await supabase.auth.getClaims();
  }
  response.headers.set('Cache-Control','private, no-store, max-age=0');
  return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']};
