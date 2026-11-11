'use client';
import {useState} from 'react';
import {dateKey} from './model';
import type {Profile} from './model';
import {savePlannedSupplement} from './preparation-engine';

import {supplementRecommendations} from './supplement-recommendations-model';
export default function SupplementRecommendations({profile:p,disabled,onChange}:{profile:Profile;disabled:boolean;onChange:(p:Profile)=>void}){
 const [message,setMessage]=useState(''),date=dateKey(),proposal=supplementRecommendations(p,date);
 return <section className="card"><h3>Tu propuesta de suplementación para hoy</h3><p>Las tomas se ordenan por comida y sesión. Confirma el producto y su etiqueta antes de añadirlo al plan.</p>
 {proposal.message&&<p>{proposal.message}</p>}
 {proposal.result.map(({product,reason})=><article className="onboarding-day-row" key={product.id}><h3>{product.name}</h3><p><strong>{product.amount} {product.unit} · {product.timing==='during'?'durante el entreno':product.timing==='postworkout'?'junto a la recuperación tras entrenar':'con el desayuno'}</strong></p><p>{reason}</p><button className="button outline" disabled={disabled} onClick={()=>{try{onChange(savePlannedSupplement(p,product,date));setMessage('Propuesta añadida a las comidas. Puedes ajustar los valores desde la etiqueta.')}catch(e){setMessage((e as Error).message)}}}>Añadir esta propuesta</button></article>)}
 <p>Para sesiones largas o con sudor elevado, los electrolitos se individualizan según el producto y las pérdidas. Puedes revisar la bebida con tu dietista.</p>
 <a href="https://www.ausport.gov.au/ais/nutrition/supplements/group_a" target="_blank" rel="noreferrer">Criterios AIS de suplementación</a>
 {message&&<p role="status">{message}</p>}</section>;
}
