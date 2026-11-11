'use client';
import SelectField from './select-field';
import './profile-setup.css';
import {useRef,useState,type ReactNode} from 'react';
import {Check,Save,ArrowRight,UserRound,Utensils,Flag,ShieldCheck} from 'lucide-react';
import {ZodError} from 'zod';
import {foods,targets,dateKey,type Profile} from './model';
import {sportOptions,levelOptions,goalOptions,scheduleOptions,type Athlete} from './athlete-schema';
import {saveProfileSetup} from './profile-setup-model';

function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){
  return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;
}
function Section({number,title,description,icon,children,hidden=false}:{hidden?:boolean;number:string;title:string;description:string;icon:ReactNode;children:ReactNode}){
  return <section className="setup-section" hidden={hidden} data-setup-step={Number(number)===1?0:Number(number)===4?2:1}><div className="setup-section-heading"><span className="setup-number">{number}</span><div><h2 tabIndex={-1}>{icon}{title}</h2><p>{description}</p></div></div>{children}</section>;
}
export default function ProfileSetup({profile:p,disabled,demo,onSave}:{profile:Profile;disabled:boolean;demo:boolean;onSave:(p:Profile)=>void}){
  const [step,setStep]=useState(0);
  const form=useRef<HTMLFormElement>(null);
  const guided=!p.confirmed;
  function go(next:number){
    setStep(next);
    requestAnimationFrame(()=>form.current?.querySelector<HTMLElement>('[data-setup-step="'+next+'"] h2')?.focus());
  }
  function validateStep(next?:number){
    const invalid=Array.from(form.current?.elements??[]).find(element=>{
      if(!(element instanceof HTMLInputElement||element instanceof HTMLSelectElement||element instanceof HTMLTextAreaElement))return false;
      return (next===undefined||Number(element.closest<HTMLElement>('[data-setup-step]')?.dataset.setupStep)===next)&&!element.validity.valid;
    }) as HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|undefined;
    if(!invalid)return true;
    const section=invalid.closest<HTMLElement>('[data-setup-step]');
    if(guided&&section)go(Number(section.dataset.setupStep));
    requestAnimationFrame(()=>{
      const details=invalid.closest('details');
      if(details)details.open=true;
      invalid.reportValidity();
    });
    return false;
  }
  const initial=p.athlete,competition=p.preparation?.competition;
  const pending=initial?.competitionWeight.mode==='target'?initial.competitionWeight:undefined;
  const [sport,setSport]=useState<keyof typeof sportOptions|''>(initial?.sport??'');
  const [otherSport,setOtherSport]=useState(initial?.otherSport??'');
  const [level,setLevel]=useState<Athlete['level']>(initial?.level??'recreational');
  const [goal,setGoal]=useState<Athlete['goal']>(initial?.goal??(p.goal>p.weight?'gain':'performance'));
  const [mealCount,setMealCount]=useState(p.mealCount??5);
  const [schedule,setSchedule]=useState<Athlete['schedule']>(initial?.schedule??'variable');
  const [hasTarget,setHasTarget]=useState(!!competition||!!pending);
  const [weight,setWeight]=useState(String(p.weight));
  const [targetWeight,setTargetWeight]=useState(String(competition?.weight??pending?.weight??''));
  const [excluded,setExcluded]=useState(p.excluded),[search,setSearch]=useState('');
  const [error,setError]=useState(''),[message,setMessage]=useState('');
  const t=targets(p);
  const category=Number(targetWeight),currentWeight=Number(weight);
  const difference=targetWeight&&weight?currentWeight-category:null;
  function submit(form:HTMLFormElement){
    setError('');setMessage('');const f=new FormData(form),n=(key:string)=>Number(f.get(key));
    try{
      const next=saveProfileSetup(p,{
        name:String(f.get('name')),age:n('age'),sex:String(f.get('sex')),height:n('height'),weight:currentWeight,
        goal:goal==='gain'?n('goal'):currentWeight,activity:n('activity'),waterGoal:n('waterGoal'),
        health:String(f.get('health')),budget:String(f.get('budget')),allergens:f.getAll('allergens').map(String),excluded,
        mealCount,confirmed:f.has('confirmed'),athlete:{sport,otherSport:sport==='other'?otherSport:undefined,level,goal,schedule,
          competitionWeight:hasTarget?{mode:'target',weight:category,date:competition?new Date(competition.weighIn).toLocaleDateString('en-CA'):String(f.get('targetDate')??'')||undefined,event:String(f.get('event')??'').trim()||undefined}:{mode:'none'}},
      },dateKey());
      onSave(next);setMessage(`Perfil guardado. Tu menú se ha actualizado a ${mealCount} comidas al día. Se conservan los días pasados y las comidas ya registradas.`);
    }catch(e){
      if(e instanceof ZodError){const issue=e.issues[0];const labels:Record<string,string>={sport:'Deporte principal',otherSport:'Otro deporte',weight:'Peso',date:'Fecha del pesaje',goal:'Peso objetivo',name:'Nombre',age:'Edad',height:'Altura'};setError((labels[String(issue.path.at(-1))]??'Perfil')+': '+issue.message)}
      else setError(e instanceof Error?e.message:'No se pudo guardar el perfil.');
    }
  }
  return <div className={"setup-layout "+(guided?"raw-setup-guided":"")}>
    <form ref={form} className="card setup-form" aria-label="Perfil del deportista" noValidate onSubmit={e=>{e.preventDefault();if(guided&&step<2){if(validateStep(step))go(step+1)}else if(validateStep())submit(e.currentTarget)}}>
      {guided&&<p className="raw-setup-progress" role="status">Paso {step+1} de 3 · {['Sobre ti','Tu día','Restricciones y revisión'][step]}</p>}
      <fieldset disabled={disabled}>
        <Section number="01" hidden={guided&&step!==0} title="Sobre ti" description="Con estos datos estimamos lo que necesitas para tu objetivo." icon={<UserRound size={20}/>}>
          <div className="form-grid">
            <Field label="Nombre"><input name="name" autoComplete="given-name" maxLength={60} defaultValue={p.name} required/></Field>
            <SelectField label="Deporte principal" name="sport" value={sport} required onValueChange={selection=>setSport(selection as typeof sport)}><option value="" disabled>Elige tu deporte</option>{Object.entries(sportOptions).map(([value,label])=><option key={value} value={value}>{label}</option>)}</SelectField>
            {sport==='other'&&<Field label="¿Qué deporte practicas?"><input name="otherSport" value={otherSport} onChange={e=>setOtherSport(e.target.value)} maxLength={80} required/></Field>}
            <SelectField label="Tu experiencia deportiva" name="level" value={level} onValueChange={selection=>setLevel(selection as Athlete['level'])}>{Object.entries(levelOptions).map(([value,label])=><option key={value} value={value}>{label}</option>)}</SelectField>
            <Field label="Edad · años"><input name="age" type="number" min={18} max={90} step={1} defaultValue={p.age} required/></Field>
            <SelectField label="Sexo para la estimación de energía" hint="Se utiliza en el cálculo inicial de tus necesidades." name="sex" defaultValue={p.sex}><option value="male">Masculino</option><option value="female">Femenino</option></SelectField>
            <Field label="Altura · cm"><input name="height" type="number" min={120} max={230} step="0.1" defaultValue={p.height} required/></Field>
            <Field label="Peso actual · kg"><input name="weight" type="number" min={30} max={250} step="0.1" value={weight} onChange={e=>setWeight(e.target.value)} required/></Field>
            <SelectField label="¿Qué quieres conseguir?" name="goalType" value={goal} onValueChange={selection=>setGoal(selection as Athlete['goal'])}>{Object.entries(goalOptions).map(([value,label])=><option key={value} value={value}>{label}</option>)}</SelectField>
            {goal==='gain'&&<Field label="Peso objetivo habitual · kg" hint="Un objetivo a medio plazo, distinto de una categoría de competición."><input name="goal" type="number" min={Number(weight)||30} max={250} step="0.1" defaultValue={Math.max(p.goal,p.weight)} required/></Field>}
          </div>
        </Section>
        <Section number="02" hidden={guided&&step!==1} title="Tu día" description="Elige cuántas veces te gustaría comer y cómo es un día habitual." icon={<Utensils size={20}/>}>
          <div className="setup-meal-options" role="group" aria-label="Comidas al día">{[3,4,5,6].map(count=><button key={count} type="button" aria-pressed={mealCount===count} onClick={()=>setMealCount(count)}><b>{count}</b><span>comidas al día</span>{mealCount===count&&<Check size={16}/>}</button>)}</div>
          <div className="form-grid">
            <SelectField label="Tu horario habitual" name="schedule" value={schedule} onValueChange={selection=>setSchedule(selection as Athlete['schedule'])}>{Object.entries(scheduleOptions).map(([value,label])=><option key={value} value={value}>{label}</option>)}</SelectField>
            <SelectField label="Tu actividad habitual" hint="Cuenta tanto el movimiento diario como el entrenamiento; lo afinaremos con tu evolución." name="activity" defaultValue={p.activity}><option value={1.2}>Paso la mayor parte del día sentado</option><option value={1.4}>Me muevo algo durante el día</option><option value={1.6}>Tengo un día activo</option><option value={1.8}>Tengo un día muy activo</option><option value={2}>Trabajo físico y mucha actividad</option></SelectField>
          </div>
          <details className="raw-disclosure"><summary>Bebidas y presupuesto</summary><div className="form-grid">
            <input name="waterGoal" type="hidden" value={p.waterGoal}/><p>La referencia de bebidas se calcula según tu peso y actividad. Puedes revisarla en Registro diario → Hidratación.</p>
            <Field label="Presupuesto para comida (opcional)" hint="Indica cantidad y periodo, por ejemplo: 60 € por semana."><input name="budget" maxLength={200} placeholder="Tu presupuesto y cada cuánto compras" defaultValue={p.budget==='Pendiente.'?'':p.budget}/></Field>
          </div></details>
        </Section>
        <Section number="03" hidden={guided&&step!==1} title="¿Hay un peso para competir?" description="Separa tu objetivo habitual de la categoría o peso que tienes pendiente para una competición." icon={<Flag size={20}/>}>
          <div className="setup-choice" role="group" aria-label="Objetivo de peso para competición"><button type="button" aria-pressed={!hasTarget} onClick={()=>setHasTarget(false)}>No tengo un peso pendiente</button><button type="button" aria-pressed={hasTarget} onClick={()=>setHasTarget(true)}>Sí, tengo un peso de competición</button></div>
          {hasTarget&&<div className="setup-competition-fields">
            <div className="form-grid">
              <Field label="Peso o categoría de competición · kg"><input name="competitionWeight" type="number" min={30} max={250} step="0.1" value={targetWeight} onChange={e=>setTargetWeight(e.target.value)} required/></Field>
              <Field label="Fecha prevista del pesaje (opcional)" hint={competition?'Las fechas detalladas están guardadas en Entreno.':'Puedes añadirla más adelante si todavía no la sabes.'}><input name="targetDate" type="date" disabled={!!competition} defaultValue={competition?new Date(competition.weighIn).toLocaleDateString('en-CA'):pending?.date}/></Field>
              <Field label="Nombre de la competición (opcional)"><input name="event" maxLength={120} defaultValue={pending?.event} placeholder="Evento o campeonato"/></Field>
            </div>
            {difference!==null&&Number.isFinite(difference)&&category>=30&&category<=250&&<p className="setup-weight-context">Peso actual: <b>{weight} kg</b> · Peso de competición: <b>{targetWeight} kg</b> · Diferencia: <b>{difference.toLocaleString('es-ES',{maximumFractionDigits:1,signDisplay:'exceptZero'})} kg</b></p>}
            <p className="muted">Guardamos este objetivo para tu seguimiento. No activa un recorte automático de comida ni cambios en la hidratación. Las fechas del combate y la puesta a punto se completan en Entreno.</p>
          </div>}
          {!hasTarget&&competition&&<p className="notice">Al guardar se quitará la competición del perfil y de la planificación. Tus sesiones realizadas se conservan.</p>}
        </Section>
        <Section number="04" hidden={guided&&step!==2} title="Restricciones y revisión" description="Restricciones, alimentos que no quieres y observaciones que conviene tener presentes." icon={<ShieldCheck size={20}/>}>
          <div className="setup-allergens"><span className="eyebrow">Alergias o intolerancias</span><div className="check-grid">{[...new Set(['gluten','leche','huevo','soja','cacahuete','frutos secos',...p.allergens])].map(label=><label key={label} className="checkbox"><input type="checkbox" name="allergens" value={label} defaultChecked={p.allergens.includes(label)}/>{label}</label>)}</div></div>
          <details><summary>Alimentos que quieres excluir · {excluded.length} seleccionados</summary><Field label="Buscar un alimento"><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Por ejemplo, tofu"/></Field><div className="setup-food-list">{foods.filter(food=>food.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).map(food=><label key={food.id} className="checkbox"><input type="checkbox" checked={excluded.includes(food.id)} onChange={e=>setExcluded(e.target.checked?[...excluded,food.id]:excluded.filter(id=>id!==food.id))}/>{food.name}</label>)}</div></details>
          <Field label="Salud, medicación y observaciones (opcional)" hint="Este texto queda como contexto del perfil; las exclusiones del menú se eligen en los controles anteriores."><textarea name="health" maxLength={2000} defaultValue={p.health==='Pendiente de confirmar.'?'':p.health} placeholder="Lo que tu equipo debería saber sobre ti"/></Field>
        </Section>
        <div className="setup-save" hidden={guided&&step!==2} data-setup-step="2">
          {guided&&<p><b>Tu primer plan:</b> {mealCount} comidas al día. Calcularemos las cantidades a partir de tu perfil.</p>}
          <label className="checkbox"><input type="checkbox" name="confirmed" defaultChecked={p.confirmed} required/> He revisado mis datos y restricciones.</label>
          {!guided&&<p>Al guardar se actualizan las comidas pendientes. Tu historial conserva sus cantidades.</p>}
        </div>
        <div className="raw-setup-actions">
          {guided&&step>0&&<button className="button outline" type="button" onClick={()=>go(step-1)}>Atrás</button>}
          <button className="button orange" type="submit">{guided&&step<2?<>Continuar <ArrowRight size={17}/></>:<><Save size={17}/> {guided?'Crear mi plan':'Guardar perfil'}</>}</button>
        </div>
      </fieldset>
      {error&&<p className="notice error" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}
    </form>
    {!guided&&<aside className="setup-aside">
      <article className="card setup-preview"><span className="eyebrow">ASÍ QUEDA TU PERFIL</span><h2>Un plan que empieza por ti.</h2><dl><div><dt>Tu deporte</dt><dd>{sport==='other'?otherSport||'Por indicar':sport?sportOptions[sport]:'Elige tu deporte'}</dd></div><div><dt>Tu experiencia</dt><dd>{levelOptions[level]}</dd></div><div><dt>Tu objetivo</dt><dd>{goalOptions[goal]}</dd></div><div><dt>Tu alimentación</dt><dd>{mealCount} comidas al día</dd></div><div><dt>Tu horario</dt><dd>{scheduleOptions[schedule]}</dd></div><div><dt>Competición</dt><dd>{hasTarget?targetWeight?`${targetWeight} kg · objetivo pendiente`:'Indica el peso objetivo':'Sin peso de competición pendiente'}</dd></div></dl><p>La selección de comidas cambia el reparto del menú. La rutina se diseña en su propia sección.</p><span className="setup-flow">Perfil <ArrowRight size={14}/> Comidas <ArrowRight size={14}/> Entreno</span></article>
      <article className="card"><span className="eyebrow">TU REFERENCIA GUARDADA</span><h3>{Math.round(t.k).toLocaleString('es-ES')} kcal al día</h3><p>La estimación se revisa al guardar según tus datos y tu objetivo. Puedes revisar los valores con tu equipo en Comidas.</p><details><summary>Cómo se estima</summary><p>Se estima el gasto en reposo a partir de edad, sexo, altura y peso, y se tiene en cuenta tu actividad. Para ganar masa se añade una cantidad inicial moderada. Un objetivo energético acordado con tu equipo en Comidas tiene prioridad.</p></details></article>
      <article className="card"><h3>Tu información, con continuidad.</h3><p>{demo?'Esta prueba guarda el perfil solo en este navegador.':'El perfil se guarda con tu cuenta y se recupera al iniciar sesión en otro dispositivo.'} Cada deportista conserva sus menús y registros. Puedes exportar una copia desde Mi cuenta y mis datos.</p></article>
    </aside>}
  </div>;
}
