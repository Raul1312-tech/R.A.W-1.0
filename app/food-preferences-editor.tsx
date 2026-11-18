'use client';

import {useState,useRef,useEffect} from 'react';
import SelectField from './select-field';
import {foodById,type Profile} from './model';
import {foodPreferenceIds,type FoodPreferences} from './preparation-preferences';
import {saveFoodPreferences} from './preparation-engine';

const defaultPrefs:FoodPreferences={foods:{},variety:'balanced',certification:'none'};
export function FoodPreferenceFields({value=defaultPrefs,onChange,disabled}:{value?:FoodPreferences;onChange:(value:FoodPreferences)=>void;disabled?:boolean}){
 return <fieldset disabled={disabled}><p>Marca los alimentos que compras de verdad. Tus habituales serán la base; los ocasionales entrarán de vez en cuando. Sin marcar significa que no es uno de tus básicos, no que esté prohibido.</p>
 {(['carbs','protein'] as const).map(group=><section className="food-staples-group" key={group}><h3>{group==='carbs'?'Mis hidratos de siempre':'Mis proteínas de siempre'}</h3><p>{group==='carbs'?'Por ejemplo: arroz, pasta, pan integral, patata y batata.':'Elige tus fuentes habituales para construir los platos.'}</p><div className="food-staples-list">
 {foodPreferenceIds[group].map(id=><div className="food-staple" key={id}><strong>{id==='sweetpotato'?'Batata o boniato':foodById(id).name}</strong><div role="group" aria-label={'Preferencia de '+foodById(id).name}>{([['usual','Habitual'],['like','Ocasional'],['avoid','Evitar']] as const).map(([kind,label])=><button type="button" key={kind} aria-pressed={value.foods[id]===kind} onClick={()=>{const foods={...value.foods};if(foods[id]===kind)delete foods[id];else foods[id]=kind;onChange({...value,foods})}}>{label}</button>)}</div></div>)}
 </div></section>)}
 <label className="checkbox"><input type="checkbox" checked={value.explore??false} onChange={e=>onChange({...value,explore:e.target.checked})}/> Quiero descubrir también alimentos fuera de mis habituales</label>
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
