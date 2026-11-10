'use client';

import {createContext,useContext,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,Check,Dumbbell,Flame,LoaderCircle,Save} from 'lucide-react';
import SelectField from './select-field';
import {choices,selectedEquipment,stepIssues,type OnboardingAnswers,type OnboardingDraft} from './onboarding-schema';
import {startOnboarding,prepareOnboarding,onboardingSportName} from './onboarding-model';
import {dateKey,foods,targets,type Profile} from './model';
import {dailySessions,planForDate,weekdayOf} from './training-calendar-model';
import {trainingDays} from './training-model';
import {exerciseCatalog} from './exercise-catalog';
import './profile-setup.css';

type Update=<K extends keyof OnboardingAnswers>(key:K,patch:Partial<OnboardingAnswers[K]>)=>void;
const nutritionTitles=['Tu punto de partida','Cómo comes ahora','Qué encaja en tu vida','Competición y pesaje'];
const boxingTitles=['Tu semana de boxeo','Tu punto de partida con el físico','Tu punto de partida con la carrera','Cómo encaja todo en tu semana'];
const strengthTitles=['Qué quieres entrenar','Cuándo y con qué puedes entrenar','Qué estás haciendo ahora','Recuperación y seguimiento'];
const weekdays=trainingDays.map((name,day)=>({name,day}));
const allergens=['gluten','leche','huevo','soja','cacahuete','frutos secos','pescado','marisco','sésamo','mostaza','apio','sulfitos','altramuces','moluscos'];
const countOptions=[3,4,5,6];
const durations=[20,30,45,60,75,90,120];
const clubDurations=[30,45,60,75,90,105,120,150,180];

const QuestionErrors=createContext<Record<string,string>>({});
const errorId=(field?:string)=>'onboarding-error-'+field?.replaceAll('.','-');
function useQuestion(field?:string){
  const errors=useContext(QuestionErrors),error=field?errors[field]:undefined;
  return {'aria-invalid':error?true:undefined,'aria-describedby':error?errorId(field):undefined};
}
function Question({field,children}:{field?:string;children:ReactNode}){
  const errors=useContext(QuestionErrors),error=field?errors[field]:undefined;
  return <div data-question={field} className={'onboarding-question'+(error?' onboarding-invalid':'')}>
    {children}{error&&<small className="onboarding-field-error" id={errorId(field)}>{error}</small>}
  </div>;
}
function Choice<K extends string>({field,label,options,value,onChange,hint}:{
  field?:string;label:string;options:Partial<Record<K,string>>;value?:K;onChange:(value:K|undefined)=>void;hint?:string;
}){
  const validation=useQuestion(field);
  return <Question field={field}><SelectField {...validation} label={label} value={value??''} hint={hint} onValueChange={value=>onChange(value?value as K:undefined)}>
    <option value="">Selecciona una opción</option>
    {(Object.entries(options) as [K,string][]).map(([key,text])=><option key={key} value={key}>{text}</option>)}
  </SelectField></Question>;
}
function NumericChoice({field,label,options,value,onChange,unit=''}:{
  field?:string;label:string;options:number[];value?:number;onChange:(value:number|undefined)=>void;unit?:string;
}){
  const validation=useQuestion(field);
  return <Question field={field}><SelectField {...validation} label={label} value={value??''} onValueChange={value=>onChange(value===''?undefined:Number(value))}>
    <option value="">Selecciona una opción</option>
    {options.map(value=><option key={value} value={value}>{value}{unit&&' '+unit}</option>)}
  </SelectField></Question>;
}
function NumberInput({field,label,value,onChange,min,max,step=1}:{
  field?:string;label:string;value?:number;onChange:(value:number|undefined)=>void;min:number;max:number;step?:number;
}){
  const validation=useQuestion(field);
  return <Question field={field}><label className="field"><span>{label}</span><input {...validation} type="number" inputMode={step===1?'numeric':'decimal'}
    min={min} max={max} step={step} defaultValue={value??''} onChange={e=>{
      const input=e.currentTarget;
      onChange(input.value&&input.validity.valid?input.valueAsNumber:undefined);
    }}/></label></Question>;
}
function DateInput({field,label,type,value,onChange}:{field?:string;label:string;type:'date'|'time';value?:string;onChange:(value?:string)=>void}){
  const validation=useQuestion(field);
  return <Question field={field}><label className="field"><span>{label}</span><input {...validation} type={type} value={value??''} onChange={e=>{
    const input=e.currentTarget;
    onChange(input.value&&input.validity.valid?input.value:undefined);
  }}/></label></Question>;
}
function Multi<K extends string>({field,label,hint,options,values=[],onChange,max=40}:{
  field?:string;label:string;hint?:string;options:Record<K,string>;values?:K[];onChange:(values:K[])=>void;max?:number;
}){
  const validation=useQuestion(field);
  return <Question field={field}><fieldset {...validation} className="onboarding-multi"><legend>{label}</legend>
    {hint&&<p className="muted">{hint}</p>}<div className="onboarding-options">
    {(Object.entries(options) as [K,string][]).map(([value,text])=><label className="checkbox" key={value}>
      <input type="checkbox" checked={values.includes(value)} disabled={values.length>=max&&!values.includes(value)}
        onChange={e=>onChange(e.target.checked?[...values,value]:values.filter(item=>item!==value))}/>{text}
    </label>)}
  </div></fieldset></Question>;
}
function WeekDays({field,label,selected,onToggle}:{field?:string;label:string;selected:number[];onToggle:(day:number)=>void}){
  const validation=useQuestion(field);
  return <Question field={field}><fieldset {...validation} className="onboarding-multi"><legend>{label}</legend><div className="onboarding-days">
    {weekdays.map(({day,name})=><button type="button" key={day} aria-label={name} aria-pressed={selected.includes(day)} onClick={()=>onToggle(day)}>{name.slice(0,3)}</button>)}
  </div></fieldset></Question>;
}
function Equipment({a,update}:{a:OnboardingAnswers;update:Update}){
  return <Multi field="strength.equipment" label="¿Con qué material puedes entrenar?" hint="Marca todas las opciones que tienes disponibles."
    options={choices.equipment} values={selectedEquipment(a.strength.equipment)} onChange={equipment=>update('strength',{equipment})}/>;
}
const toggle=(values:number[],value:number)=>values.includes(value)?values.filter(day=>day!==value):[...values,value];

