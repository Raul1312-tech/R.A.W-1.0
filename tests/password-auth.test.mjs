import test from 'node:test';
import assert from 'node:assert/strict';
import {submitPasswordAuth,validateNewPassword,publishedLoginUrl} from '../lib/password-auth.ts';
import {loginErrorMessage} from '../lib/auth-error.ts';

const input={mode:'signin',email:' person@example.test ',password:'  a long test password  ',confirmation:'  a long test password  ',origin:'https://raw-1-0.vercel.app'};
const unexpected=async()=>assert.fail('Unexpected auth operation');
const auth={signInWithPassword:unexpected,signUp:unexpected,resetPasswordForEmail:unexpected};

test('email flows must start on the published origin before sending or storing a verifier',async()=>{
  for(const origin of ['http://127.0.0.1:5185','http://localhost:3000','https://preview.vercel.app','https://raw-1-0.vercel.app.evil.test','http://raw-1-0.vercel.app']){
    for(const mode of ['signup','recover']){
      await assert.rejects(submitPasswordAuth(auth,{...input,origin,mode}),{code:'email_origin_required'});
    }
  }
  assert.equal(publishedLoginUrl('recover'),'https://raw-1-0.vercel.app/login?mode=recover');
});

test('existing password sign-in remains available locally without sending email',async()=>{
  assert.equal(await submitPasswordAuth({...auth,signInWithPassword:async()=>({data:{session:{}},error:null})},{...input,origin:'http://127.0.0.1:5185'}),'signed-in');
});

test('password login obtains a session without sending mail or trimming the password',async()=>{
  let calls=0;
  const result=await submitPasswordAuth({...auth,signInWithPassword:async args=>{
    calls++;assert.deepEqual(args,{email:'person@example.test',password:input.password});
    return {data:{session:{user:{id:'test'}}},error:null};
  }},input);
  assert.equal(result,'signed-in');assert.equal(calls,1);
});

test('failed or missing session never reports successful sign-in',async()=>{
  for(const result of [{data:{session:null},error:null},{data:{session:null},error:{code:'invalid_credentials'}}]){
    await assert.rejects(submitPasswordAuth({...auth,signInWithPassword:async()=>result},input));
  }
  assert.equal(loginErrorMessage({code:'invalid_credentials'}),loginErrorMessage({code:'user_not_found'}));
});

test('signup waits for email confirmation, without treating a user object as a session',async()=>{
  assert.equal(await submitPasswordAuth({...auth,signUp:async args=>{
    assert.equal(args.options.emailRedirectTo,'https://raw-1-0.vercel.app/auth/callback');
    return {data:{user:{id:'pending'},session:null},error:null};
  }},{...input,mode:'signup'}),'check-email');
});

test('signup rejects mismatch or short passwords before any network call',async()=>{
  await assert.rejects(submitPasswordAuth(auth,{...input,mode:'signup',confirmation:'different'}),{code:'password_mismatch'});
  await assert.rejects(submitPasswordAuth(auth,{...input,mode:'signup',password:'short',confirmation:'short'}),{code:'password_length'});
  assert.throws(()=>validateNewPassword('x'.repeat(129),'x'.repeat(129)),{code:'password_length'});
});

test('recovery uses the existing allowed callback and propagates the email quota error',async()=>{
  const error={code:'over_email_send_rate_limit',status:429};
  await assert.rejects(submitPasswordAuth({...auth,resetPasswordForEmail:async(email,options)=>{
    assert.equal(email,'person@example.test');
    assert.equal(options.redirectTo,'https://raw-1-0.vercel.app/auth/callback');
    return {error};
  }},{...input,mode:'recover'}),error);
});
