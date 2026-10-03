import {WordDetail} from '@/components/learning/WordDetail';
import {readEntry} from '@/lib/content/server';
import {notFound} from 'next/navigation';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!await readEntry(id))notFound();return <WordDetail id={id}/>;}
