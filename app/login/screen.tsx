'use client';
import {useRef,useState} from 'react';
import {ArrowUpRight,ShieldCheck,Mail,ArrowLeft,Dumbbell,Check} from 'lucide-react';
import {createClient} from '../../lib/supabase/client';
import {loginErrorMessage} from '../../lib/auth-error';
import {submitPasswordAuth,type LoginMode} from '../../lib/password-auth';

export default function Login({configured}:{configured:boolean}){
  const [mode,setMode]=useState<LoginMode>('signin');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirmation,setConfirmation]=useState('');
  const [sent,setSent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const submitting=useRef(false);
  function changeMode(next:LoginMode){setMode(next);setError('');setSent(false);setPassword('');setConfirmation('')}
  async function submit(event:React.FormEvent){
    event.preventDefault();if(submitting.current)return;
    submitting.current=true;setBusy(true);setError('');
    try{
      const result=await submitPasswordAuth(createClient().auth,{mode,email,password,confirmation,origin:window.location.origin});
      setPassword('');setConfirmation('');
      if(result==='signed-in'){window.location.assign('/');return}
      setSent(true);
    }catch(error){setError(loginErrorMessage(error))}
    finally{submitting.current=false;setBusy(false)}
  }
  return <main className="auth-page">
    <div className="auth-brand"><span className="brand-icon" aria-hidden="true"><i/><i/><i/></span><b>R.A.W<span className="brand-period">.</span></b><span className="auth-version">1.0 / FUERZA · NUTRICIÓN</span></div>
    <div className="auth-layout">
      <section className="auth-story"><span className="eyebrow">EL TRABAJO EMPIEZA CONTIGO</span><h1>ENTRENA.<br/>ALIMÉNTATE.<br/><em>SUPÉRATE.</em></h1><p>Un plan para cada día. Un registro de cada esfuerzo.<br/>Tu progreso, siempre contigo.</p><div className="auth-rules"><span><b>01</b> Alimentación con propósito</span><span><b>02</b> Hábitos que se pueden medir</span><span><b>03</b> Constancia por encima de perfección</span></div><div className="auth-stamp"><Dumbbell size={24}/><span>DISCIPLINA DIARIA.<br/><b>PROGRESO REAL.</b></span></div></section>
      <section className="auth-card"><span className="pill green-pill"><ShieldCheck size={14}/> ESPACIO PRIVADO</span>
        {sent?<>
          <div className="auth-mail"><Mail size={32}/></div><h2>Revisa tu correo.</h2>
          <p>{mode==='recover'?'Si este correo tiene una cuenta, recibirás un enlace para establecer tu contraseña.':'Si el correo puede registrarse, recibirás un enlace de confirmación. Si ya tienes cuenta, vuelve al acceso o recupera tu contraseña.'}</p>
          <p>Abre el enlace en este mismo navegador. Revisa también spam. Después entrarás con tu correo y contraseña, sin pedir enlaces cada vez.</p>
          <button className="button soft full" onClick={()=>changeMode('signin')}><ArrowLeft size={16}/> Volver al acceso</button>
        </>:<>
          <h2>{mode==='signin'?'Vuelve a tu ritmo.':mode==='signup'?'Empieza aquí.':'Crea tu contraseña.'}</h2>
          <p>{mode==='signin'?'Entra con tu correo y contraseña. Tu plan te espera.':mode==='signup'?'Crea tu espacio privado. Confirmarás tu correo una sola vez.':'Si antes entrabas con un enlace o has olvidado tu contraseña, te enviaremos un correo para elegir una nueva.'}</p>
          {mode==='recover'&&<p className="notice">Este paso necesita un correo una sola vez. Si has agotado el límite de envíos, espera a que se libere el cupo antes de solicitarlo.</p>}
          <form onSubmit={submit}>
            <label className="field"><span>Correo electrónico</span><input type="email" autoComplete="email" placeholder="tu@correo.com" value={email} required maxLength={254} onChange={e=>setEmail(e.target.value)} disabled={busy||!configured}/></label>
            {mode!=='recover'&&<label className="field"><span>Contraseña</span><input type="password" autoComplete={mode==='signup'?'new-password':'current-password'} value={password} required minLength={mode==='signup'?12:undefined} maxLength={128} onChange={e=>setPassword(e.target.value)} disabled={busy||!configured}/>{mode==='signup'&&<small>Al menos 12 caracteres. Usa una contraseña que no utilices en otras webs.</small>}</label>}
            {mode==='signup'&&<label className="field"><span>Repite la contraseña</span><input type="password" autoComplete="new-password" value={confirmation} required maxLength={128} onChange={e=>setConfirmation(e.target.value)} disabled={busy||!configured}/></label>}
            <button className="button orange full" disabled={busy||!configured}>{busy?'Un momento…':mode==='signin'?'Entrar':mode==='signup'?'Crear cuenta':'Enviar correo para crear contraseña'}<ArrowUpRight size={18}/></button>
          </form>
          <div className="auth-links">
            {mode==='signin'?<><button className="text-button" disabled={busy} onClick={()=>changeMode('recover')}>No tengo contraseña / La he olvidado</button><button className="text-button" disabled={busy} onClick={()=>changeMode('signup')}>Soy nuevo · Crear cuenta</button></>:<button className="text-button" disabled={busy} onClick={()=>changeMode('signin')}><ArrowLeft size={14}/> Ya tengo cuenta · Entrar</button>}
          </div>
          <ul className="auth-checks"><li><Check size={15}/> Acceso con correo y contraseña</li><li><Check size={15}/> Historial sincronizado entre dispositivos</li><li><Check size={15}/> Solo tú accedes a tus perfiles y registros</li></ul>
        </>}
        {!configured&&<p className="notice error">Estamos preparando la conexión. El acceso estará disponible cuando termine la configuración.</p>}
        {error&&<p className="notice error" role="alert">{error}</p>}
        <p className="auth-fine">R.A.W 1.0 · Alimentación y entrenamiento para adultos.<br/>Tus datos de seguimiento requieren iniciar sesión.</p>
      </section>
    </div>
    <footer className="auth-footer"><span>R.A.W 1.0</span><span>FUERZA. HÁBITOS. EVOLUCIÓN.</span><span className="flag-line" aria-hidden="true"/></footer>
  </main>;
}
