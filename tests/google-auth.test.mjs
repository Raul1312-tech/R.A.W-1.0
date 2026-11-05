import test from 'node:test';
import assert from 'node:assert/strict';
import {googleCallback,startGoogleAuth,callbackDestination} from '../lib/google-auth.ts';
test('Google flow uses fixed production callback and no arbitrary redirect',async()=>{
 const url=await startGoogleAuth({signInWithOAuth:async args=>{assert.equal(args.provider,'google');assert.equal(args.options.redirectTo,'https://raw-1-0.vercel.app/auth/callback?flow=google');assert.equal(args.options.skipBrowserRedirect,true);assert.deepEqual(args.options.queryParams,{prompt:'select_account'});return {data:{url:'https://test.supabase.co/auth/v1/authorize'},error:null}}},'https://raw-1-0.vercel.app');
 assert.equal(url,'https://test.supabase.co/auth/v1/authorize');
 for(const origin of ['https://evil.test','http://localhost:3000','https://raw-1-0.vercel.app.evil.test'])assert.throws(()=>googleCallback(origin));
 assert.equal(callbackDestination('google'),'/');assert.equal(callbackDestination(null),'/auth/password');assert.equal(callbackDestination('https://evil.test'),'/auth/password');
});
test('OAuth failures do not return a success destination',async()=>{
 await assert.rejects(startGoogleAuth({signInWithOAuth:async()=>({data:{url:null},error:{code:'provider_disabled'}})},'https://raw-1-0.vercel.app'));
 await assert.rejects(startGoogleAuth({signInWithOAuth:async()=>({data:{url:null},error:null})},'https://raw-1-0.vercel.app'));
});