function Basics({a,update,onSport}:{a:OnboardingAnswers;update:Update;onSport:(sport:'boxing'|'strength')=>void}){
  const b=a.basics;
  const {competition,...generalGoals}=choices.goal;
  const sportValidation=useQuestion('basics.sport'),nameValidation=useQuestion('basics.name');
  return <>
    <Question field="basics.sport"><fieldset {...sportValidation} className="onboarding-multi"><legend>¿Qué deporte quieres preparar?</legend><div className="onboarding-sports">
      <button type="button" aria-pressed={b.sport==='strength'} onClick={()=>onSport('strength')}><Dumbbell size={22}/><strong>Musculación</strong><span>Fuerza y masa muscular</span></button>
      <button type="button" aria-pressed={b.sport==='boxing'} onClick={()=>onSport('boxing')}><Flame size={22}/><strong>Boxeo</strong><span>Físico y carrera para el ring</span></button>
    </div></fieldset></Question>
    {b.sport==='boxing'&&<p className="onboarding-goal"><strong>Rendir mejor en el ring y llegar al peso de competición.</strong><br/>Adaptaremos tu preparación a tu nivel, tu categoría y las fechas que indiques.</p>}
    <div className="form-grid">
      <Question field="basics.name"><label className="field"><span>Nombre del perfil</span><input {...nameValidation} autoComplete="given-name" maxLength={60} value={b.name??''} onChange={e=>update('basics',{name:e.target.value.trim()?e.target.value:undefined})}/></label></Question>
      <NumberInput field="basics.age" label="Edad en años" value={b.age} min={18} max={90} onChange={age=>update('basics',{age})}/>
      <Choice field="basics.sex" label="Sexo para la estimación de energía" options={{male:'Masculino',female:'Femenino'}} value={b.sex} onChange={sex=>update('basics',{sex})}/>
      <NumberInput field="basics.height" label="Altura en cm" value={b.height} min={120} max={230} step={.1} onChange={height=>update('basics',{height})}/>
      <NumberInput field="basics.weight" label="Peso actual o habitual en kg" value={b.weight} min={30} max={250} step={.1} onChange={weight=>update('basics',{weight})}/>
      <Choice field="basics.trend" label="¿Cómo ha cambiado tu peso en los últimos meses?" options={choices.trend} value={b.trend} onChange={trend=>update('basics',{trend})}/>
      <Choice field="basics.activity" label="¿Cómo es un día normal fuera del gimnasio?" options={choices.activity} value={b.activity} onChange={activity=>update('basics',{activity})}/>
      {b.sport==='strength'&&<>
      <Choice field="basics.goal" label="¿Qué quieres mejorar primero?" options={generalGoals} value={b.goal} onChange={goal=>update('basics',{goal,goalWeight:goal==='gain'?b.goalWeight:undefined})}/>
      {b.goal==='gain'&&<NumberInput field="basics.goalWeight" label="Peso objetivo en kg · opcional" value={b.goalWeight} min={30} max={250} step={.1} onChange={goalWeight=>update('basics',{goalWeight})}/>}
      <Choice field="basics.success" label="¿Qué te gustaría notar con el plan? · opcional" options={choices.success} value={b.success} onChange={success=>update('basics',{success})}/>
      </>}
    </div>
  </>;
}

