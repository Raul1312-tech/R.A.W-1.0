'use client';
import {useState} from 'react';
import type {TrainingData} from './training-model';
import {moveGymDay} from './gym-actions';
export default function MoveGymDay({data,from,today,onChange,disabled}:{data:TrainingData;from:string;today:string;onChange:(data:TrainingData)=>void;disabled:boolean}){
 const [to,setTo]=useState(''),[message,setMessage]=useState('');
 return <details className="card raw-disclosure"><summary>No puedo hacer esta sesión · moverla</summary><p>Elige un día de descanso. Conservamos los ejercicios y los registros realizados; no añadimos una sesión extra.</p><label className="field">Nueva fecha<input type="date" min={today} value={to} onChange={e=>{setTo(e.target.value);setMessage('')}}/></label><button className="button outline" disabled={disabled||!to} onClick={()=>{try{onChange(moveGymDay(data,from,to,today));setMessage('Sesión movida. Revisa el calendario y las comidas del nuevo día.')}catch(e){setMessage((e as Error).message)}}}>Mover esta sesión</button>{message&&<p role="status">{message}</p>}</details>;
}
