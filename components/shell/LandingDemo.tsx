'use client';
import { useState } from 'react';
import { ArabicText, Button } from '@/components/ui';
export function LandingDemo({arabic,gloss}:{arabic:string;gloss:string}){const[revealed,setRevealed]=useState(false);return <section className="sheet landing-demo" aria-label="Try a vocabulary card"><p className="eyebrow">One word, in context</p><ArabicText className="study-word">{arabic}</ArabicText><div className="demo-answer" aria-live="polite">{revealed?<><h2>{gloss}</h2><p className="muted">A contextual meaning in Al-Fatihah, <bdi>1:2</bdi>.</p></>:<Button variant="secondary" onClick={()=>setRevealed(true)}>Reveal meaning</Button>}</div><p className="muted demo-caption">A preview. Your progress starts when you do.</p></section>;}
