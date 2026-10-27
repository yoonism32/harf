'use client';
import {useEffect,useId,useRef,useState,type KeyboardEvent} from 'react';
import {RECITERS,reciterDetail} from '@/lib/audio';
export function ReciterPicker({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const [open,setOpen]=useState(false),[search,setSearch]=useState(''),[active,setActive]=useState(0);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),input=useRef<HTMLInputElement>(null),list=useRef<HTMLDivElement>(null),id=useId();
 const selected=RECITERS.find(r=>r.id===value);
 const choices=RECITERS.filter(r=>reciterDetail(r.id).toLowerCase().includes(search.toLowerCase()));
 useEffect(()=>{if(!open)return;input.current?.focus();const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
 useEffect(()=>{if(open)list.current?.querySelector('[data-active="true"]')?.scrollIntoView({block:'nearest'});},[active,open]);
 function choose(id:string){onChange(id);setOpen(false);trigger.current?.focus();}
 function keys(e:KeyboardEvent){
  if(e.key==='Escape'){e.preventDefault();setOpen(false);trigger.current?.focus();}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!open){setSearch('');setActive(0);setOpen(true);}else setActive(n=>Math.max(0,Math.min(choices.length-1,n+(e.key==='ArrowDown'?1:-1))));}
  if(e.key==='Enter'&&open){e.preventDefault();if(choices[active])choose(choices[active].id);}
 }
 const detail=(id:string,label:string)=><><span>{label}</span><small className="muted reciter-bitrate">{id.match(/(\d+)kbps/i)?.[1]?.concat(' kbps')}</small></>;
 return <div ref={root} className="field reciter-picker" onKeyDown={keys} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false);}}><span>Reciter</span><button ref={trigger} type="button" className="reciter-option reciter-trigger" disabled={disabled} aria-label={`Reciter: ${reciterDetail(value)}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>{setSearch('');setActive(0);setOpen(!open);}}>{detail(value,selected?.label??'Choose reciter')}<span aria-hidden="true">⌄</span></button>{open&&<div className="reciter-menu"><label className="field">Find a reciter<input ref={input} type="search" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls={id} aria-activedescendant={choices[active]?`${id}-${active}`:undefined} value={search} onChange={e=>{setSearch(e.target.value);setActive(0);}}/></label><div ref={list} id={id} role="listbox" aria-label="Reciters" className="reciter-options">{choices.map((r,i)=><div role="option" id={`${id}-${i}`} className="reciter-option" key={r.id} aria-selected={value===r.id} data-active={active===i} onPointerDown={e=>e.preventDefault()} onClick={()=>choose(r.id)}>{detail(r.id,r.label)}</div>)}</div>{!choices.length&&<p role="status">No matching reciters.</p>}</div>}</div>;
}
