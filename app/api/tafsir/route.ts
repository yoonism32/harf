import {NextRequest,NextResponse} from 'next/server';
import {getTafsir} from '@/lib/content/tafsir';
import {parseRef} from '@/lib/content/refs';

const PAGE_SIZE=16;
export async function GET(request:NextRequest){
 const ref=request.nextUrl.searchParams.get('ref')??'';
 const page=Number(request.nextUrl.searchParams.get('page')??'1');
 if(!parseRef(ref)||!Number.isInteger(page)||page<1||page>100)return NextResponse.json({error:'Invalid request'},{status:400});
 try{
  const blocks=await getTafsir(ref);const pages=Math.max(1,Math.ceil(blocks.length/PAGE_SIZE));
  if(page>pages)return NextResponse.json({error:'Page not found'},{status:404});
  return NextResponse.json({ref,page,pages,blocks:blocks.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE),sourceStatus:'English Ibn Kathir edition, sourced from QUL resource 35.'},{headers:{'Cache-Control':'public, max-age=3600, stale-while-revalidate=86400'}});
 }catch{return NextResponse.json({error:'Commentary could not be loaded'},{status:500});}
}
