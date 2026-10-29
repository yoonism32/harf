'use client';
import Link from 'next/link';
import {z} from 'zod';
import {useVisitState} from '@/lib/data/use-visit-state';
import {safeReturn} from '@/lib/navigation/return';

export function EndPracticeLink({returnTo}:{returnTo?:string|null}){
 const [,setResume]=useVisitState('practice:last','',z.string().max(6000));
 const target=safeReturn(returnTo)??'/practice';
 return <Link href={target} onClick={()=>setResume('')}>End practice</Link>;
}
