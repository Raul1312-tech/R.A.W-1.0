'use client';

import {Children,isValidElement,useEffect,useId,useRef,useState,type CSSProperties,type KeyboardEvent,type ReactNode} from 'react';
import {Check,ChevronDown,X} from 'lucide-react';

type OptionProps={value?:string|number;disabled?:boolean;children?:ReactNode};
type Props={
  children:ReactNode;label?:ReactNode;hint?:ReactNode;className?:string;'aria-label'?:string;
  value?:string|number;defaultValue?:string|number;name?:string;required?:boolean;disabled?:boolean;hidden?:boolean;
  onValueChange?:(value:string)=>void;
  'aria-invalid'?:boolean;'aria-describedby'?:string;
};

export default function SelectField({children,label,hint,className,'aria-label':ariaLabel,'aria-invalid':externalInvalid,'aria-describedby':describedBy,value,defaultValue,name,required,disabled,hidden,onValueChange}:Props){
  const id=useId();
  const trigger=useRef<HTMLButtonElement>(null);
  const native=useRef<HTMLSelectElement>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const search=useRef({text:'',at:0});
  const [local,setLocal]=useState(defaultValue);
  const [invalid,setInvalid]=useState(false);
  const [placement,setPlacement]=useState<CSSProperties>();
  const [active,setActive]=useState(0);
  const open=placement!==undefined;
  const options=Children.toArray(children).flatMap(child=>{
    if(!isValidElement<OptionProps>(child)||child.type!=='option')return [];
    const text=Children.toArray(child.props.children).join('');
    return [{text,value:String(child.props.value??text),disabled:!!child.props.disabled}];
  });
  const chosen=options.find(option=>option.value===String(value??local))??options.find(option=>!option.disabled);

  useEffect(()=>{
    const form=native.current?.form;
    if(!form)return;
    const reset=()=>{setLocal(defaultValue);setInvalid(false)};
    form.addEventListener('reset',reset);
    return ()=>form.removeEventListener('reset',reset);
  },[defaultValue]);

  function optionButtons(){
    return Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('.raw-select-option:not(:disabled)')??[]);
  }

  useEffect(()=>{
    if(!open||!dialog.current||dialog.current.open)return;
    dialog.current.showModal();
    const buttons=optionButtons();
    (buttons.find(button=>button.getAttribute('aria-selected')==='true')??buttons[0])?.focus();
  },[open]);

  function show(){
    const bounds=trigger.current!.getBoundingClientRect();
    const viewport=document.documentElement.clientWidth;
    const width=Math.min(Math.max(bounds.width,248),viewport-24);
    const left=Math.min(Math.max(12,bounds.left),viewport-width-12);
    const below=window.innerHeight-bounds.bottom-16,above=bounds.top-16;
    const upward=above>below&&below<Math.min(options.length*47+64,300);
    const selected=options.findIndex(option=>option===chosen&&!option.disabled);
    setActive(selected>=0?selected:options.findIndex(option=>!option.disabled));
    search.current={text:'',at:0};
    setPlacement({
      '--select-width':width+'px',
      '--select-left':left+'px',
      '--select-height':Math.max(128,upward?above:below)+'px',
      '--select-top':upward?'auto':bounds.bottom+8+'px',
      '--select-bottom':upward?window.innerHeight-bounds.top+8+'px':'auto',
    } as CSSProperties);
  }

  function close(){
    dialog.current?.close();
    setPlacement(undefined);
    trigger.current?.focus({preventScroll:true});
  }

  function choose(selection:string){
    if(value===undefined)setLocal(selection);
    setInvalid(false);
    if(selection!==chosen?.value)onValueChange?.(selection);
  }

  function navigate(event:KeyboardEvent<HTMLDivElement>){
    const buttons=optionButtons();
    const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next:HTMLButtonElement|undefined;
    if(event.key==='ArrowDown')next=buttons[Math.min(index+1,buttons.length-1)];
    else if(event.key==='ArrowUp')next=buttons[Math.max(0,index-1)];
    else if(event.key==='Home')next=buttons[0];
    else if(event.key==='End')next=buttons.at(-1);
    else if(event.key.length===1&&event.key!==' '&&!event.ctrlKey&&!event.altKey&&!event.metaKey){
      const now=Date.now();
      const normalize=(text:string)=>text.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('es');
      const text=normalize((now-search.current.at<600?search.current.text:'')+event.key);
      search.current={text,at:now};
      next=[...buttons.slice(index+1),...buttons.slice(0,index+1)].find(button=>normalize(button.textContent??'').startsWith(text));
    }else return;
    event.preventDefault();
    next?.focus();
  }

  return <div className={['raw-select-field',className??(label?'field':'')].join(' ')}>
    {label&&(hidden?<span className="raw-select-label">{label}</span>:<label className="raw-select-label" htmlFor={id}>{label}</label>)}
    {!hidden&&<>
      <button ref={trigger} id={id} type="button" className="raw-select-trigger" disabled={disabled} aria-label={ariaLabel} aria-haspopup="dialog"
        aria-expanded={open} aria-controls={id+'-picker'} aria-invalid={externalInvalid||invalid||undefined}
        aria-describedby={[id+'-value',hint&&id+'-hint',invalid&&id+'-error',describedBy].filter(Boolean).join(' ')}
        onClick={show} onKeyDown={event=>{
          if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();show()}
        }}>
        <span id={id+'-value'}>{chosen?.text??'Sin opciones'}</span><ChevronDown size={17} aria-hidden="true"/>
      </button>
      <dialog ref={dialog} id={id+'-picker'} className="raw-select-picker" aria-labelledby={id+'-title'} style={placement}
        onClose={()=>setPlacement(undefined)} onCancel={event=>{event.preventDefault();close()}} onClick={event=>{if(event.target===event.currentTarget)close()}}>
        {open&&<div className="raw-select-panel">
          <header><h2 id={id+'-title'}>{ariaLabel??label}</h2><button className="raw-select-close" type="button" aria-label="Cerrar opciones" onClick={close}><X size={19}/></button></header>
          <div className="raw-select-options" role="listbox" aria-labelledby={id+'-title'} onKeyDown={navigate}>
            {options.map((option,i)=><button type="button" className="raw-select-option" role="option" aria-selected={option===chosen&&!option.disabled}
              disabled={disabled||option.disabled} tabIndex={i===active?0:-1} key={option.value} onFocus={()=>setActive(i)}
              onClick={()=>{close();choose(option.value)}}><span>{option.text}</span>{option===chosen&&!option.disabled&&<Check size={18} aria-hidden="true"/>}</button>)}
          </div>
        </div>}
      </dialog>
    </>}
    {(name||required)&&<select ref={native} className="raw-native-select" tabIndex={-1} aria-hidden="true" name={name}
      required={required} disabled={disabled||hidden} value={chosen?.value??''} onChange={event=>choose(event.target.value)}
      onInvalid={event=>{event.preventDefault();setInvalid(true);trigger.current?.focus()}}>{children}</select>}
    {hint&&<small id={id+'-hint'}>{hint}</small>}
    {invalid&&<small id={id+'-error'} className="raw-select-error" role="alert">Selecciona una opción para continuar.</small>}
  </div>;
}
