'use client';
import {useEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import {X,Upload,ImagePlus} from 'lucide-react';
import {companyInput,moduleKeys,moduleLabels,riseCompany,type Company} from '../lib/platform-model';
import {normalizeTrainingTemplate,type CompanyTemplate} from '../lib/company-templates';
import {companyProducts,productModules} from '../lib/company-products';
import {defaultTrainingConfig,generateTrainingPlan,type TrainingData} from './training-model';
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
 const [value,setValue]=useState(()=>{const c=initial??{...riseCompany,name:'',slug:'',kind:'boxing',modules:productModules('boxing'),self_signup:false,max_users:100,max_staff:5,brand:{logo:'',primary:'#3158d4',accent:'#d3a44a',tagline:'Tu progreso, acompañado.'}};const {id,created_at,updated_at,...fields}=c;return fields});
 const [manual,setManual]=useState(!!initial),[error,setError]=useState('');
 return <form onSubmit={async e=>{e.preventDefault();try{await onSave(companyInput.parse(value))}catch(e){setError((e as Error).message)}}}><fieldset disabled={busy}>
 <div className="management-form-grid"><label className="field">Nombre de la empresa<input required maxLength={100} value={value.name} onChange={e=>{const name=e.target.value;setValue({...value,name,...(!manual?{slug:name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)}:{})})}}/></label>
 <label className="field">Identificador de acceso<input required disabled={initial?.slug==='rise'} pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={2} maxLength={60} value={value.slug} onChange={e=>{setManual(true);setValue({...value,slug:e.target.value})}}/><small>Su app estará en /o/{value.slug||'su-empresa'}</small></label>
 <label className="field">Actividad de la empresa<select value={value.kind} onChange={e=>{const kind=e.target.value as Company['kind'];setValue({...value,kind,...(!initial?{modules:productModules(kind)}:{})})}}>{Object.entries(companyProducts).map(([key,product])=><option key={key} value={key}>{product.name}</option>)}</select></label>
 <label className="field">Acceso<select value={value.status} onChange={e=>setValue({...value,status:e.target.value as Company['status']})}><option value="active">Activo</option><option value="suspended">Suspendido</option></select></label>
 <label className="field">Plazas de usuarios<input required type="number" min={1} max={100000} value={value.max_users} onChange={e=>setValue({...value,max_users:Number(e.target.value)})}/></label>
 <label className="field">Plazas del equipo<input required type="number" min={1} max={1000} value={value.max_staff} onChange={e=>setValue({...value,max_staff:Number(e.target.value)})}/></label></div>
 <section className="company-product-summary"><span className="eyebrow">CONFIGURACIÓN INICIAL</span><h3>{companyProducts[value.kind].name}</h3><p>{companyProducts[value.kind].summary}</p><div>{companyProducts[value.kind].available.map(item=><span className="management-badge" key={item}>{item}</span>)}</div><p className="product-pending">Próximos desarrollos: {companyProducts[value.kind].next.join(' · ')}.</p>{value.kind==='academy'&&<p>Orientado a preparación física y nutrición. Las pruebas y baremos específicos todavía no están incorporados.</p>}{initial&&<button type="button" className="button outline" onClick={()=>setValue({...value,modules:productModules(value.kind)})}>Aplicar módulos sugeridos</button>}</section>
 <h3>Marca de la empresa</h3><BrandFields value={value.brand} onChange={brand=>setValue({...value,brand})}/>
 <h3>Módulos contratados</h3><div className="module-picks">{moduleKeys.map(key=><label className="module-pick" key={key}><input type="checkbox" checked={value.modules[key]} onChange={e=>{
  const modules={...value.modules,[key]:e.target.checked};
  if(key==='training'&&!e.target.checked){modules.boxing=false;modules.competition=false}if(key==='nutrition'&&!e.target.checked)modules.competition=false;
  if(key==='boxing'&&e.target.checked)modules.training=true;if(key==='competition'&&e.target.checked){modules.training=true;modules.nutrition=true}
  setValue({...value,modules});
 }}/><strong>{moduleLabels[key]}</strong></label>)}</div>
 {initial?.slug==='rise'&&<label className="checkbox"><input type="checkbox" checked={value.self_signup} onChange={e=>setValue({...value,self_signup:e.target.checked})}/> Permitir incorporaciones de nuevas cuentas verificadas a Rise</label>}
 <p className="muted">Los módulos sugeridos son un punto de partida que puedes ajustar antes de guardar. Oposiciones se centra en preparación física, carrera, recuperación y nutrición; no incluye temario.</p>
 {error&&<p className="notice error" role="alert">{error}</p>}<button className="button orange" disabled={busy}>{busy?'Guardando…':initial?'Guardar empresa y módulos':'Crear empresa'}</button></fieldset></form>;
}
export function TemplateForm({organizationId,today,busy,onSave,companyKind='boxing',initial}:{organizationId:string;today:string;busy:boolean;companyKind?:Company['kind'];initial?:CompanyTemplate;onSave:(v:Omit<CompanyTemplate,'id'|'created_at'>)=>Promise<void>}){
 const [title,setTitle]=useState(initial?(initial.title.slice(0,90)+' · copia'):'');
 const [kind,setKind]=useState<'nutrition'|'training'>(initial?.kind??'training');
 const [count,setCount]=useState(initial?.kind==='nutrition'?initial.payload.mealCount:3),[schedule,setSchedule]=useState<'regular'|'early'|'late'|'variable'>(initial?.kind==='nutrition'?initial.payload.schedule:'regular');
 const [sport,setSport]=useState<'boxing'|'hypertrophy'>(initial?.kind==='training'?initial.payload.config.sport:companyKind==='boxing'?'boxing':'hypertrophy');
 const [data,setData]=useState<TrainingData>(()=>({plans:initial?.kind==='training'?[{...structuredClone(initial.payload),config:{...structuredClone(initial.payload.config),exerciseRotation:'fixed',competition:undefined},month:today.slice(0,7),overrides:undefined,clubOverrides:undefined}]:[],logs:[]}));
 const [weekDate,setWeekDate]=useState(today),[error,setError]=useState(''),[saving,setSaving]=useState(false),[unsaved,setUnsaved]=useState(false);
 function receive(next:TrainingData){setData(next);const month=next.plans.at(-1)?.month;if(month&&!weekDate.startsWith(month))setWeekDate(month+'-15');setError('')}
 function seed(blank:boolean){
  try{const config={...defaultTrainingConfig(),catalogVersion:2 as const,sport,...(sport==='boxing'?{days:[0,1,3,5],physicalDays:[0,3],runningDays:[1,5],technicalDays:[],sparringDays:[]}:{})};
   const plan={...generateTrainingPlan(blank?{...config,days:[],physicalDays:[],runningDays:[],conditioningDays:0}:config),month:today.slice(0,7)};
   setData({plans:[plan],logs:[]});setWeekDate(today);setError('');
  }catch(e){setError((e as Error).message)}
 }
 async function save(){
  if(saving||busy)return;setError('');
  try{if(!title.trim())throw Error('Pon un nombre a la plantilla.');if(initial&&initial.organization_id!==organizationId)throw Error('La plantilla pertenece a otra empresa.');
   const payload=kind==='nutrition'?{organization_id:organizationId,title,kind,payload:{mealCount:count,schedule}}:
    {organization_id:organizationId,title,kind,payload:normalizeTrainingTemplate(data.plans.at(-1),weekDate)};
   setSaving(true);await onSave(payload as Omit<CompanyTemplate,'id'|'created_at'>);
  }catch(e){setError((e as Error).message)}finally{setSaving(false)}
 }
 return <section className="company-template-editor"><p>{initial?'La copia se guardará como una plantilla nueva. La original y los planes de los alumnos se conservan.':'Crea una base propia para tu centro. Podrás revisar los ejercicios antes de adaptarla a un alumno.'}</p>
 <div className="management-form-grid"><label className="field">Nombre de la plantilla<input maxLength={100} required value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="field">Tipo<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="training">Rutina semanal</option><option value="nutrition">Reparto de comidas y horarios</option></select></label></div>
 {kind==='nutrition'?<><p>Las cantidades se calcularán con el perfil del cliente y se conservarán sus alergias, restricciones y comidas registradas.</p><div className="management-form-grid"><label className="field">Comidas al día<select value={count} onChange={e=>setCount(Number(e.target.value))}>{[3,4,5,6].map(n=><option key={n} value={n}>{n} comidas</option>)}</select></label><label className="field">Horario<select value={schedule} onChange={e=>setSchedule(e.target.value as typeof schedule)}><option value="regular">Diurno habitual</option><option value="early">Empieza temprano</option><option value="late">Empieza tarde</option><option value="variable">Variable</option></select></label></div></>:<>
 <label className="field">Modalidad de la rutina<select value={sport} disabled={data.plans.length>0} onChange={e=>setSport(e.target.value as typeof sport)}><option value="boxing">Físico y carrera para boxeo</option><option value="hypertrophy">Fuerza general y musculación</option></select></label>
 {!data.plans.length?<div className="template-start-options"><button type="button" className="button orange" disabled={busy} onClick={()=>seed(true)}>Diseñar mi semana desde cero</button><button type="button" className="button outline" disabled={busy} onClick={()=>seed(false)}>Empezar con una propuesta</button></div>:<>
 <label className="field">Semana de referencia<input type="date" value={weekDate} onChange={e=>setWeekDate(e.target.value)}/><small>Se guarda el patrón de lunes a domingo de esta semana. Los cambios de otras semanas no se incluyen.</small></label>
 <Training templateMode onUnsavedChange={setUnsaved} key={sport} initialMonth={data.plans.at(-1)?.month} data={data} onChange={receive} today={today} disabled={busy||saving} boxing={sport==='boxing'} onToday={()=>{}}/>
 </>}
 </>}
 {error&&<p role="alert" className="notice error">{error}</p>}{kind==='training'&&unsaved&&<p className="notice" role="status">Guarda o cancela la edición del día o de los ajustes antes de guardar la plantilla.</p>}<div className="template-save-footer"><p>Guardar una plantilla no modifica la rutina de ningún alumno.</p><button type="button" className="button orange" disabled={busy||saving||kind==='training'&&(!data.plans.length||unsaved)} onClick={()=>void save()}>Guardar plantilla de empresa</button></div></section>;
}
