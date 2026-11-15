'use client';
import {useEffect,useState} from 'react';
import {Droplets} from 'lucide-react';
import {hydrationReference} from './hydration-model';
import type {Day,Profile} from './model';
export default function TodayWater({profile,date,day,disabled,onChange}:{profile:Profile;date:string;day:Day;disabled:boolean;onChange:(day:Day)=>void}){
 const reference=hydrationReference(profile,date),[last,setLast]=useState(0);
 useEffect(()=>setLast(0),[profile.id,date]);
 function add(amount:number){const water=Math.min(15000,Math.max(0,day.water+amount));onChange({...day,water});setLast(water-day.water)}
 return <section className="card today-water"><div className="today-section-title"><div><h2><Droplets size={19}/> Agua y bebidas</h2><p>{(day.water/1000).toLocaleString('es-ES')} / {(reference.goal/1000).toLocaleString('es-ES')} l registrados</p></div></div>
 <div className="today-water-glasses" role="group" aria-label="Añadir un vaso de agua de 250 ml">{Array.from({length:Math.min(12,Math.max(1,Math.ceil(reference.goal/250)))},(_,i)=><button type="button" key={i} className="water-glass-button" aria-label="Añadir 250 ml de agua" disabled={disabled||day.water>=15000} onClick={()=>add(250)}><span className="water-glass" aria-hidden="true"><span style={{height:Math.min(100,Math.max(0,(day.water-i*250)/250*100))+'%'}}/></span></button>)}</div>
 <div className="today-water-buttons"><button className="button outline" disabled={disabled||day.water>=15000} onClick={()=>add(250)}>+ 250 ml</button><button className="button outline" disabled={disabled||day.water>=15000} onClick={()=>add(500)}>+ 500 ml</button><small>Cada vaso añade 250 ml</small></div>
 <progress aria-label="Bebidas registradas respecto a la referencia" value={Math.min(day.water,reference.goal)} max={Math.max(1,reference.goal)}/>{last>0&&<button className="text-button" disabled={disabled||day.water<last} onClick={()=>{onChange({...day,water:day.water-last});setLast(0)}}>Deshacer última toma</button>}</section>;
}
