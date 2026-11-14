'use client';
import {useEffect,useState} from 'react';
import {Droplets} from 'lucide-react';
import {hydrationReference} from './hydration-model';
import type {Day,Profile} from './model';
export default function TodayWater({profile,date,day,disabled,onChange}:{profile:Profile;date:string;day:Day;disabled:boolean;onChange:(day:Day)=>void}){
 const reference=hydrationReference(profile,date),[last,setLast]=useState(0);
 useEffect(()=>setLast(0),[profile.id,date]);
 function add(amount:number){const water=Math.min(15000,Math.max(0,day.water+amount));onChange({...day,water});setLast(water-day.water)}
 return <section className="card today-water"><div className="today-section-title"><div><h2><Droplets size={19}/> Agua y bebidas</h2><p>{(day.water/1000).toLocaleString('es-ES')} / {(reference.goal/1000).toLocaleString('es-ES')} l registrados</p></div><div className="today-water-buttons"><button className="button outline" disabled={disabled||day.water>=15000} onClick={()=>add(250)}>+ 250 ml</button><button className="button outline" disabled={disabled||day.water>=15000} onClick={()=>add(500)}>+ 500 ml</button></div></div><progress aria-label="Bebidas registradas respecto a la referencia" value={Math.min(day.water,reference.goal)} max={Math.max(1,reference.goal)}/>{last>0&&<button className="text-button" disabled={disabled||day.water<last} onClick={()=>{onChange({...day,water:day.water-last});setLast(0)}}>Deshacer última toma</button>}</section>;
}
