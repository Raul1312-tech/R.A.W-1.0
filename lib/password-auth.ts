import type {SupabaseClient} from '@supabase/supabase-js';

export type LoginMode='signin'|'signup'|'recover';
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
  const callback=new URL('/auth/callback',input.origin).href;
  if(input.mode==='signin'){
    const {data,error}=await auth.signInWithPassword({email,password:input.password});
    if(error)throw error;
    if(!data.session)throw {code:'session_not_found'};
    return 'signed-in';
  }
  if(input.mode==='recover'){
    const {error}=await auth.resetPasswordForEmail(email,{redirectTo:callback});
    if(error)throw error;
    return 'check-email';
  }
  validateNewPassword(input.password,input.confirmation);
  const {data,error}=await auth.signUp({email,password:input.password,options:{emailRedirectTo:callback}});
  if(error)throw error;
  return data.session?'signed-in':'check-email';
}
