'use client';
import {useEffect,useRef} from 'react';

/** Close an explicitly submitted disclosure only after its state revision is persisted. */
function showStatus(details:HTMLDetailsElement,text:string){
 details.dataset.saveStatus=text;
 const summary=details.querySelector(':scope > summary');if(!summary)return;
 let badge=summary.querySelector<HTMLElement>('.disclosure-save-badge');
 if(!badge){badge=document.createElement('span');badge.className='disclosure-save-badge';badge.setAttribute('role','status');summary.appendChild(badge)}
 badge.textContent=text;
}
export function useDisclosureSaveFeedback(){
 const candidate=useRef<HTMLDetailsElement|null>(null);
 const pending=useRef(new Map<HTMLDetailsElement,number>());
 useEffect(()=>{
  let cleanup:ReturnType<typeof setTimeout>|undefined;
  const capture=(event:Event)=>{
   const target=event.target instanceof Element?event.target:null;
   const button=target?.closest('button');
   if(event.type==='click'&&(!button||button.disabled||! /guardar|enviar|aplicar|fijar|registrar|actualizar/.test(button.textContent?.toLocaleLowerCase('es')??'')))return;
   const details=target?.closest('details') as HTMLDetailsElement|null;
   candidate.current=details;
   if(cleanup)clearTimeout(cleanup);
   // Invalid forms or validation failures never produce a state mutation.
   cleanup=setTimeout(()=>{candidate.current=null},0);
  };
  document.addEventListener('submit',capture,true);
  document.addEventListener('click',capture,true);
  const edited=(event:Event)=>{const details=event.target instanceof Element?event.target.closest('details'):null;if(details&&!pending.current.has(details)){delete details.dataset.saveStatus;details.querySelector(':scope > summary .disclosure-save-badge')?.remove()}};
  document.addEventListener('input',edited,true);
  document.addEventListener('change',edited,true);
  return ()=>{document.removeEventListener('submit',capture,true);document.removeEventListener('click',capture,true);document.removeEventListener('input',edited,true);document.removeEventListener('change',edited,true);if(cleanup)clearTimeout(cleanup)};
 },[]);
 const mutated=(version:number)=>{
  const details=candidate.current;if(!details?.isConnected)return;
  pending.current.set(details,version);showStatus(details,'Guardando…');
 };
 const saved=(version:number)=>{
  let count=0;
  for(const [details,revision] of pending.current){
   if(revision>version)continue;
   pending.current.delete(details);
   if(!details.isConnected)continue;
   const focused=details.contains(document.activeElement);
   showStatus(details,'✓ Guardado');details.open=false;
   if(focused)details.querySelector('summary')?.focus();
   count++;
  }
  return count;
 };
 const failed=()=>{for(const details of pending.current.keys())if(details.isConnected){showStatus(details,'No se ha guardado · reintenta');details.open=true}};
 return {mutated,saved,failed};
}
