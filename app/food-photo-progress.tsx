'use client';
import {useEffect,useState} from 'react';
export default function FoodPhotoProgress({preparing=false}:{preparing?:boolean}){
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{const start=Date.now();const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);return()=>clearInterval(timer)},[]);
 const label=preparing?'Preparando tu foto…':elapsed<6?'Analizando los ingredientes de tu plato…':elapsed<15?'Estimando cantidades y macronutrientes…':elapsed<25?'Revisando la estimación de tu comida…':'El análisis sigue en curso…';
 return <div className="food-analysis-progress" role="status" aria-live="polite"><div className="food-analysis-heading"><span className="food-analysis-spinner" aria-hidden="true"/><strong>{label}</strong></div><div className="food-analysis-track" role="progressbar" aria-label={preparing?'Preparación de la foto en curso':'Análisis de la comida en curso'}><span/></div><p>{preparing?'Ajustando la imagen para enviarla.':'Te mostraremos un borrador para revisar antes de guardar.'}</p>{!preparing&&elapsed>=25&&<small>Puedes esperar o cancelar y continuar manualmente.</small>}</div>;
}