function Nutrition({a,update}:{a:OnboardingAnswers;update:Update}){
  const n=a.nutrition;
  return <>
    <div className="form-grid">
      <Choice field="nutrition.schedule" label="¿Cómo son tus horarios?" options={choices.schedule} value={n.schedule} onChange={schedule=>update('nutrition',{schedule})}/>
      <NumericChoice field="nutrition.currentMeals" label="¿Cuántas veces comes ahora?" options={[1,2,3,4,5,6]} value={n.currentMeals} onChange={currentMeals=>update('nutrition',{currentMeals})}/>
      <NumericChoice field="nutrition.mealCount" label="¿Cuántas comidas quieres en el plan?" options={countOptions} value={n.mealCount} onChange={mealCount=>update('nutrition',{mealCount})}/>
      <Choice field="nutrition.difficultMeal" label="¿Qué comida te cuesta más resolver?" options={choices.mealSlot} value={n.difficultMeal} onChange={difficultMeal=>update('nutrition',{difficultMeal,mealBarrier:difficultMeal==='none'?undefined:n.mealBarrier})}/>
      {n.difficultMeal&&n.difficultMeal!=='none'&&<Choice field="nutrition.mealBarrier" label="¿Qué te lo pone difícil?" options={choices.mealBarrier} value={n.mealBarrier} onChange={mealBarrier=>update('nutrition',{mealBarrier})}/>}
    </div>
    <details className="raw-disclosure"><summary>Tus horarios y un día reciente de entreno · opcional</summary>
      <div className="form-grid">
        <DateInput field="nutrition.wake" label="Hora a la que te levantas" type="time" value={n.wake} onChange={wake=>update('nutrition',{wake})}/>
        <DateInput field="nutrition.sleep" label="Hora a la que te acuestas" type="time" value={n.sleep} onChange={sleep=>update('nutrition',{sleep})}/>
        <DateInput field="nutrition.firstMeal" label="Hora habitual de la primera comida" type="time" value={n.firstMeal} onChange={firstMeal=>update('nutrition',{firstMeal})}/>
        <DateInput field="nutrition.lastMeal" label="Hora habitual de la última comida" type="time" value={n.lastMeal} onChange={lastMeal=>update('nutrition',{lastMeal})}/>
      </div>
      {(['breakfast','lunch','dinner'] as const).map(slot=>{
        const source=n.mealSources?.[slot];
        return <div className="onboarding-day-row" key={slot}><h3>{choices.mealSlot[slot]}</h3>
          <Choice label={'¿Cómo resolviste esta comida?'} options={choices.intake} value={source} onChange={value=>update('nutrition',{
            mealSources:{...n.mealSources,[slot]:value},
            ...(value==='skipped'||!value?{mealFoods:{...n.mealFoods,[slot]:undefined},mealSizes:{...n.mealSizes,[slot]:undefined}}:{})
          })}/>
          {source&&source!=='skipped'&&<>
            <Multi label="¿Qué comiste?" options={choices.foodGroup} values={n.mealFoods?.[slot]}
              onChange={value=>update('nutrition',{mealFoods:{...n.mealFoods,[slot]:value}})}/>
            <Choice label="¿Cómo era la cantidad?" options={choices.intakeSize} value={n.mealSizes?.[slot]}
              onChange={value=>update('nutrition',{mealSizes:{...n.mealSizes,[slot]:value}})}/>
          </>}
        </div>;
      })}
      <Multi field="nutrition.drinks" label="¿Qué bebiste ese día?" options={choices.drink} values={n.drinks} onChange={drinks=>update('nutrition',{drinks})}/>
    </details>
    {a.basics.sport==='boxing'&&<details className="raw-disclosure"><summary>Alrededor del entreno · opcional</summary>
      <WorkoutFood a={a} update={update}/>
    </details>}
  </>;
}

function WorkoutFood({a,update}:{a:OnboardingAnswers;update:Update}){
  const n=a.nutrition;
  return <>
      <div className="form-grid">
        <Choice field="nutrition.aroundTraining" label="¿Qué sueles tomar cerca del entreno?" options={choices.aroundTraining} value={n.aroundTraining} onChange={aroundTraining=>update('nutrition',{aroundTraining})}/>
        <Choice field="nutrition.tolerance" label="¿Cómo te sienta al entrenar?" options={choices.tolerance} value={n.tolerance} onChange={tolerance=>update('nutrition',{tolerance})}/>
      </div>
      <Multi field="nutrition.supplements" label="¿Qué tomas habitualmente?" options={choices.supplement} values={n.supplements} onChange={supplements=>update('nutrition',{supplements})}/>
  </>;
}

