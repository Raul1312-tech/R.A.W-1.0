import type {SupabaseClient} from '@supabase/supabase-js';

export type LoginMode='signin'|'signup'|'recover';
export const PRIVATE_OWNER_ID='668804f0-9d88-4bef-871f-96288b202fa0';
export const PRIVATE_OWNER_EMAIL='raulfunnels@gmail.com';
/** Use only a user verified by Supabase getUser(), never client-supplied metadata. */
export function hasPrivateAccess(user:{id:string;email?:string;email_confirmed_at?:string;is_anonymous?:boolean}|null|undefined){
  return Boolean(user&&user.id===PRIVATE_OWNER_ID&&user.email?.toLowerCase()===PRIVATE_OWNER_EMAIL&&user.email_confirmed_at&&!user.is_anonymous);
}
export const AUTH_ORIGIN='https://raw-1-0.vercel.app';
export function canRequestAuthEmail(origin:string){return origin===AUTH_ORIGIN}
export function publishedLoginUrl(mode:LoginMode){return `${AUTH_ORIGIN}/login?mode=${mode}`}
export function validateNewPassword(password:string,confirmation:string){
  if(password.length<12||password.length>128)throw {code:'password_length'};
  if(password!==confirmation)throw {code:'password_mismatch'};
}

/** Password login never calls an email-sending endpoint. */
export async function submitPasswordAuth(
  auth:Pick<SupabaseClient['auth'],'signInWithPassword'|'signUp'|'resetPasswordForEmail'>,
  input:{mode:LoginMode;email:string;password:string;confirmation:string;origin:string},
):Promise<'signed-in'|'check-email'>{
  const email=input.email.trim();
  if(input.mode==='signup')throw {code:'signup_closed'};
  if(email.toLowerCase()!==PRIVATE_OWNER_EMAIL)throw {code:'private_access_only'};
  if(input.mode==='signin'){
    const {data,error}=await auth.signInWithPassword({email,password:input.password});
    if(error)throw error;
    if(!data.session)throw {code:'session_not_found'};
    return 'signed-in';
  }
  // Start the flow on the published origin, not just the redirect: PKCE needs
  // the verifier cookie in the same browser and origin as the callback.
  if(!canRequestAuthEmail(input.origin))throw {code:'email_origin_required'};
  const callback=new URL('/auth/callback',AUTH_ORIGIN).href;
  const {error}=await auth.resetPasswordForEmail(email,{redirectTo:callback});
  if(error)throw error;
  return 'check-email';
}
