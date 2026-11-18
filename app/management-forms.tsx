'use client';
import {useEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import {X,Upload,ImagePlus} from 'lucide-react';
import {companyInput,allModules,moduleKeys,moduleLabels,riseCompany,type Company} from '../lib/platform-model';
import type {CompanyTemplate} from '../lib/company-templates';
import {defaultTrainingConfig,generateTrainingPlan,type TrainingData,type TrainingPlan} from './training-model';
import {monthDates,sessionsForDate} from './training-calendar-model';
import Training from './training';
export function ManagementDialog({title,children,onClose,className=''}:{title:string;children:ReactNode;onClose:()=>void;className?:string}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal()},[]);
 return <dialog ref={dialog} className={'management-dialog '+className} aria-label={title} onCancel={e=>{e.preventDefault();onClose()}}><header><h2>{title}</h2><button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={22}/></button></header>{children}</dialog>;
}
export function BrandFields({value,onChange}:{value:Company['brand'];onChange:(v:Company['brand'])=>void}){
 const [error,setError]=useState('');
 async function upload(file:File){
  try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5000000)throw Error('Elige PNG, JPG o WebP de hasta 5 MB.');
   const bitmap=await createImageBitmap(file);try{
    if(bitmap.width*bitmap.height>25000000)throw Error('Reduce la resolución del logo.');
    const scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('No se pudo preparar el logo.');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const logo=canvas.toDataURL('image/webp',.85);if(logo.length>180000)throw Error('El logo ocupa demasiado. Prueba con una imagen más sencilla.');onChange({...value,logo});setError('');
   }finally{bitmap.close()}
  }catch(e){setError((e as Error).message)}
 }
 return <div className="brand-editor"><div className="management-form-grid"><label className="field">Color principal<input type="color" value={value.primary} onChange={e=>onChange({...value,primary:e.target.value})}/></label><label className="field">Color de acento<input type="color" value={value.accent} onChange={e=>onChange({...value,accent:e.target.value})}/></label></div>
 <label className="field">Lema o presentación<input value={value.tagline} maxLength={160} onChange={e=>onChange({...value,tagline:e.target.value})}/></label>
 <label className="management-upload"><ImagePlus size={22}/><span>Subir logo · PNG, JPG o WebP</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value=''}}/></label>
 <label className="field">O usar una dirección HTTPS del logo<input type="url" value={value.logo.startsWith('data:')?'':value.logo} placeholder="https://..." onChange={e=>onChange({...value,logo:e.target.value})}/></label>
 {value.logo&&<div className="raw-actions"><img className="company-preview-logo" src={value.logo} alt="Vista previa del logo"/><button className="text-button" type="button" onClick={()=>onChange({...value,logo:''})}>Quitar logo</button></div>}
 {error&&<p role="alert">{error}</p>}</div>;
}
export function CompanyForm({initial,busy,onSave}:{initial?:Company;busy:boolean;onSave:(fields:ReturnType<typeof companyInput.parse>)=>Promise<void>}){
 const [value,setValue]=useState(()=>{const c=initial??{...riseCompany,name:'',slug:'',kind:'boxing',self_signup:false,max_users:100,max_staff:5,brand:{logo:'',primary:'#3158d4',accent:'#d3a44a',tagline:'Tu progreso, acompañado.'}};const {id,created_at,updated_at,...fields}=c;return fields});
 const [manual,setManual]=useState(!!initial),[error,setError]=useState('');
 return <form onSubmit={async e=>{e.preventDefault();try{await onSave(companyInput.parse(value))}catch(e){setError((e as Error).message)}}}><fieldset disabled={busy}>
 <div className="management-form-grid"><label className="field">Nombre de la empresa<input required maxLength={100} value={value.name} onChange={e=>{const name=e.target.value;setValue({...value,name,...(!manual?{slug:name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)}:{})})}}/></label>
 <label className="field">Identificador de acceso<input required disabled={initial?.slug==='rise'} pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={2} maxLength={60} value={value.slug} onChange={e=>{setManual(true);setValue({...value,slug:e.target.value})}}/><small>Su app estará en /o/{value.slug||'su-empresa'}</small></label>
 <label className="field">Tipo de empresa<select value={value.kind} onChange={e=>setValue({...value,kind:e.target.value as Company['kind']})}><option value="boxing">Gimnasio de boxeo</option><option value="gym">Musculación y fitness</option><option value="academy">Academia de preparación</option><option value="mixed">Centro multidisciplinar</option></select></label>
 <label className="field">Acceso<select value={value.status} onChange={e=>setValue({...value,status:e.target.value as Company['status']})}><option value="active">Activo</option><option value="suspended">Suspendido</option></select></label>
 <label className="field">Plazas de usuarios<input required type="number" min={1} max={100000} value={value.max_users} onChange={e=>setValue({...value,max_users:Number(e.target.value)})}/></label>
 <label className="field">Plazas del equipo<input required type="number" min={1} max={1000} value={value.max_staff} onChange={e=>setValue({...value,max_staff:Number(e.target.value)})}/></label></div>
 <h3>Marca de la empresa</h3><BrandFields value={value.brand} onChange={brand=>setValue({...value,brand})}/>
 <h3>Módulos contratados</h3><div className="module-picks">{moduleKeys.map(key=><label className="module-pick" key={key}><input type="checkbox" checked={value.modules[key]} onChange={e=>{
  const modules={...value.modules,[key]:e.target.checked};
  if(key==='training'&&!e.target.checked){modules.boxing=false;modules.competition=false}if(key==='nutrition'&&!e.target.checked)modules.competition=false;
  if(key==='boxing'&&e.target.checked)modules.training=true;if(key==='competition'&&e.target.checked){modules.training=true;modules.nutrition=true}
  setValue({...value,modules});
 }}/><strong>{moduleLabels[key]}</strong></label>)}</div>
 {initial?.slug==='rise'&&<label className="checkbox"><input type="checkbox" checked={value.self_signup} onChange={e=>setValue({...value,self_signup:e.target.checked})}/> Permitir incorporaciones de nuevas cuentas verificadas a Rise</label>}
 <p className="muted">Las academias pueden usar entrenamiento, hábitos y seguimiento. Los módulos específicos de estudio u oposiciones se podrán incorporar después.</p>
 {error&&<p className="notice error" role="alert">{error}</p>}<button className="button orange" disabled={busy}>{busy?'Guardando…':initial?'Guardar empresa y módulos':'Crear empresa'}</button></fieldset></form>;
}
export function TemplateForm({organizationId,today,busy,onSave}:{organizationId:string;today:string;busy:boolean;onSave:(v:Omit<CompanyTemplate,'id'|'created_at'>)=>Promise<void>}){
 const [title,setTitle]=useState(''),[kind,setKind]=useState<'nutrition'|'training'>('training'),[count,setCount]=useState(3),[schedule,setSchedule]=useState<'regular'|'early'|'late'|'variable'>('regular');
 const [data,setData]=useState<TrainingData>({plans:[],logs:[]}),[error,setError]=useState('');
 async function save(){
  try{if(!title.trim())throw Error('Pon un nombre a la plantilla.');
   if(kind==='nutrition')await onSave({organization_id:organizationId,title,kind,payload:{mealCount:count,schedule}});
   else{const plan=data.plans.at(-1);if(!plan)throw Error('Diseña y guarda primero la rutina de la plantilla.');const sessions=Array.from({length:7},(_,day)=>{const date=monthDates(plan.month??today.slice(0,7)).find(date=>(new Date(date+'T12:00:00Z').getUTCDay()+6)%7===day)!;return sessionsForDate(plan,date)});
    const normalized={...plan,overrides:undefined,clubOverrides:undefined,month:undefined,sessions:sessions.map((list,day)=>list.find(s=>s.kind==='lift')??list[0]??{...plan.sessions[day],kind:'rest' as const,minutes:0,exercises:[]}),extraSessions:sessions.flatMap(list=>list.some(s=>s.kind==='lift')?list.filter(s=>s.kind==='conditioning'):[])};
    await onSave({organization_id:organizationId,title,kind,payload:normalized});
   }
  }catch(e){setError((e as Error).message)}
 }
 return <section><div className="management-form-grid"><label className="field">Nombre de la plantilla<input maxLength={100} required value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="field">Tipo<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="training">Rutina semanal</option><option value="nutrition">Reparto de comidas y horarios</option></select></label></div>
 {kind==='nutrition'?<><p>Las cantidades se calcularán con el perfil del cliente y se conservarán sus alergias, restricciones y comidas registradas.</p><div className="management-form-grid"><label className="field">Comidas al día<select value={count} onChange={e=>setCount(Number(e.target.value))}>{[3,4,5,6].map(n=><option key={n} value={n}>{n} comidas</option>)}</select></label><label className="field">Horario<select value={schedule} onChange={e=>setSchedule(e.target.value as typeof schedule)}><option value="regular">Diurno habitual</option><option value="early">Empieza temprano</option><option value="late">Empieza tarde</option><option value="variable">Variable</option></select></label></div></>:<><p>Diseña la semana y guarda el mes de ejemplo. La plantilla recogerá el patrón de lunes a domingo; al aplicarla se utilizará el mes del cliente.</p><Training data={data} onChange={setData} today={today} disabled={busy} onToday={()=>{}}/></>}
 {error&&<p role="alert" className="notice error">{error}</p>}<button type="button" className="button orange" disabled={busy} onClick={()=>void save()}>Guardar plantilla de empresa</button></section>;
}
