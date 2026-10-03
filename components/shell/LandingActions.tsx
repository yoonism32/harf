'use client';
import Link from 'next/link';
import { useHarfStore } from '@/lib/data/store';
export function LandingActions(){const state=useHarfStore();const returning=state.status==='ready'&&(state.settings.onboardingComplete||state.cards.length>0);return <div className="actions"><Link className="button button-primary" href={returning?'/today':'/start'}>{returning?'Continue learning':'Begin learning'}</Link><Link className="button button-secondary" href="/read">Explore the Quran</Link></div>;}