function Food({a,update}:{a:OnboardingAnswers;update:Update}){
  const f=a.food;
  const restrictionsValidation=useQuestion('food.reviewedRestrictions');
  const allergenOptions=Object.fromEntries([...new Set([...allergens,...(f.allergies??[]),...(f.intolerances??[])])].map(value=>[value,value]));
  const [foodQuery,setFoodQuery]=useState('');
  const foodOptions=Object.fromEntries(foods.filter(food=>!foodQuery||food.name.toLowerCase().includes(foodQuery.toLowerCase()))
    .map(food=>[food.id,food.name]));
  return <>
    <details className="raw-disclosure"><summary>Alergias e intolerancias{(f.allergies?.length??0)+(f.intolerances?.length??0)>0?' · '+((f.allergies?.length??0)+(f.intolerances?.length??0))+' marcadas':''}</summary>
      <Multi field="food.allergies" label="Alergias alimentarias" options={allergenOptions} values={f.allergies} max={20} onChange={allergies=>update('food',{allergies})}/>
      <Multi field="food.intolerances" label="Intolerancias alimentarias" options={allergenOptions} values={f.intolerances} max={20} onChange={intolerances=>update('food',{intolerances})}/>
    </details>
    <details className="raw-disclosure"><summary>Alimentos que quieres evitar o repetir</summary>
      <label className="field"><span>Buscar en el catálogo</span><input type="search" value={foodQuery} onChange={e=>setFoodQuery(e.target.value)}/></label>
      <Multi field="food.excluded" label="Evitar en mi menú" options={foodOptions} values={f.excluded} onChange={excluded=>update('food',{excluded,preferred:f.preferred?.filter(id=>!excluded.includes(id))??[]})}/>
      <Multi label="Me gusta repetir" options={Object.fromEntries(Object.entries(foodOptions).filter(([id])=>!f.excluded?.includes(id)))} values={f.preferred} onChange={preferred=>update('food',{preferred})}/>
    </details>
    <Question field="food.reviewedRestrictions"><label className="checkbox onboarding-confirm"><input {...restrictionsValidation} type="checkbox" checked={f.reviewedRestrictions??false}
      onChange={e=>update('food',{reviewedRestrictions:e.target.checked||undefined,allergies:f.allergies??[],intolerances:f.intolerances??[],excluded:f.excluded??[],preferred:f.preferred??[]})}/>
      He revisado mis alergias, intolerancias y exclusiones.</label></Question>
    <div className="form-grid">
      <Choice field="food.cook" label="¿Cuánto tiempo tienes para cocinar?" options={choices.cook} value={f.cook} onChange={cook=>update('food',{cook})}/>
      <Choice field="food.access" label="¿Dónde comes habitualmente?" options={choices.access} value={f.access} onChange={access=>update('food',{access})}/>
      <Choice field="food.menuStyle" label="¿Qué tipo de menú te encaja?" options={choices.menuStyle} value={f.menuStyle} onChange={menuStyle=>update('food',{menuStyle})}/>
      <NumberInput field="food.budget" label="Presupuesto semanal en euros · opcional" value={f.budget} min={1} max={1000} step={.01} onChange={budget=>update('food',{budget})}/>
      <Choice field="food.health" label="Indicaciones de salud para la alimentación · opcional" options={choices.foodReview} value={f.health} onChange={health=>update('food',{health})}/>
    </div>
  </>;
}

function Competition({a,update}:{a:OnboardingAnswers;update:Update}){
  const c=a.competition;
  const timeZone=c.timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <>
    <Choice field="competition.status" label="¿Tienes un combate previsto?" options={choices.competition} value={c.status} onChange={status=>update('competition',{
      status,timeZone,...(status==='none'?{categoryStatus:undefined,category:undefined,weighDate:undefined,weighTime:undefined,
        fightDate:undefined,fightTime:undefined,history:undefined,support:undefined}:{})})}/>
    {c.status&&c.status!=='none'&&<>
      <div className="form-grid">
        <Choice field="competition.categoryStatus" label="¿Está acordada tu categoría?" options={choices.categoryStatus} value={c.categoryStatus} onChange={categoryStatus=>update('competition',{categoryStatus,category:categoryStatus==='pending'?undefined:c.category})}/>
        {c.categoryStatus&&c.categoryStatus!=='pending'&&<NumberInput field="competition.category" label="Peso de la categoría en kg" value={c.category} min={30} max={250} step={.1} onChange={category=>update('competition',{category})}/>}
        <DateInput field="competition.weighDate" label="Fecha del pesaje · opcional" type="date" value={c.weighDate} onChange={weighDate=>update('competition',{weighDate,timeZone})}/>
        <DateInput field="competition.weighTime" label="Hora del pesaje · opcional" type="time" value={c.weighTime} onChange={weighTime=>update('competition',{weighTime,timeZone})}/>
        <DateInput field="competition.fightDate" label="Fecha del combate · opcional" type="date" value={c.fightDate} onChange={fightDate=>update('competition',{fightDate,timeZone})}/>
        <DateInput field="competition.fightTime" label="Hora del combate · opcional" type="time" value={c.fightTime} onChange={fightTime=>update('competition',{fightTime,timeZone})}/>
        <Choice field="competition.history" label="¿Cómo te fue en pesajes anteriores?" options={choices.weighHistory} value={c.history} onChange={history=>update('competition',{history})}/>
        <Choice field="competition.support" label="¿Quién te acompaña en la preparación?" options={choices.support} value={c.support} onChange={support=>update('competition',{support})}/>
      </div>
      <p className="muted">Zona horaria de las fechas · {timeZone}</p>
    </>}
  </>;
}

