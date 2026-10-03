import {notFound} from 'next/navigation';
import {parseRef} from '@/lib/content/refs';
import {Reader} from '@/components/reader/Reader';
import {Suspense} from 'react';
export default async function Page({params}:{params:Promise<{surah:string;ayah:string}>}){const p=await params;const ref=`${p.surah}:${p.ayah}`;if(!parseRef(ref))notFound();return <Suspense fallback={<p>Opening ayah…</p>}><Reader reference={ref}/></Suspense>;}
