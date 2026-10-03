import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import {headers} from 'next/headers';
import './globals.css';
import { PWARegister } from '@/components/PWARegister';
const source = localFont({ src:[{path:'../public/fonts/source-sans-3-regular.woff2',weight:'400'},{path:'../public/fonts/source-sans-3-semibold.woff2',weight:'600'}],variable:'--font-source',display:'swap' });
const amiri = localFont({ src:[{path:'../public/fonts/amiri-regular.woff2',weight:'400'},{path:'../public/fonts/amiri-bold.woff2',weight:'700'}],variable:'--font-amiri',display:'swap' });
const quran = localFont({ src:'../public/fonts/amiri-quran.woff2',weight:'400',variable:'--font-amiri-quran',display:'swap' });
export const viewport: Viewport = { width:'device-width',initialScale:1,themeColor:'#F6F3EC',viewportFit:'cover' };
export const metadata: Metadata = { metadataBase:new URL('https://harf.app'),title:{default:'Harf — Quranic vocabulary, in context',template:'%s | Harf'},description:'Learn Quranic vocabulary through short reviews, then see the words in context.',icons:{icon:'/icons/icon.svg',apple:'/icons/icon-192.png'} };
export default async function RootLayout({ children }: { children: React.ReactNode }) {const nonce=(await headers()).get('x-nonce')??undefined;return <html lang="en" dir="ltr" suppressHydrationWarning className={`${source.variable} ${amiri.variable} ${quran.variable}`}><head><script nonce={nonce} src="/theme.js"/></head><body><PWARegister/>{children}</body></html>; }
