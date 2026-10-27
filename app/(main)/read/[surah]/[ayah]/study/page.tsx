import {notFound} from 'next/navigation';
import {parseRef} from '@/lib/content/refs';
import {PassageStudy} from '@/components/practice/PassageStudy';

export default async function Page({params, searchParams}: {
 params: Promise<{surah: string; ayah: string}>;
 searchParams: Promise<{back?: string | string[]}>;
}) {
 const {surah, ayah} = await params;
 const reference = `${surah}:${ayah}`;
 if (!parseRef(reference)) notFound();
 const {back} = await searchParams;
 // Only return to a reader route, never to a caller-supplied external URL.
 const match = typeof back === 'string' ? /^\/read\/([1-9]\d{0,2})\/([1-9]\d{0,2})(?:\?[^#]*)?$/.exec(back) : null;
 const returnHref = match && parseRef(`${match[1]}:${match[2]}`) ? back as string : `/read/${surah}/${ayah}`;
 return <PassageStudy key={reference} reference={reference} returnHref={returnHref}/>;
}
