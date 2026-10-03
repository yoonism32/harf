'use client';
import {useEffect,useState} from 'react';
export function useResource<T>(load:()=>Promise<T>){
 const [state,set]=useState<{data?:T;error?:string}>({}); const [revision,retry]=useState(0);
 useEffect(()=>{let current=true;set({});Promise.resolve().then(load).then(data=>{if(current)set({data});},error=>{if(current)set({error:error instanceof Error?error.message:'Content could not load'});});return()=>{current=false;};},[load,revision]);
 return {...state,retry:()=>retry(n=>n+1)};
}
export function ResourceMessage({error,retry}:{error?:string;retry:()=>void}){return error?<div role="alert" className="sheet"><p>{error}</p><button className="button button-secondary" onClick={retry}>Try again</button></div>:<p role="status">Loading…</p>;}
