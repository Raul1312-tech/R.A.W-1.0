import type {SupabaseClient} from '@supabase/supabase-js';
import {AUTH_ORIGIN} from './password-auth.ts';

export function googleCallback(origin:string){
  if(origin!==AUTH_ORIGIN)throw {code:'google_origin_required'};
  return `${AUTH_ORIGIN}/auth/callback?flow=google`;
}
export function callbackDestination(flow:string|null){return flow==='google'?'/':'/auth/password'}
export async function startGoogleAuth(auth:Pick<SupabaseClient['auth'],'signInWithOAuth'>,origin:string){
  const {data,error}=await auth.signInWithOAuth({provider:'google',options:{redirectTo:googleCallback(origin),skipBrowserRedirect:true,queryParams:{prompt:'select_account'}}});
  if(error)throw error;
  if(!data.url)throw {code:'oauth_url_missing'};
  return data.url;
}
