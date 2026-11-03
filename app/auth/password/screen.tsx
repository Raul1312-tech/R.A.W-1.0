'use client';
import {useRef,useState} from 'react';
import {createClient} from '../../../lib/supabase/client';
import {loginErrorMessage} from '../../../lib/auth-error';
import {validateNewPassword} from '../../../lib/password-auth';

export default function PasswordScreen(){
  const [password,setPassword]=useState('');
  const [confirmation,setConfirmation]=useState('');
  const [busy,setBusy]=useState(false);
  const [saved,setSaved]=useState(false);
  const [error,setError]=useState('');
  const submitting=useRef(false);
  async function submit(event:React.FormEvent){
    event.preventDefault();if(submitting.current)return;
    submitting.current=true;setBusy(true);setError('');
    try{
      validateNewPassword(password,confirmation);
      const {error}=await createClient().auth.updateUser({password});
      if(error)throw error;
      setPassword('');setConfirmation('');setSaved(true);
    }catch(error){setError(loginErrorMessage(error))}
    finally{submitting.current=false;setBusy(false)}
  }
  return <main className="auth-error auth-card">
    <span className="eyebrow">R.A.W 1.0 · ACCESO PRIVADO</span>
    <h1>{saved?'Contraseña guardada.':'Tu acceso, listo.'}</h1>
    {saved?<><p role="status">Ya puedes entrar con tu correo y contraseña, sin solicitar un enlace cada vez.</p><a className="button orange full" href="/">Ir a mi plan</a></>:<>
      <p>Elige una contraseña para entrar sin correos. Si ya elegiste una al crear tu cuenta, puedes continuar a tu plan.</p>
      <form onSubmit={submit}>
        <label className="field"><span>Nueva contraseña</span><input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/><small>Al menos 12 caracteres. No reutilices contraseñas de otras webs.</small></label>
        <label className="field"><span>Repite la contraseña</span><input type="password" autoComplete="new-password" maxLength={128} required value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy}/></label>
        <button className="button orange full" disabled={busy}>{busy?'Guardando…':'Guardar contraseña'}</button>
      </form>
      {error&&<p className="notice error" role="alert">{error}</p>}
      {!busy&&<a className="button soft full" href="/">Continuar a mi plan</a>}
    </>}
  </main>;
}
