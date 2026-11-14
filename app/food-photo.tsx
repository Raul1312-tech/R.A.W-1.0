'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {photoItems,photoEstimateSchema} from './food-photo-model';
import FoodPhotoProgress from './food-photo-progress';
import type {Item} from './model';

export default function FoodPhoto({onReady,disabled,beforeCamera}:{onReady:(items:Item[],message:string)=>void;disabled:boolean;beforeCamera?:ReactNode}){
 const picker=useRef<HTMLInputElement>(null),request=useRef<AbortController|null>(null),generation=useRef(0);
 const [open,setOpen]=useState(false),[image,setImage]=useState(''),[note,setNote]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [preparing,setPreparing]=useState(false);
 useEffect(()=>()=>{generation.current++;request.current?.abort()},[]);
 async function choose(file:File){
  const id=++generation.current;request.current?.abort();setOpen(true);setBusy(false);setImage('');setError('');setConsent(false);
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15_000_000){setError('Usa una foto JPG, PNG o WebP de hasta 15 MB.');return}
  setPreparing(true);
  const url=URL.createObjectURL(file);
  try{const source=new Image();source.src=url;await source.decode();if(id!==generation.current)return;
   if(source.width*source.height>60_000_000)throw Error();
   const scale=Math.min(1,1280/Math.max(source.width,source.height)),canvas=document.createElement('canvas');canvas.width=Math.round(source.width*scale);canvas.height=Math.round(source.height*scale);
   const context=canvas.getContext('2d');if(!context)throw Error();context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(source,0,0,canvas.width,canvas.height);
   const data=canvas.toDataURL('image/jpeg',.8);if(data.length>1_600_000)throw Error();setImage(data);
  }catch{if(id===generation.current)setError('No se pudo preparar la foto. Prueba con otra imagen más pequeña.')}finally{URL.revokeObjectURL(url);if(id===generation.current)setPreparing(false)}
 }
 async function analyze(){
  if(!image||!consent||busy)return;const id=++generation.current;const controller=new AbortController();request.current=controller;setBusy(true);setError('');
  try{const response=await fetch('/api/foods/photo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,note,consent:true}),signal:controller.signal});const body=await response.json();if(!response.ok)throw Error(body.error??'No se pudo analizar la foto.');if(id!==generation.current)return;
   const estimate=photoEstimateSchema.parse(body.estimate);if(!estimate.items.length){setError(estimate.message||'No se distingue un plato. Prueba con otra foto.');return}
   onReady(photoItems(estimate),[estimate.message,...estimate.assumptions].join(' '));setImage('');setOpen(false);setConsent(false);
  }catch(e){if(!controller.signal.aborted&&id===generation.current)setError(e instanceof Error?e.message:'No se pudo analizar. Puedes continuar manualmente.')}finally{if(id===generation.current)setBusy(false)}
 }
 return <section className="food-photo-entry" aria-busy={busy||preparing}><div className="food-photo-actions">{beforeCamera}<button type="button" className="food-camera-button" disabled={disabled||busy||preparing} aria-label="Hacer foto de mi comida" onClick={()=>picker.current?.click()}><span aria-hidden="true">📷</span><strong>{image?'Repetir foto':'Hacer foto'}</strong></button></div>
 <input hidden ref={picker} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Foto de mi comida" disabled={busy||disabled} onChange={e=>{const file=e.target.files?.[0];if(file)void choose(file);e.target.value=''}}/>
 {open&&<div className="food-photo-panel"><h3>Una foto para empezar tu registro</h3><p>La IA propone alimentos, cantidades y macros aproximados. Revisarás el plato antes de guardarlo. El aceite, las salsas y los ingredientes ocultos pueden no verse.</p>
 {preparing&&<FoodPhotoProgress preparing/>}
 {image&&<><img src={image} alt="Foto del plato pendiente de analizar"/><label className="field">Ayuda a interpretar tu plato · opcional<textarea maxLength={400} value={note} disabled={busy} onChange={e=>setNote(e.target.value)} placeholder="Por ejemplo: arroz cocido, pollo y una cucharadita de aceite. Si sabes los gramos, indícalos."/></label>
 <label className="checkbox"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/> Enviar esta foto y la nota a OpenAI para estimar el plato. La foto no se guarda en mi historial.</label>
 {busy?<><FoodPhotoProgress/><button className="text-button" type="button" onClick={()=>{generation.current++;request.current?.abort();setBusy(false);setError('Análisis cancelado. Puedes revisar la foto o registrar manualmente.')}}>Cancelar análisis</button></>:<button className="button orange" type="button" disabled={disabled||!consent} onClick={()=>void analyze()}>Analizar y revisar cantidades</button>}</>}
 <small>Requiere iniciar sesión. Hasta 3 consultas IA al día, compartidas con el coordinador. Los alérgenos se comprueban en el producto, nunca por la foto.</small>
 {error&&<p className="notice error" role="alert">{error}</p>}</div>}
 </section>;
}