function BoxingWeek({a,update}:{a:OnboardingAnswers;update:Update}){
  const b=a.boxing,club=b.club??[];
  return <>
    <Choice field="boxing.experience" label="¿Cuánto llevas boxeando?" options={choices.boxingExperience} value={b.experience} onChange={experience=>update('boxing',{experience})}/>
    <WeekDays field="boxing.club" label="¿Qué días vas al club?" selected={club.map(slot=>slot.day)} onToggle={day=>update('boxing',{
      club:club.some(slot=>slot.day===day)?club.filter(slot=>slot.day!==day):[...club,{day,kind:'technique',minutes:60}],
      hardestDay:b.hardestDay===day?undefined:b.hardestDay})}/>
    {club.slice().sort((a,b)=>a.day-b.day).map(slot=>{
      function patch(change:Partial<typeof slot>){update('boxing',{club:club.map(item=>item.day===slot.day?{...item,...change}:item)})}
      return <div className="onboarding-day-row" key={slot.day}><h3>{trainingDays[slot.day]}</h3><div className="form-grid">
        <Choice label="Tipo de sesión" options={choices.clubActivity} value={slot.kind} onChange={kind=>{if(kind)patch({kind})}}/>
        <NumericChoice label="Duración" options={clubDurations} value={slot.minutes} unit="min" onChange={minutes=>{if(minutes)patch({minutes})}}/>
        <DateInput label="Hora · opcional" type="time" value={slot.time} onChange={time=>patch({time})}/>
      </div></div>;
    })}
    {!!club.length&&<SelectField label="¿Qué día te deja más cansado? · opcional" value={b.hardestDay??''} onValueChange={value=>update('boxing',{hardestDay:value===''?undefined:Number(value)})}>
      <option value="">Aún no lo sé</option>{club.map(slot=><option key={slot.day} value={slot.day}>{trainingDays[slot.day]}</option>)}
    </SelectField>}
    <Choice field="boxing.roundLimit" label="¿Qué te limita más en los últimos asaltos?" options={choices.roundLimit} value={b.roundLimit} onChange={roundLimit=>update('boxing',{roundLimit})}/>
  </>;
}

