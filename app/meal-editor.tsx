'use client';
import {useState} from 'react';
import {Plus,Trash2,ArrowLeftRight,Check} from 'lucide-react';
import dynamic from 'next/dynamic';
import {total,type Food,type Item} from './model';
import {MenuMacros} from './weekly-menu';
const FoodGrid=dynamic(()=>import('./food-grid'),{loading:()=><p role="status">Abriendo alimentos…</p>});

export default function MealEditor({initial,savedFoods=[],disabled,onSave,onCancel,saveLabel='Añadir al registro'}:{initial:Item[];savedFoods?:Food[];disabled:boolean;onSave:(items:Item[])=>void;onCancel:()=>void;saveLabel?:string}){
  const [items,setItems]=useState(()=>structuredClone(initial)),[replacing,setReplacing]=useState<number|'add'|null>(null),[error,setError]=useState('');
  function choose(food:Food){setItems(current=>replacing==='add'?[...current,{food,grams:100}]:current.map((it,i)=>i===replacing?{...it,food}:it));setReplacing(null)}
  return <div className="meal-ingredient-editor">
    <p className="muted">Cambia un alimento o su cantidad. Al registrar, se revisan las comidas pendientes de este día.</p>
    {items.map((it,i)=><div className="editable-ingredient" key={i}>
      <div><b>{it.food.name}</b><small>{it.food.unit} · {Math.round(it.food.k*it.grams/100)||0} kcal</small></div>
      <label className="ingredient-grams"><input aria-label={'Cantidad de '+it.food.name} type="number" min={.1} max={3000} step={.1} value={Number.isFinite(it.grams)&&it.grams?it.grams:''} disabled={disabled} onChange={e=>setItems(items.map((x,j)=>i===j?{...x,grams:Number(e.target.value)}:x))}/><span>{it.food.unit.includes('ml')?'ml':'g'}</span></label>
      <div className="ingredient-actions"><button type="button" className="text-button" disabled={disabled} aria-label={'Cambiar '+it.food.name} onClick={()=>setReplacing(i)}><ArrowLeftRight size={15}/> Cambiar alimento</button><button type="button" className="icon-button" disabled={disabled} aria-label={'Quitar '+it.food.name} onClick={()=>{setItems(items.filter((_,j)=>i!==j));setReplacing(null)}}><Trash2 size={16}/></button></div>
      {replacing===i&&<div className="ingredient-picker"><h4>Sustituir {it.food.name}</h4><FoodGrid picker onPick={choose} savedFoods={savedFoods} disabled={disabled} onSave={()=>{}} onCancel={()=>setReplacing(null)}/></div>}
    </div>)}
    <button type="button" className="button outline" disabled={disabled||items.length>=20} onClick={()=>setReplacing('add')}><Plus size={16}/> Añadir ingrediente</button>
    {replacing==='add'&&<div className="ingredient-picker"><FoodGrid picker onPick={choose} savedFoods={savedFoods} disabled={disabled} onSave={()=>{}} onCancel={()=>setReplacing(null)}/></div>}
    <div className="meal-editor-total" aria-live="polite"><span className="eyebrow">TOTAL DE TU COMIDA</span><MenuMacros m={total(items)}/></div>
    {error&&<p role="alert" className="notice error">{error}</p>}
    <div className="button-row"><button type="button" className="button orange" disabled={disabled||!items.length||items.some(it=>!Number.isFinite(it.grams)||it.grams<.1||it.grams>3000)} onClick={()=>{try{onSave(items)}catch(e){setError(e instanceof Error?e.message:'Revisa la comida.')}}}><Check size={17}/>{saveLabel}</button><button type="button" className="text-button" onClick={onCancel}>Cancelar</button></div>
  </div>;
}
