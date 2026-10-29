import {parseRef} from '@/lib/content/refs';

const reflectionPattern = /^ayah-(\d{1,3})-(\d{1,3})$/;

export function reflectionId(reference: string) {
  if (!parseRef(reference)) throw Error('Invalid ayah reference');
  return `ayah-${reference.replace(':', '-')}`;
}

/** The canonical ayah reference for an ayah reflection note id, or null. */
export function reflectionReference(id: string): string | null {
  const match = reflectionPattern.exec(id);
  if (!match) return null;
  const reference = `${match[1]}:${match[2]}`;
  return parseRef(reference) ? reference : null;
}

export function isReflectionId(id: string): boolean {
  return reflectionReference(id) !== null;
}