function Strength({a,update,boxing}:{a:OnboardingAnswers;update:Update;boxing:boolean}){
  const s=a.strength;
  return <>
    <div className="form-grid">
      {boxing&&<Choice field="strength.frequency" label="¿Cuántos días por semana has hecho físico en el último mes?" options={choices.strengthFrequency}
        value={s.frequency} onChange={frequency=>update('strength',{frequency,recent:frequency==='none'?undefined:s.recent})}/>}
      <Choice field="strength.practice" label="¿Qué tipo de físico has hecho hasta ahora?" options={choices.strengthPractice} value={s.practice} onChange={practice=>update('strength',{practice})}/>
      <Choice field="strength.confidence" label="¿Cuánta ayuda necesitas con los ejercicios?" options={choices.confidence} value={s.confidence} onChange={confidence=>update('strength',{confidence})}/>

    </div>
    {boxing&&<Equipment a={a} update={update}/>}
    {s.frequency&&s.frequency!=='none'&&<details className="raw-disclosure"><summary>Añadir un ejercicio reciente · opcional</summary>
      <SelectField label="Ejercicio" value={s.recent?.exerciseId??''} onValueChange={exerciseId=>update('strength',{recent:exerciseId?{exerciseId}:undefined})}>
        <option value="">Selecciona un ejercicio</option>{exerciseCatalog.filter(ex=>!ex.id.startsWith('run-')).map(ex=><option key={ex.id} value={ex.id}>{ex.name}</option>)}
      </SelectField>
      {s.recent&&<div className="form-grid" key={s.recent.exerciseId}>
        <NumberInput label="Peso utilizado en kg" min={0} max={500} step={.1} value={s.recent.kg} onChange={kg=>update('strength',{recent:{...s.recent!,kg}})}/>
        <NumberInput label="Repeticiones" min={1} max={100} value={s.recent.reps} onChange={reps=>update('strength',{recent:{...s.recent!,reps}})}/>
        <Choice label="¿Cómo te resultó la serie?" options={{easy:'Me quedaba margen',hard:'Me costó',stop:'Tuve que parar',pain:'Tuve molestias'}}
          value={s.recent.effort} onChange={effort=>update('strength',{recent:{...s.recent!,effort}})}/>
      </div>}
    </details>}
  </>;
}
function Running({a,update}:{a:OnboardingAnswers;update:Update}){
  const r=a.running;
  return <div className="form-grid">
    <Choice field="running.frequency" label="¿Cuántas veces has corrido en el último mes?" options={choices.runningFrequency} value={r.frequency}
      onChange={frequency=>update('running',{frequency,...(frequency==='none'?{mode:undefined,minutes:undefined,effort:undefined}:{})})}/>
    {r.frequency&&r.frequency!=='none'&&<>
      <Choice field="running.mode" label="¿Cómo fue tu última salida?" options={choices.runningMode} value={r.mode} onChange={mode=>update('running',{mode})}/>
      <NumberInput field="running.minutes" label="Duración de esa salida en minutos · opcional" value={r.minutes} min={1} max={180} onChange={minutes=>update('running',{minutes})}/>
      <Choice field="running.effort" label="¿Cómo te encontraste?" options={choices.runningEffort} value={r.effort} onChange={effort=>update('running',{effort})}/>
    </>}
    <Choice field="running.place" label="¿Dónde podrías hacer el trabajo aeróbico?" options={choices.runningPlace} value={r.place} onChange={place=>update('running',{place})}/>
    <label className="checkbox"><input type="checkbox" checked={r.preferBike??false} onChange={e=>update('running',{preferBike:e.target.checked})}/> Prefiero bici estática para revisarlo con mi entrenador.</label>
  </div>;
}
function Availability({a,update,boxing}:{a:OnboardingAnswers;update:Update;boxing:boolean}){
  const v=a.availability,slots=v.slots??[],rest=v.restDays??[],coach=v.coachPhysicalDays??[];
  function switchSlot(day:number){
    if(rest.includes(day)||boxing&&coach.includes(day))return;
    update('availability',{slots:slots.some(slot=>slot.day===day)?slots.filter(slot=>slot.day!==day):[...slots,{day,minutes:30,kind:'auto'}]});
  }
  return <>
    {boxing&&<Choice field="availability.mode" label="¿Cómo quieres repartir físico y carrera?" options={choices.planning} value={v.mode} onChange={mode=>update('availability',{mode})}/>}
    <WeekDays field="availability.restDays" label="¿Qué días quieres reservar para descansar?" selected={rest} onToggle={day=>update('availability',{restDays:toggle(rest,day),slots:slots.filter(slot=>slot.day!==day)})}/>
    {boxing&&<WeekDays label="Días en los que tu entrenador ya programa físico" selected={coach} onToggle={day=>update('availability',{coachPhysicalDays:toggle(coach,day),slots:slots.filter(slot=>slot.day!==day)})}/>}
    <WeekDays field="availability.slots" label={boxing?'Huecos para físico o carrera fuera del club':'¿Qué días puedes hacer musculación?'} selected={slots.map(slot=>slot.day)} onToggle={switchSlot}/>
    {(rest.length>0||boxing&&coach.length>0)&&<p className="muted">Los días reservados quedan fuera de los huecos. Puedes cambiar la selección arriba.</p>}
    {slots.slice().sort((a,b)=>a.day-b.day).map(slot=>{
      function patch(change:Partial<typeof slot>){update('availability',{slots:slots.map(item=>item.day===slot.day?{...item,...change}:item)})}
      return <div className="onboarding-day-row" key={slot.day}><h3>{trainingDays[slot.day]}</h3><div className="form-grid">
        <NumericChoice field={'availability.slots.'+slots.indexOf(slot)+'.minutes'} label="Tiempo disponible" options={durations} unit="min" value={slot.minutes} onChange={minutes=>{if(minutes)patch({minutes})}}/>
        {boxing&&v.mode==='manual'&&<Choice field={'availability.slots.'+slots.indexOf(slot)+'.kind'} label="¿Qué harás en este hueco?" options={{auto:'Pendiente de elegir',physical:'Físico',running:'Carrera'}} value={slot.kind} onChange={kind=>patch({kind:kind??'auto'})}/>}
      </div></div>;
    })}
    {!slots.length&&<p className="muted">Si aún no tienes huecos, puedes preparar el menú y añadir el entrenamiento más adelante.</p>}
  </>;
}
function Recovery({a,update}:{a:OnboardingAnswers;update:Update}){
  const r=a.recovery;
  return <div className="form-grid">
    <NumberInput field="recovery.sleepHours" label="Horas de sueño habituales · opcional" value={r.sleepHours} min={0} max={24} step={.5} onChange={sleepHours=>update('recovery',{sleepHours})}/>
    <Choice field="recovery.state" label="¿Cómo llegas al siguiente entreno?" options={choices.recovery} value={r.state} onChange={state=>update('recovery',{state})}/>
    <Choice field="recovery.limitation" label="¿Hay molestias o limitaciones que debamos tener en cuenta?" options={choices.limitation} value={r.limitation} onChange={limitation=>update('recovery',{limitation})}/>
    <Choice field="recovery.barrier" label="¿Qué hace más difícil mantener tu rutina? · opcional" options={choices.barrier} value={r.barrier} onChange={barrier=>update('recovery',{barrier})}/>
    <Choice field="recovery.tracking" label="¿Qué te resulta realista registrar?" options={choices.tracking} value={r.tracking} onChange={tracking=>update('recovery',{tracking})}/>
    <Choice field="recovery.review" label="¿Cuándo te gustaría revisar el plan? · opcional" options={choices.review} value={r.review} onChange={review=>update('recovery',{review})}/>
  </div>;
}

