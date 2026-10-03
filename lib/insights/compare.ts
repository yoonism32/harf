import type { Token } from '@/lib/content/schema';

export function positionsInRanges(ranges: number[][]): Set<number> {
  const positions = new Set<number>();
  for (const range of ranges) {
    const from = range[0];
    const to = range[1] ?? from;
    if (from === undefined || to === undefined || !Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) continue;
    for (let position = from; position <= to; position += 1) positions.add(position);
  }
  return positions;
}

export function wordsInRanges(tokens: Token[], ranges: number[][]): string {
  const positions = positionsInRanges(ranges);
  return tokens
    .filter(token => token.kind === 'word' && positions.has(token.position))
    .map(token => token.arabic)
    .join(' ');
}
