'use client';
import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import {slideIndex,swipeDirection} from './carousel-model';
export type LateralSlide={id:string;label:string;content:ReactNode};
export default function LateralCarousel({label,slides,activeId,onActiveChange,empty,disabled=false}:{label:string;slides:LateralSlide[];activeId?:string;onActiveChange?:(id:string)=>void;empty?:ReactNode;disabled?:boolean}){
  const [local,setLocal]=useState(slides[0]?.id);const indexRef=useRef(0);const root=useRef<HTMLDivElement>(null);const viewport=useRef<HTMLDivElement>(null);const pointer=useRef<{x:number;y:number}|null>(null);const [height,setHeight]=useState<number>();
  const ids=slides.map(s=>s.id);const index=slideIndex(ids,activeId??local,indexRef.current);const current=slides[index];
  useEffect(()=>{indexRef.current=index;if(current&&local!==current.id)setLocal(current.id)},[index,current?.id,local]);
  useLayoutEffect(()=>{const element=viewport.current?.querySelector<HTMLElement>(':scope > .lateral-track > .lateral-slide[data-current-slide="true"]');if(!element){setHeight(undefined);return}const measure=()=>setHeight(element.getBoundingClientRect().height);measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect()},[current?.id,slides.length]);
  function select(next:number){if(disabled||next<0||next>=slides.length)return;setLocal(slides[next].id);onActiveChange?.(slides[next].id)}
  if(!slides.length)return <>{empty}</>;
  return <div className="lateral-carousel" ref={root} role="region" aria-roledescription="carrusel" aria-label={label}
    onKeyDown={e=>{if((e.target as HTMLElement).closest('.lateral-carousel')!==root.current)return;if(e.target!==e.currentTarget&&!(e.target as HTMLElement).closest('[data-carousel-control]'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();select(index+(e.key==='ArrowRight'?1:-1))}}}>
    <div className="lateral-viewport" ref={viewport} style={{height:height??'auto'}} onPointerDown={e=>{const target=e.target as HTMLElement;if(disabled||target.closest('.lateral-carousel')!==root.current||target.closest('button,a,input,select,textarea,summary,.food-grid-editor'))return;pointer.current={x:e.clientX,y:e.clientY}}} onPointerCancel={()=>{pointer.current=null}} onPointerUp={e=>{const start=pointer.current;pointer.current=null;if(!start)return;const direction=swipeDirection(e.clientX-start.x,e.clientY-start.y);if(direction)select(index+direction)}}>
      <div className="lateral-track" style={{transform:`translateX(-${index*100}%)`}}>{slides.map((slide,i)=><div key={slide.id} className="lateral-slide" data-current-slide={i===index?'true':undefined} inert={i!==index} aria-hidden={i!==index} role="group" aria-roledescription="tarjeta" aria-label={`${slide.label}, ${i+1} de ${slides.length}`}>{slide.content}</div>)}</div>
    </div>
    <div className="lateral-controls"><button type="button" data-carousel-control aria-label={`${label}: anterior`} disabled={disabled||index===0} onClick={()=>select(index-1)}><ArrowLeft size={22}/><span>Anterior</span></button><div className="lateral-position" aria-live="polite" aria-atomic="true"><span>{label}</span><b>{index+1} <small>de {slides.length}</small></b></div><button type="button" data-carousel-control aria-label={`${label}: siguiente`} disabled={disabled||index===slides.length-1} onClick={()=>select(index+1)}><span>Siguiente</span><ArrowRight size={22}/></button></div>
    {slides.length>1&&<div className="lateral-footer"><span>Desliza lateralmente o usa las flechas</span>{slides.length<=10&&<div className="lateral-dots">{slides.map((slide,i)=><button type="button" key={slide.id} data-carousel-control disabled={disabled} aria-label={`${label}: ir a ${slide.label}`} aria-pressed={index===i} onClick={()=>select(i)}><i/></button>)}</div>}</div>}
  </div>;
}
