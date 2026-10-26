'use client';
import {useId} from 'react';
import {useRouter} from 'next/navigation';
import {parseRef} from '@/lib/content/refs';
// Go to any ayah from any page; invalid input uses the browser's own validation message.
export function AyahJump(){
 const router=useRouter();const id=useId();
 return <form role="search" aria-label="Go to ayah" className="ayah-jump" onSubmit={e=>{e.preventDefault();const input=e.currentTarget.elements.namedItem('ref') as HTMLInputElement;const ref=parseRef(input.value.trim().replace(/\s*:\s*/,':'));if(!ref){input.setCustomValidity('Enter a surah:ayah that exists, for example 2:255.');input.reportValidity();return;}input.value='';router.push(`/read/${ref.surah}/${ref.ayah}`);}}>
  <label className="sr-only" htmlFor={id}>Go to ayah (surah:ayah)</label>
  <input id={id} name="ref" inputMode="decimal" autoComplete="off" placeholder="Go to 2:255" size={9} onInput={e=>e.currentTarget.setCustomValidity('')}/>
 </form>;
}
