'use client';
import SelectField from './select-field';
import {useState,useRef} from 'react';
import {Bookmark,Download,Pill,Check,X,ArrowRight} from 'lucide-react';
import {type Profile,type Plan,type Day,total,targets,dateKey,emptyDay} from './model';
import {freezeMonth,toggleSupplement,supplementsForDay} from './preparation-model';
import {supplementAdvice} from './supplement-advice';
import {dailySessions,planForDate,clubForDate,weekdayOf} from './training-calendar-model';
import {preparationSchema,type Supplement} from './preparation-schema';
const labels=['Desayuno','Almuerzo','Comida','Merienda','Cena','Recena'];
export function NutritionHabits({profile:p,plan,disabled,competitionActive=false,onChange,onShopping}:{profile:Profile;plan?:Plan;disabled:boolean;competitionActive?:boolean;onChange:(p:Profile)=>void;onShopping:()=>void}){
 const favoritesDialog=useRef<HTMLDialogElement>(null);
 const [month,setMonth]=useState(new Date().toISOString().slice(0,7)),[message,setMessage]=useState('');
 const fixed=p.preparation?.monthlyMenus?.find(m=>m.month===month);
 return <section className="card personal-nutrition">
 <div className="raw-meal-tools">
   <button type="button" className="button soft" onClick={()=>favoritesDialog.current?.showModal()}><Bookmark size={18}/> Comidas habituales <span className="saved-meals-count">{p.preparation?.favorites?.length??0}</span><ArrowRight size={17}/></button>
   <button type="button" className="button outline" disabled={!plan} onClick={onShopping}><Download size={17}/> Lista de compra</button>
 </div>
 <dialog ref={favoritesDialog} className="saved-meals-dialog" aria-labelledby="saved-meals-title" onClick={e=>{if(e.target===e.currentTarget)favoritesDialog.current?.close()}}><div className="saved-meals-dialog-content"><header><div><span className="eyebrow">TU RECETARIO</span><h2 id="saved-meals-title">Comidas guardadas</h2></div><button type="button" className="icon-button" aria-label="Cerrar comidas guardadas" onClick={()=>favoritesDialog.current?.close()}><X/></button></header><p>Activa «Repetir» para usar un plato en los próximos días sin registrar. Se conservan sus cantidades.</p>
 {(p.preparation?.favorites??[]).map(f=><div className="habit-row" key={f.id}><div><input aria-label={'Nombre de comida guardada '+labels[f.slot]} defaultValue={f.meal.name} maxLength={150} disabled={disabled} onBlur={e=>{const name=e.target.value.trim();if(name&&name!==f.meal.name)onChange({...p,preparation:{...p.preparation,favorites:p.preparation!.favorites!.map(x=>x.id===f.id?{...x,meal:{...x.meal,name}}:x)}})}}/><small>{labels[f.slot]} · {Math.round(total(f.meal.items).k)} kcal</small></div><label><input type="checkbox" disabled={disabled} checked={f.repeat} onChange={e=>onChange({...p,preparation:{...p.preparation,favorites:p.preparation!.favorites!.map(x=>({...x,repeat:x.id===f.id?e.target.checked:x.slot===f.slot&&e.target.checked?false:x.repeat}))}})}/> Repetir en {labels[f.slot].toLowerCase()}</label><button className="text-button" disabled={disabled} onClick={()=>onChange({...p,preparation:{...p.preparation,favorites:p.preparation!.favorites!.filter(x=>x.id!==f.id)}})}>Quitar</button></div>)}
 {!p.preparation?.favorites?.length&&<p>Todavía no hay platos guardados. En una comida, abre los ingredientes y pulsa «Guardar comida».</p>}
 </div></dialog>
 <details className="raw-disclosure"><summary>Fijar la dieta del mes y preparar la compra</summary><p>{competitionActive?'La preparación de competición ya organiza sus fechas y la compra sigue esas comidas. Puedes fijar otra semana habitual al terminar el evento.':'Repite la semana elegida durante el mes, con tus comidas habituales.'} El mes queda guardado: generar otra semana no lo cambia. Puedes volver a fijarlo cuando quieras; los registros diarios se conservan.</p><label className="field">Mes<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label><div className="button-row"><button className="button outline" disabled={disabled||!plan||competitionActive} onClick={()=>{try{onChange(freezeMonth(p,plan!,month));setMessage('Dieta fijada para '+month+'. Ya puedes descargar su compra.')}catch(e){setMessage((e as Error).message)}}}>{fixed?'Actualizar dieta fijada':'Fijar dieta del mes'}</button>{fixed&&<button className="text-button" disabled={disabled} onClick={()=>onChange({...p,preparation:{...p.preparation,monthlyMenus:p.preparation!.monthlyMenus!.filter(m=>m.month!==month)}})}>Dejar de usar este mes</button>}<button className="button orange" disabled={!plan} onClick={onShopping}><Download size={16}/> Lista de compra</button></div>{fixed&&<p>{fixed.days.length} días guardados · actualizado {new Date(fixed.created).toLocaleDateString('es-ES')}. Los alimentos frescos conviene comprarlos por semanas o congelarlos.</p>}</details>{message&&<p role="status">{message}</p>}
 <details className="raw-disclosure"><summary>Cómo se calcula mi dieta</summary><p>La app usa tu edad, altura, peso, actividad y objetivo para calcular una referencia de {Math.round(targets(p).k)} kcal. Tus situaciones adaptan el reparto y la actividad de cada fecha. Comer fuera se reserva en el plan y se afina con lo que registres.</p><p>No necesitas elegir calorías ni hacer cuentas. Son estimaciones que se revisan con tu evolución.</p></details><SupplementSettings profile={p} disabled={disabled} onChange={onChange}/>
 </section>;
}
function SupplementSettings({profile:p,disabled,onChange}:{profile:Profile;disabled:boolean;onChange:(p:Profile)=>void}){
 const [kind,setKind]=useState<'protein'|'creatine'>('protein'),[error,setError]=useState('');
 const day=p.days[dateKey()]??emptyDay(p);
 const example=(p.preparation?.supplements??[]).find(s=>s.kind===kind)??{id:'',kind,allergens:[]};
 return <details><summary><Pill size={18}/> Mis suplementos y horarios</summary><p>El batido cuenta como alimento cuando lo marcas. La creatina se registra aparte, sin sumar proteína. Si el batido ya está en una comida, no lo marques otra vez aquí.</p>
 {(p.preparation?.supplements??[]).map(s=><div className="habit-row" key={s.id}><div><b>{s.name}</b><small>{s.amount} {s.unit==='capsules'?'cápsulas':'g'} · {s.timing==='postworkout'?'Después de entrenar':s.timing==='breakfast'?'Desayuno':'Por la noche'}</small></div><button className="text-button" disabled={disabled} onClick={()=>onChange({...p,preparation:{...p.preparation,supplements:p.preparation!.supplements!.filter(x=>x.id!==s.id)}})}>Quitar del plan</button></div>)}
 <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const n=(k:string)=>Number(f.get(k));const s:Supplement={id:crypto.randomUUID(),kind,name:String(f.get('name')),timing:String(f.get('timing')) as Supplement['timing'],amount:n('amount'),unit:String(f.get('unit')) as Supplement['unit'],gramsPerUnit:n('gramsPerUnit'),k:kind==='protein'?n('k'):0,p:kind==='protein'?n('p'):0,c:kind==='protein'?n('c'):0,f:kind==='protein'?n('f'):0,allergens:String(f.get('allergens')).split(',').map(s=>s.trim()).filter(Boolean)};const next={...p.preparation,supplements:[...(p.preparation?.supplements??[]),s]};if(!preparationSchema.safeParse(next).success||s.amount*(s.unit==='capsules'?s.gramsPerUnit:1)>200){setError('Revisa cantidades y etiqueta; máximo 12 suplementos y 200 g por toma.');return}onChange({...p,preparation:next});setError('Suplemento guardado. Puedes marcarlo en Mi día.')}}>
 <div className="form-grid"><SelectField label="Tipo" value={kind} onValueChange={selection=>setKind(selection as typeof kind)}><option value="protein">Proteína en polvo</option><option value="creatine">Creatina monohidrato</option></SelectField><label className="field">Nombre del producto<input name="name" required maxLength={100} placeholder="Nombre de la etiqueta"/></label><SelectField label="Momento" name="timing"><option value="breakfast">Desayuno</option><option value="postworkout">Después de entrenar</option><option value="evening">Noche</option></SelectField><label className="field">Cantidad por toma<input name="amount" type="number" min="0.1" max="200" step="0.1" required/></label><SelectField label="Unidad" name="unit"><option value="g">Gramos</option><option value="capsules">Cápsulas / pastillas</option></SelectField><label className="field">Gramos por cápsula (si procede)<input name="gramsPerUnit" type="number" min="0.01" max="100" step="0.01" defaultValue={1}/></label>{kind==='protein'&&(['k','p','c','f'] as const).map((k,i)=><label className="field" key={k}>{['kcal','Proteína (g)','Hidratos (g)','Grasas (g)'][i]} por 100 g<input name={k} type="number" min={0} max={k==='k'?1000:100} step="0.1" required/></label>)}<label className="field">Alérgenos de la etiqueta, separados por comas<input name="allergens" placeholder="leche, soja" maxLength={200}/></label></div><button className="button outline" disabled={disabled}>Guardar suplemento</button>{error&&<p role="status">{error}</p>}</form>
 <p><strong>Mentor · {kind==='protein'?'proteína en polvo':'creatina'}.</strong> {supplementAdvice(p,dateKey(),day,example)}</p><p>Creatina: referencia general de mantenimiento de 3–5 g diarios en adultos, sin necesitar carga; los gramos no equivalen al número de pastillas. Comprueba la cantidad real en la etiqueta y revísala con tu profesional, especialmente cerca de un pesaje. No se programa una retirada automática.</p><a href="https://www.ausport.gov.au/ais/nutrition/supplements/group_a/performance-supplements2/creatine" target="_blank" rel="noreferrer">Referencia AIS · creatina ↗</a><p>Revisa la etiqueta y el control de sustancias prohibidas. Los horarios son recordatorios, no tomas obligatorias.</p>
 </details>;
}
export function MealSupplements({profile:p,date,day,slot,times,disabled,onChange,onProfile}:{profile:Profile;date:string;day:Day;slot:number;times:string[];disabled:boolean;onChange:(d:Day)=>void;onProfile:(p:Profile)=>void}){
 const [message,setMessage]=useState('');
 const feedback=p.preparation?.supplementFeedback?.[date]??{};
 const scheduled=supplementsForDay(p,day);
 const visible=[...scheduled,...(p.preparation?.supplements??[]).filter(s=>feedback[s.id]&&!scheduled.some(x=>x.id===s.id))];
 const data=p.workouts??{plans:[],logs:[]},club=clubForDate(planForDate(data,date),date);
 const clubTime=club?p.onboarding?.completed?.answers.boxing.club?.find(x=>x.day===weekdayOf(date)):undefined;
 const minute=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3));
 const after=clubTime?.time?times.findIndex(t=>minute(t)>=minute(clubTime.time!)+clubTime.minutes):-1;
 const training=!!club||dailySessions(data,date).length>0||day.minutes>0;
 const forSlot=visible.filter(s=>slot===(s.timing==='breakfast'?0:s.timing==='evening'?times.length-1:training?(after<0?times.length-1:after):0));
 if(!forSlot.length)return null;
 return <details className="raw-disclosure"><summary><Pill size={16}/> Suplementos de esta comida · {forSlot.length}</summary>
 {forSlot.map(s=>{
  const checked=day.items.some(i=>i.id==='supplement-'+s.id),status=feedback[s.id];
  const conflict=s.allergens.some(a=>p.allergens.includes(a));
  const advice=supplementAdvice(p,date,day,s);
  function mark(next:string){
   try{
    if(next==='taken'&&conflict)throw new Error('El producto contiene un alérgeno de tu perfil.');
    if(next==='taken'&&day.items.some(i=>i.id!=='supplement-'+s.id&&(i.food.name.trim().toLowerCase()===s.name.trim().toLowerCase()||s.kind==='protein'&&i.food.id==='whey')))throw new Error('Ya hay un producto equivalente en una comida registrada. Revisa el registro antes de duplicarlo.');
    let updated=next==='taken'&&!checked||checked&&(next==='skipped'||next==='')?toggleSupplement(day,s):day;
    if(next==='skipped'||next==='poor-tolerance'){
     const forecast={...updated.supplementForecast};delete forecast[s.id];updated={...updated,supplementForecast:forecast};
    }else if(updated.nutrition?.supplements.some(x=>x.id===s.id)){
     const portion=total([{food:{...s,unit:'por 100 g'},grams:s.amount*(s.unit==='capsules'?s.gramsPerUnit:1)}]);
     updated={...updated,supplementForecast:{...updated.supplementForecast,[s.id]:portion}};
    }
    const states={...feedback};
    if(next==='skipped'||next==='poor-tolerance')states[s.id]=next;else delete states[s.id];
    const rows=Object.fromEntries(Object.entries({...p.preparation?.supplementFeedback,[date]:states}).sort(([a],[b])=>a.localeCompare(b)).slice(-90));
    onProfile({...p,days:{...p.days,[date]:updated},preparation:{...p.preparation,supplementFeedback:rows}});
    setMessage('Registro actualizado.');
   }catch(e){setMessage((e as Error).message)}
  }
  return <div className="habit-row" key={s.id}><div><strong>{s.name}</strong><small>{s.amount} {s.unit==='capsules'?'cápsulas':'g'}{s.timing==='postworkout'&&training?' · después de entrenar':''}</small><p><strong>Mentor:</strong> {advice}</p></div>
   <SelectField label={'Estado de '+s.name} value={status??(checked?'taken':'')} disabled={disabled} onValueChange={mark}><option value="">Pendiente</option><option value="taken" disabled={conflict}>Tomado</option><option value="skipped">No tomado</option><option value="poor-tolerance">Me sentó mal</option></SelectField></div>;
 })}
 {message&&<p role="status">{message}</p>}</details>;
}
