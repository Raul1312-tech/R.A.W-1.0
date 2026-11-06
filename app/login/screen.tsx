'use client';
import Brand from '../brand';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,ShieldCheck,Mail,ArrowLeft,Dumbbell,Check} from 'lucide-react';
import {createClient} from '../../lib/supabase/client';
import {loginErrorMessage} from '../../lib/auth-error';
import {canRequestAuthEmail,publishedLoginUrl,submitPasswordAuth,type LoginMode} from '../../lib/password-auth';
import {startGoogleAuth} from '../../lib/google-auth';

export default function Login({configured,googleEnabled=false,initialMode='signin'}:{configured:boolean;googleEnabled?:boolean;initialMode?:LoginMode}){
  const [mode,setMode]=useState<LoginMode>(initialMode);
  const [emailOrigin,setEmailOrigin]=useState<boolean|null>(null);
  useEffect(()=>{setEmailOrigin(canRequestAuthEmail(window.location.origin))},[]);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirmation,setConfirmation]=useState('');
  const [sent,setSent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const submitting=useRef(false);
  async function google(){
    if(submitting.current)return;
    submitting.current=true;setBusy(true);setError('');
    try{window.location.assign(await startGoogleAuth(createClient().auth,window.location.origin))}
    catch(error){setError(loginErrorMessage(error));submitting.current=false;setBusy(false)}
  }
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
    <div className="auth-brand"><Brand onLight/><span className="auth-version">DISCIPLINA · OFICIO · EVOLUCIÓN</span></div>
    <div className="auth-layout">
      <section className="auth-story"><span className="eyebrow">EL TRABAJO EMPIEZA CONTIGO</span><h1>EL TRABAJO<br/><em>HABLA.</em></h1><p>Un plan para cada día. Un registro de cada esfuerzo.<br/>Tu progreso, siempre contigo.</p><div className="auth-rules"><span><b>01</b> Alimentación con propósito</span><span><b>02</b> Hábitos que se pueden medir</span><span><b>03</b> Constancia por encima de perfección</span></div><div className="auth-stamp"><Dumbbell size={24}/><span>DISCIPLINA DIARIA.<br/><b>PROGRESO REAL.</b></span></div></section>
      <section className="auth-card"><span className="pill green-pill"><ShieldCheck size={14}/> ESPACIO PRIVADO</span>
        {sent?<>
          <div className="auth-mail"><Mail size={32}/></div><h2>Revisa tu correo.</h2>
          <p>{mode==='recover'?'Si este correo tiene una cuenta, recibirás un enlace para establecer tu contraseña.':'Si el correo puede registrarse, recibirás un enlace de confirmación. Si ya tienes cuenta, vuelve al acceso o recupera tu contraseña.'}</p>
          <p>Abre el enlace en este mismo navegador. Revisa también spam. Después entrarás con tu correo y contraseña, sin pedir enlaces cada vez.</p>
          <button className="button soft full" onClick={()=>changeMode('signin')}><ArrowLeft size={16}/> Volver al acceso</button>
        </>:<>
          <h2>{mode==='signin'?'Vuelve a tu ritmo.':mode==='signup'?'Empieza aquí.':'Crea tu contraseña.'}</h2>
          <p>{mode==='signin'?'Entra o crea tu cuenta con Google. Tu alimentación, entrenamiento y fotos quedan en tu espacio personal.':'Si antes entrabas con un enlace o has olvidado tu contraseña, te enviaremos un correo para elegir una nueva.'}</p>
          {mode==='signin'&&<div className="google-access">
            {emailOrigin===false?<a className="button soft full" href={publishedLoginUrl('signin')}>Continuar con Google en la web publicada <ArrowUpRight size={18}/></a>:<button type="button" className="button soft full" disabled={!configured||!googleEnabled||busy||emailOrigin===null} onClick={google}><span aria-hidden="true" style={{fontWeight:800,fontSize:22}}>G</span> {busy?'Conectando…':'Continuar con Google'}</button>}
            {!googleEnabled&&<p className="demo-login-note">Estamos terminando de configurar Google. Mientras tanto, las cuentas existentes pueden entrar con contraseña.</p>}
            <p className="demo-login-note">Sin crear otra contraseña ni esperar un enlace por correo.</p>
          </div>}
          {emailOrigin===false&&<div className="notice"><strong>Tu cuenta, en la web publicada.</strong><p>Para recuperar tu contraseña, continúa en raw-1-0.vercel.app. Así el correo no te enviará a una versión local que puede estar apagada.</p><a className="button orange full" href={publishedLoginUrl(mode)}>Continuar en la web publicada <ArrowUpRight size={18}/></a></div>}
          {mode==='recover'&&<p className="notice">Este paso necesita un correo una sola vez. Si has agotado el límite de envíos, espera a que se libere el cupo antes de solicitarlo.</p>}
          {mode!=='signin'&&emailOrigin===true&&<p className="notice">Solicita el correo y abre su enlace en el mismo navegador. Si lees el correo en Chrome, abre también esta página en Chrome antes de continuar.</p>}
          {(mode==='signin'||emailOrigin===true)&&<details open={mode==='recover'}><summary>{mode==='recover'?'Recuperar contraseña':'Ya tengo contraseña · Entrar por correo'}</summary><form onSubmit={submit}>
            <label className="field"><span>Correo electrónico</span><input type="email" autoComplete="email" placeholder="tu@correo.com" value={email} required maxLength={254} onChange={e=>setEmail(e.target.value)} disabled={busy||!configured}/></label>
            {mode!=='recover'&&<label className="field"><span>Contraseña</span><input type="password" autoComplete={mode==='signup'?'new-password':'current-password'} value={password} required minLength={mode==='signup'?12:undefined} maxLength={128} onChange={e=>setPassword(e.target.value)} disabled={busy||!configured}/>{mode==='signup'&&<small>Al menos 12 caracteres. Usa una contraseña que no utilices en otras webs.</small>}</label>}
            {mode==='signup'&&<label className="field"><span>Repite la contraseña</span><input type="password" autoComplete="new-password" value={confirmation} required maxLength={128} onChange={e=>setConfirmation(e.target.value)} disabled={busy||!configured}/></label>}
            <button className="button orange full" disabled={busy||!configured}>{busy?'Un momento…':mode==='signin'?'Entrar':mode==='signup'?'Crear cuenta':'Enviar correo para crear contraseña'}<ArrowUpRight size={18}/></button>
          </form></details>}
          <div className="auth-links">
            {mode==='signin'?<button className="text-button" disabled={busy} onClick={()=>changeMode('recover')}>No tengo contraseña / La he olvidado</button>:<button className="text-button" disabled={busy} onClick={()=>changeMode('signin')}><ArrowLeft size={14}/> Ya tengo cuenta · Entrar</button>}
          </div>
          <ul className="auth-checks"><li><Check size={15}/> Una cuenta, tu propio espacio</li><li><Check size={15}/> Historial sincronizado entre dispositivos</li><li><Check size={15}/> Tus registros y fotos no se comparten con otros usuarios</li></ul>
        </>}
        {!configured&&<p className="notice error">Estamos preparando la conexión. El acceso estará disponible cuando termine la configuración.</p>}
        {error&&<p className="notice error" role="alert">{error}</p>}
        <a className="button soft full" href="/demo">Entrar sin cuenta · Modo de prueba <ArrowUpRight size={18}/></a>
        <p className="demo-login-note">Prueba la app con datos de ejemplo. Los cambios se guardan solo en este navegador.</p>
        <p className="auth-fine">RISE Boxing · Alimentación y entrenamiento para adultos.<br/>Tus datos de seguimiento requieren iniciar sesión.<br/><a href="/privacidad">Privacidad</a> · <a href="/condiciones">Información de uso</a></p>
      </section>
    </div>
    <footer className="auth-footer"><span>RISE Boxing</span><span>CADA DÍA, UN NIVEL MÁS.</span><span className="flag-line" aria-hidden="true"/></footer>
  </main>;
}