function Preview({profile,next,a}:{profile:Profile;next:Profile;a:OnboardingAnswers}){
  const today=dateKey();
  const existing=planForDate(profile.workouts??{plans:[],logs:[]},today);
  const training=next.workouts??{plans:[],logs:[]};
  const plan=planForDate(training,today);
  const menu=next.days[today]?.foodPlan?.meals??next.plans.at(-1)?.week?.[weekdayOf(today)]?.meals;
  const start=new Date(today+'T12:00:00Z');
  return <div className="onboarding-review">
    <h3>Alimentación · {next.mealCount} comidas al día</h3>
    <p>Referencia inicial aproximada de {Math.round(next.days[today]?.target.k??targets(next).k)} kcal al día.</p>
    {menu?.map((meal,i)=><p key={i}>{meal.name}</p>)}
    <h3>Entrenamiento · {onboardingSportName(a)}</h3>
    {existing?<p>Tu rutina activa se conserva. Tus respuestas nuevas se guardarán en el perfil.</p>:plan?
      <ul>{Array.from({length:7},(_,i)=>{
        const day=new Date(start.valueOf()+i*86400000).toISOString().slice(0,10);
        const club=a.boxing.club?.find(item=>item.day===weekdayOf(day));
        const planned=dailySessions(training,day).map(({session})=>session.title+' · '+session.minutes+' min');
        if(club)planned.unshift(choices.clubActivity[club.kind]+' · '+club.minutes+' min en el club');
        return <li key={day}><strong>{trainingDays[weekdayOf(day)]}</strong><span>{planned.join(' · ')||'Descanso'}</span></li>;
      })}</ul>:<p>{a.recovery.limitation!=='none'?'Guardamos tus respuestas para revisar el entrenamiento con tu profesional.':'Puedes añadir una rutina cuando tengas huecos.'}</p>}
    {a.basics.sport==='boxing'&&(a.running.effort==='pain'||a.running.preferBike||a.running.place==='bike')&&<p>Tu preferencia de trabajo aeróbico queda guardada para revisar una alternativa a la carrera.</p>}
  </div>;
}

