import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

/** Lazy singleton — parse once per Node process, reuse on all subsequent requests */
let cache: Record<string, { text: string }> | null = null;

async function getTafsir(): Promise<Record<string, { text: string }>> {
  if (cache) return cache;
  const file = path.join(process.cwd(), 'data', 'tafsir-ibn-kathir.json');
  const raw = await readFile(file, 'utf-8');
  cache = JSON.parse(raw) as Record<string, { text: string }>;
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
    return NextResponse.json({ text: entry?.text ?? null });
  } catch {
    return NextResponse.json({ error: 'failed to load tafsir' }, { status: 500 });
  }
}
