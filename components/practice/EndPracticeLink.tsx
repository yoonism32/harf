'use client';
import Link from 'next/link';
import {z} from 'zod';
import {useVisitState} from '@/lib/data/use-visit-state';

export function EndPracticeLink(){const [,setResume]=useVisitState('practice:last','',z.string().max(6000));return <Link href="/practice" onClick={()=>setResume('')}>End practice</Link>;}
