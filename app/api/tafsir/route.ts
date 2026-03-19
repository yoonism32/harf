import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

/** Lazy singleton — parse once per Node process, reuse on all subsequent requests */
let cache: Record<string, { text: string } | string> | null = null;

async function getTafsir(): Promise<Record<string, { text: string } | string>> {
  if (cache) return cache;
  const file = path.join(process.cwd(), 'data', 'tafsir-ibn-kathir.json');
  const raw = await readFile(file, 'utf-8');
  cache = JSON.parse(raw) as Record<string, { text: string } | string>;
  return cache;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ref = request.nextUrl.searchParams.get('ref');
  if (!ref || !/^\d{1,3}:\d{1,3}$/.test(ref)) {
    return NextResponse.json({ error: 'invalid ref' }, { status: 400 });
  }
  try {
    const data = await getTafsir();
    const entry = data[ref];
    // Some verses are stored as a redirect string pointing to the verse whose
    // tafsir section covers them (e.g. 17:84 → "17:83"). Follow it once.
    const resolved = typeof entry === 'string' ? data[entry] : entry;
    const text = resolved && typeof resolved === 'object' ? resolved.text : null;
    return NextResponse.json({ text: text ?? null }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    });
  } catch {
    return NextResponse.json({ error: 'failed to load tafsir' }, { status: 500 });
  }
}
