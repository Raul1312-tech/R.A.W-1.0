'use client';
import {useOrganization} from './organization-context';
import {Dumbbell,Flame,ArrowUpRight} from 'lucide-react';
import type {Modality} from './modality';
import Brand from './brand';
export default function ModalityGate({onChoose,disabled}:{onChoose:(mode:Modality)=>void;disabled:boolean}){
 const organization=useOrganization();
 const boxing=organization?.organization.modules.boxing!==false;
 return <main className="modality-gate">
  <div className="modality-brand"><Brand layout="emblem" modality={boxing?'boxing':'hypertrophy'}/></div>
  <span className="eyebrow">{organization?.organization.name??'RISE'} · TU OBJETIVO, TU CAMINO</span>
  <h1>{boxing?'¿Para qué entrenas?':'Tu plan de musculación'}</h1>
  <p>{boxing?'La misma facilidad para registrar, comer y progresar. Un plan pensado para tu deporte.':'Alimentación, entrenamiento y progreso, adaptados a ti.'}</p>
  <div className={'modality-choices'+(boxing?'':' single-modality')}>
   {boxing&&<button disabled={disabled} onClick={()=>onChoose('boxing')}><Flame size={36}/><h2>Boxeo</h2><p>Técnica, sparring, físico, carrera y preparación para competir.</p><strong>Entrar en Boxeo <ArrowUpRight/></strong></button>}
   <button disabled={disabled} onClick={()=>onChoose('hypertrophy')}><Dumbbell size={36}/><h2>Hipertrofia</h2><p>Gimnasio, crecimiento muscular, progresión de cargas y alimentación.</p><strong>Construir mi plan <ArrowUpRight/></strong></button>
  </div><p>Tu elección se guarda por perfil. Podrás revisar otro plan más adelante conservando tu historial.</p>
 </main>;
}
