'use client';

import {useState,useRef,useEffect} from 'react';
import SelectField from './select-field';
import {foodById,type Profile} from './model';
import {foodPreferenceIds,type FoodPreferences} from './preparation-preferences';
import {saveFoodPreferences} from './preparation-engine';

const defaultPrefs:FoodPreferences={foods:{},variety:'balanced',certification:'none'};
export function FoodPreferenceFields({value=defaultPrefs,onChange,disabled}:{value?:FoodPreferences;onChange:(value:FoodPreferences)=>void;disabled?:boolean}){
 return <fieldset disabled={disabled}><p>El menú da prioridad a tus habituales y descarta lo que marques como «Evitar».</p>
 {(['carbs','protein'] as const).map(group=><details key={group} className="raw-disclosure"><summary>{group==='carbs'?'Mis hidratos':'Mis proteínas'}</summary><div className="form-grid">
 {foodPreferenceIds[group].map(id=><SelectField key={id} label={id==='sweetpotato'?'Batata o boniato':foodById(id).name} disabled={disabled} value={value.foods[id]??''} onValueChange={raw=>{
   const foods={...value.foods};if(raw)foods[id]=raw as 'usual'|'like'|'avoid';else delete foods[id];onChange({...value,foods});
 }}><option value="">Sin preferencia</option><option value="usual">Habitual</option><option value="like">También me gusta</option><option value="avoid">Evitar</option></SelectField>)}
 </div></details>)}
 <div className="form-grid"><SelectField label="Variedad del menú" disabled={disabled} value={value.variety} onValueChange={v=>onChange({...value,variety:v as FoodPreferences['variety']})}><option value="repeat">Prefiero repetir</option><option value="balanced">Algo de variedad</option><option value="varied">Me gusta cambiar</option></SelectField>
 <SelectField label="Corte habitual de carne" disabled={disabled} value={value.proteinStyle??'any'} onValueChange={v=>onChange({...value,proteinStyle:v as FoodPreferences['proteinStyle']})}><option value="any">Cualquiera</option><option value="fillet">Filete o pechuga</option><option value="minced">Carne picada magra</option></SelectField>
 <SelectField label="Certificación de alimentos" disabled={disabled} value={value.certification} onValueChange={v=>onChange({...value,certification:v as FoodPreferences['certification']})}><option value="none">Sin requisito de certificación</option><option value="halal">Necesito verificar certificación halal</option></SelectField></div></fieldset>;
}
export default function FoodPreferencesEditor({profile,disabled,onChange,expanded=false}:{profile:Profile;disabled:boolean;onChange:(p:Profile)=>void;expanded?:boolean}){
 const [value,setValue]=useState(profile.preparation?.foodPreferences??defaultPrefs),[message,setMessage]=useState('');
 return <details open={expanded||undefined} className="card raw-disclosure"><summary>Mis alimentos y preferencias</summary>
 <FoodPreferenceFields value={value} onChange={setValue} disabled={disabled}/>
 <button className="button outline" type="button" disabled={disabled} onClick={()=>{try{onChange(saveFoodPreferences(profile,value));setMessage('Preferencias guardadas y menú semanal actualizado.')}catch(e){setMessage((e as Error).message)}}}>Guardar preferencias y actualizar menú</button>
 {message&&<p role="status">{message}</p>}</details>;
}

export function FoodPreferencesButton({profile,disabled,onChange}:{profile:Profile;disabled:boolean;onChange:(p:Profile)=>void}){
 const [open,setOpen]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal()},[open]);
 return <><button type="button" className="text-button" disabled={disabled} onClick={()=>setOpen(true)}>Elegir mis equivalentes habituales</button>
 {open&&<dialog ref={dialog} className="raw-dialog" aria-label="Mis alimentos para equivalentes" onCancel={()=>setOpen(false)}>
 <h2>Mis equivalentes habituales</h2><p>Elige los hidratos y proteínas que más comes. Los habituales aparecen primero al sustituir ingredientes; los marcados como evitar se descartan.</p>
 <FoodPreferencesEditor profile={profile} disabled={disabled} expanded onChange={next=>{onChange(next);setOpen(false)}}/>
 <button type="button" className="button outline" onClick={()=>setOpen(false)}>Cerrar</button>
 </dialog>}</>;
}
