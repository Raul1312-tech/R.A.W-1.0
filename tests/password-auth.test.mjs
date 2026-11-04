import test from 'node:test';
import assert from 'node:assert/strict';
import {submitPasswordAuth,validateNewPassword,publishedLoginUrl,hasPrivateAccess,PRIVATE_OWNER_ID,PRIVATE_OWNER_EMAIL} from '../lib/password-auth.ts';
import {loginErrorMessage} from '../lib/auth-error.ts';

const input={mode:'signin',email:` ${PRIVATE_OWNER_EMAIL} `,password:'  a long test password  ',confirmation:'  a long test password  ',origin:'https://raw-1-0.vercel.app'};
const unexpected=async()=>assert.fail('Unexpected auth operation');
const auth={signInWithPassword:unexpected,signUp:unexpected,resetPasswordForEmail:unexpected};

test('email flows must start on the published origin before sending or storing a verifier',async()=>{
  for(const origin of ['http://127.0.0.1:5185','http://localhost:3000','https://preview.vercel.app','https://raw-1-0.vercel.app.evil.test','http://raw-1-0.vercel.app']){
    for(const mode of ['recover']){
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
    calls++;assert.deepEqual(args,{email:PRIVATE_OWNER_EMAIL,password:input.password});
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

test('signup is closed even for the owner, before any request is sent',async()=>{
  await assert.rejects(submitPasswordAuth(auth,{...input,mode:'signup'}),{code:'signup_closed'});
});

test('password setup validates length and confirmation',()=>{
  assert.throws(()=>validateNewPassword(input.password,'different'),{code:'password_mismatch'});
  assert.throws(()=>validateNewPassword('short','short'),{code:'password_length'});
  assert.throws(()=>validateNewPassword('x'.repeat(129),'x'.repeat(129)),{code:'password_length'});
});

test('recovery uses the existing allowed callback and propagates the email quota error',async()=>{
  const error={code:'over_email_send_rate_limit',status:429};
  await assert.rejects(submitPasswordAuth({...auth,resetPasswordForEmail:async(email,options)=>{
    assert.equal(email,PRIVATE_OWNER_EMAIL);
    assert.equal(options.redirectTo,'https://raw-1-0.vercel.app/auth/callback');
    return {error};
  }},{...input,mode:'recover'}),error);
});

test('other emails cannot initiate login or recovery',async()=>{
  for(const mode of ['signin','recover'])await assert.rejects(submitPasswordAuth(auth,{...input,mode,email:'other@example.test'}),{code:'private_access_only'});
});

test('private authorization requires the exact verified identity, not editable metadata',()=>{
  const owner={id:PRIVATE_OWNER_ID,email:PRIVATE_OWNER_EMAIL,email_confirmed_at:'2026-11-03T00:00:00Z',is_anonymous:false};
  assert.equal(hasPrivateAccess(owner),true);
  for(const user of [null,undefined,{...owner,id:'other'},{...owner,email:'other@example.test'},{...owner,email_confirmed_at:undefined},{...owner,is_anonymous:true},{id:'other',user_metadata:owner}])assert.equal(hasPrivateAccess(user),false);
});
