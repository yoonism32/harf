import {parseRef} from '@/lib/content/refs';
import {getDB} from '@/lib/data/db';
import {notifyChange} from '@/lib/data/store';
import type {Note} from '@/lib/data/schema';

export function reflectionId(reference: string) {
 if (!parseRef(reference)) throw Error('Invalid ayah reference');
 return `ayah-${reference.replace(':', '-')}`;
}

export async function saveReflection(reference: string, text: string, expectedUpdatedAt: string | null) {
 const id = reflectionId(reference);
 if (text.length > 1000) throw Error('Use at most 1,000 characters');
 const db = await getDB();
 const tx = db.transaction(['notes', 'meta'], 'readwrite');
 void tx.done.catch(() => undefined);
 const previous = await tx.objectStore('notes').get(id) as Note | undefined;
 if ((previous?.updatedAt ?? null) !== expectedUpdatedAt) {
  tx.abort();
  throw Error('This reflection changed elsewhere. Your draft is still here. Review the saved note before replacing it.');
 }
 const updatedAt = new Date(Math.max(Date.now(), previous ? Date.parse(previous.updatedAt) + 1 : 0)).toISOString();
 await tx.objectStore('notes').put({id, text, updatedAt}, id);
 await tx.objectStore('meta').put(Number(await tx.objectStore('meta').get('revision') ?? 0) + 1, 'revision');
 await tx.done;
 await notifyChange();
}
