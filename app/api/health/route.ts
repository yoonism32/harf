import {NextResponse} from 'next/server';

// Liveness probe for Render and external monitors. It deliberately does not
// read Supabase: a paused or briefly unreachable account backend must not make
// Render believe this process is broken and restart it. The database has its
// own keep-alive job (.github/workflows/supabase-keepalive.yml).
export const dynamic='force-dynamic';

export function GET(){
 return NextResponse.json(
  {status:'ok',service:'harf',timestamp:new Date().toISOString(),uptime:Math.floor(process.uptime()),runtime:process.version,revision:process.env.RENDER_GIT_COMMIT??null},
  {headers:{'Cache-Control':'no-store'}},
 );
}