export default function ProfileOnboarding({profile,disabled,onDraft,onComplete,onExit}:{
  profile:Profile;disabled:boolean;onDraft:(draft:OnboardingDraft)=>void;onComplete:(next:Profile)=>void;onExit?:()=>void;
}){
  const {step,answers:a}=startOnboarding(profile);
  const [error,setError]=useState('');
  const [showErrors,setShowErrors]=useState(false);
  const [preparing,setPreparing]=useState(false);
  const preparingRef=useRef(false);
  const form=useRef<HTMLFormElement>(null);
  const issues=showErrors?stepIssues(a,step):{};
  const [preview,setPreview]=useState<{source:Profile;next:Profile}|null>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  const boxing=a.basics.sport==='boxing';
  const title=step===3&&!boxing?'Comidas alrededor del entreno':step<4?nutritionTitles[step]:(boxing?boxingTitles:strengthTitles)[step-4];
  const reviewing=preview?.source===profile;
  function patch(answers:OnboardingAnswers,nextStep=step){
    setError('');setPreview(null);onDraft({step:nextStep,answers});
  }
  const update:Update=(key,change)=>patch({...a,[key]:{...a[key],...change}});
  function selectSport(sport:'boxing'|'strength'){
    if(sport===a.basics.sport)return;
    patch({...a,basics:{...a.basics,sport,goal:sport==='boxing'?'performance':undefined,goalWeight:undefined,success:undefined},
      competition:sport==='strength'?{status:'none'}:{},boxing:{club:[]},muscle:{},running:{},strength:{},
      availability:{slots:[],restDays:[],coachPhysicalDays:[],mode:'auto'}});
  }
  function go(nextStep:number){
    setShowErrors(false);patch(a,nextStep);
    requestAnimationFrame(()=>heading.current?.focus());
  }
  function focusIssue(field:string){
    requestAnimationFrame(()=>{
      const question=Array.from(form.current?.querySelectorAll<HTMLElement>('[data-question]')??[]).find(node=>node.dataset.question===field);
      if(!question){heading.current?.focus();return}
      let ancestor=question.parentElement;
      while(ancestor&&ancestor!==form.current){if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;ancestor=ancestor.parentElement}
      question.scrollIntoView({block:'center',behavior:'instant'});
      question.querySelector<HTMLElement>('input:not(:disabled),button:not(:disabled)')?.focus({preventScroll:true});
    });
  }
  async function advance(){
    if(preparingRef.current)return;
    const fields=Object.keys(stepIssues(a,step));
    if(fields.length){setShowErrors(true);focusIssue(fields[0]);return}
    if(step<7){go(step+1);return}
    for(let previous=0;previous<7;previous++){
      const missing=Object.keys(stepIssues(a,previous));
      if(missing.length){onDraft({answers:a,step:previous});setShowErrors(true);focusIssue(missing[0]);return}
    }
    preparingRef.current=true;setPreparing(true);setError('');
    try{
      // Paint the busy state before the synchronous menu and routine calculation.
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
      setPreview({source:profile,next:prepareOnboarding(profile,a,dateKey())});
      setShowErrors(false);requestAnimationFrame(()=>heading.current?.focus());
    }catch(e){setError(e instanceof Error?e.message:'No se pudo preparar tu plan. Vuelve a intentarlo.')}
    finally{preparingRef.current=false;setPreparing(false)}
  }

  let content:ReactNode;
  switch(step){
    case 0:content=<Basics a={a} update={update} onSport={selectSport}/>;break;
    case 1:content=<Nutrition a={a} update={update}/>;break;
    case 2:content=<Food a={a} update={update}/>;break;
    case 3:content=boxing?<Competition a={a} update={update}/>:<WorkoutFood a={a} update={update}/>;break;
    case 4:content=boxing?<BoxingWeek a={a} update={update}/>:<div className="form-grid">
      <Choice field="muscle.goal" label="¿Qué quieres conseguir con la musculación?" options={choices.strengthGoal} value={a.muscle.goal} onChange={goal=>update('muscle',{goal})}/>
      <Choice field="muscle.priority" label="¿Qué zona quieres priorizar?" options={choices.muscle} value={a.muscle.priority} onChange={priority=>update('muscle',{priority})}/>
      <Choice field="strength.frequency" label="¿Cuántos días por semana has entrenado en el último mes?" options={choices.strengthFrequency} value={a.strength.frequency} onChange={frequency=>update('strength',{frequency,recent:frequency==='none'?undefined:a.strength.recent})}/>
    </div>;break;
    case 5:content=boxing?<Strength a={a} update={update} boxing/>:<>
      <Equipment a={a} update={update}/>
      <Availability a={a} update={update} boxing={false}/>
    </>;break;
    case 6:content=boxing?<Running a={a} update={update}/>:<Strength a={a} update={update} boxing={false}/>;break;
    default:content=<>{boxing&&<Availability a={a} update={update} boxing/>}<Recovery a={a} update={update}/></>;
  }

  return <QuestionErrors.Provider value={issues}><form ref={form} aria-busy={preparing} className="card setup-form raw-onboarding" aria-label="Onboarding de R.A.W." noValidate onSubmit={event=>{
    event.preventDefault();
    if(reviewing){onComplete(preview.next);return}
    if(!preparingRef.current)void advance();
  }}>
    <div className="onboarding-progress">
      <p role="status">{step<4?'Nutrición':'Entrenamiento'} · {(step%4)+1} de 4</p>
      <div className="onboarding-progress-track" role="progressbar" aria-label="Progreso del onboarding" aria-valuemin={0} aria-valuemax={8} aria-valuenow={step+1}>
        {Array.from({length:8},(_,i)=><span key={i} className={i<=step?'filled':''}/>)}
      </div>
      <h2 ref={heading} tabIndex={-1}>{reviewing?'Revisa tu primer plan':title}</h2>
    </div>
    <fieldset disabled={disabled||preparing} key={step}>
      {preparing&&<div className="onboarding-loading" role="status"><LoaderCircle aria-hidden="true"/><strong>Preparando tu alimentación y tu rutina…</strong><span>Estamos organizando tus comidas y sesiones según tus respuestas.</span></div>}
      <div hidden={preparing}>{reviewing?<Preview profile={profile} next={preview.next} a={a}/>:content}</div>
      {!!Object.keys(issues).length&&<p className="notice error" role="alert">Revisa {Object.keys(issues).length===1?'la respuesta marcada':'las '+Object.keys(issues).length+' respuestas marcadas'} en rojo.</p>}
      {error&&<p className="notice error" role="alert">{error}</p>}
      <div className="raw-setup-actions">
        {reviewing?<button className="button outline" type="button" onClick={()=>setPreview(null)}><ArrowLeft size={16}/> Editar respuestas</button>:
          step>0?<button className="button outline" type="button" onClick={()=>go(step-1)}><ArrowLeft size={16}/> Atrás</button>:
          profile.confirmed&&onExit&&<button className="button outline" type="button" onClick={onExit}>Volver al perfil</button>}
        <button className="button orange" type="submit">{preparing?<><LoaderCircle className="onboarding-spinner" size={17}/> Preparando tu plan…</>:reviewing?<><Check size={17}/> Guardar mi plan</>:
          step===7?<><Save size={17}/> Revisar mi plan</>:<>Continuar <ArrowRight size={17}/></>}</button>
      </div>
      {onExit&&(!profile.confirmed||step>0)&&<button className="text-button" type="button" onClick={onExit}>Guardar y salir</button>}
    </fieldset>
  </form></QuestionErrors.Provider>;
}
