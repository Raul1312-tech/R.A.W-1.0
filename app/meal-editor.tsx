'use client';
import SelectField from './select-field';
import FoodPhoto from './food-photo';

import {useState} from 'react';
import {Plus,Trash2,ArrowLeftRight,Check} from 'lucide-react';
import dynamic from 'next/dynamic';
import {total,type Food,type Item} from './model';
import {MenuMacros} from './weekly-menu';
import {foodPortions} from './food-portions';

const FoodGrid=dynamic(()=>import('./food-grid'),{loading:()=><p role="status">Abriendo alimentos…</p>});
const portionSizes=[{label:'Pequeña',factor:.5},{label:'Habitual',factor:1},{label:'Grande',factor:1.5}];

export default function MealEditor({initial,savedFoods=[],disabled,onSave,onCancel,onUsePlanned,saveLabel='Añadir al registro'}:{
  initial:Item[];savedFoods?:Food[];disabled:boolean;onSave:(items:Item[])=>void;onCancel:()=>void;onUsePlanned?:()=>void;saveLabel?:string;
}){
  const [items,setItems]=useState(()=>structuredClone(initial));
  const [replacing,setReplacing]=useState<number|'add'|null>(initial.length?null:'add');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  function choose(food:Food){
    setItems(current=>replacing==='add'?[...current,{food,grams:foodPortions[food.id]?.[0]??100}]:current.map((it,i)=>i===replacing?{...it,food}:it));
    setNotice(food.name+' añadido al borrador. Puedes ajustar su cantidad y añadir más ingredientes.');
    setReplacing(null);
  }
  function amount(index:number,grams:number){
    setItems(current=>current.map((it,i)=>i===index?{...it,grams}:it));
  }
  const picker=replacing!==null&&<FoodGrid key={replacing} picker onPick={choose} savedFoods={savedFoods} disabled={disabled} onSave={()=>{}} onCancel={()=>setReplacing(null)}/>;
  return <div className="meal-ingredient-editor raw-ingredient-editor">
    <FoodPhoto disabled={disabled} beforeCamera={onUsePlanned&&<button type="button" className="text-button" disabled={disabled} onClick={onUsePlanned}>Partir del plato previsto</button>} onReady={(found,message)=>{setItems(found);setReplacing(null);setNotice('Estimación por foto · revisa alimentos, gramos y preparación antes de guardar. '+message)}}/>
    <h3>Ingredientes de tu comida · {items.length}</h3>
    {notice&&<p role="status">{notice}</p>}
    <p>Construye el plato completo y pulsa «Guardar comida completa» cuando esté listo.</p>
    {items.map((it,i)=>{
      const unit=it.food.unit.includes('ml')?'ml':'g',usual=foodPortions[it.food.id]?.[0]??100;
      return <section className="raw-ingredient" key={i}>
        <div><h3>{it.food.name}</h3><p>{it.grams} {unit} · {Math.round(it.food.k*it.grams/100)} kcal</p></div>
        <div className="raw-portions" role="group" aria-label={'Ración de '+it.food.name}>{portionSizes.map(({label,factor})=><button type="button" className="button outline" aria-pressed={it.grams===usual*factor} disabled={disabled} key={label} onClick={()=>amount(i,usual*factor)}>{label}</button>)}</div>
        <div className="raw-disclosure"><label className="field">Cantidad de {it.food.name} · {unit}<input type="number" inputMode="decimal" min={.1} max={3000} step={.1} value={it.grams||''} disabled={disabled} onChange={e=>amount(i,Number(e.target.value))}/></label><p>{it.food.unit}</p>
          {it.food.id.startsWith('off-')&&<SelectField label="La etiqueta indica valores por" value={unit} onValueChange={selection=>{
            const unit=selection;
            setItems(current=>current.map((row,j)=>j===i?{...row,food:{...row.food,unit:'por 100 '+unit+' según ficha; comprueba el envase'}}:row));
          }}><option value="g">100 g</option><option value="ml">100 ml</option></SelectField>}
        </div>
        <div className="raw-actions"><button type="button" className="text-button" disabled={disabled} onClick={()=>setReplacing(i)}><ArrowLeftRight size={16}/> Cambiar alimento</button><button type="button" className="icon-button" disabled={disabled} aria-label={'Quitar '+it.food.name} onClick={()=>{setItems(items.filter((_,j)=>i!==j));setReplacing(null)}}><Trash2 size={17}/></button></div>
        {replacing===i&&picker}
      </section>;
    })}
    {replacing==='add'?picker:<button type="button" className="button outline" disabled={disabled||items.length>=20} onClick={()=>setReplacing('add')}><Plus size={17}/> Añadir alimento</button>}
    {error&&<p role="alert" className="notice error">{error}</p>}
    <div className="raw-editor-footer">
      {items.length>0&&<div aria-live="polite"><MenuMacros m={total(items)}/></div>}
      <button type="button" className="button orange" disabled={disabled||!items.length||items.some(it=>!Number.isFinite(it.grams)||it.grams<.1||it.grams>3000)} onClick={()=>{
        try{onSave(items)}catch(e){setError(e instanceof Error?e.message:'Revisa la comida.')}
      }}><Check size={17}/>{saveLabel==='Guardar comida'?'Guardar comida completa':saveLabel}</button>
      <button type="button" className="text-button" onClick={onCancel}>Cancelar</button>
    </div>
  </div>;
}
