import {currentOwner} from "../account/client";
const key=(id:string)=>currentOwner()?`harf:note-draft:${currentOwner()!.id}:${id}`:`harf:note-draft:${id}`;
export function readNoteDraft(id:string){try{return sessionStorage.getItem(key(id));}catch{return null;}}
export function writeNoteDraft(id:string,text:string){try{sessionStorage.setItem(key(id),text);}catch{/* The on-page draft still works for this visit. */}}
export function clearNoteDraft(id:string){try{sessionStorage.removeItem(key(id));}catch{/* A stale draft is safer than losing a current one. */}}
