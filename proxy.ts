import {NextRequest,NextResponse} from 'next/server';
export function proxy(request:NextRequest){
 if(request.nextUrl.pathname==='/' && request.nextUrl.searchParams.has('code')) {
  const callback=request.nextUrl.clone();callback.pathname='/auth/callback';return NextResponse.redirect(callback);
 }
 const nonce=btoa(crypto.randomUUID());
 const development=process.env.NODE_ENV==='development';
 const accountOrigin=process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
 const csp=["default-src 'self'","base-uri 'self'","object-src 'none'","form-action 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development?" 'unsafe-eval'":''}`,"style-src 'self' 'unsafe-inline'","font-src 'self' data:","img-src 'self' data: blob:",`connect-src 'self' https://everyayah.com https://audios.quranwbw.com https://audio.qurancdn.com https://api.aladhan.com ${accountOrigin}`,"media-src 'self' https://everyayah.com https://audios.quranwbw.com https://audio.qurancdn.com","worker-src 'self' blob:","frame-ancestors 'none'"].join('; ');
 const requestHeaders=new Headers(request.headers);requestHeaders.set('x-nonce',nonce);requestHeaders.set('Content-Security-Policy',csp);
 const response=NextResponse.next({request:{headers:requestHeaders}});response.headers.set('Content-Security-Policy',csp);return response;
}
export const config={matcher:[{source:'/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|content/|fonts/|icons/|theme.js|sw.js|offline.html).*)'}]};
