import {z} from 'zod';
import {parseRef} from '../content/refs';
import {fsrsSchema,instant} from '../data/schema';
export function passageId(a:string,b:string){
 if(!parseRef(a)||!parseRef(b)||a===b)throw Error('Invalid passage pair');
 return [a,b].sort((x,y)=>{const p=parseRef(x)!,q=parseRef(y)!;return p.surah-q.surah||p.ayah-q.ayah;}).join('|');
}
const reference=z.string().refine(v=>!!parseRef(v));
export const passageCardSchema=z.object({id:z.string().max(40),verseA:reference,verseB:reference,contentVersion:z.string().max(100),card:fsrsSchema,revision:z.number().int().nonnegative(),paused:z.boolean()}).refine(v=>v.verseA!==v.verseB&&v.id===passageId(v.verseA,v.verseB),'Invalid passage identity');
export type PassageCard=z.infer<typeof passageCardSchema>;
export function duePassageCards(cards:PassageCard[],now=new Date()){
 return cards.filter(card=>!card.paused&&Date.parse(card.card.due)<=now.getTime()).sort((a,b)=>Date.parse(a.card.due)-Date.parse(b.card.due));
}
export const passageReviewSchema=z.object({id:z.string().min(1).max(100),attemptId:z.string().min(1).max(100),pairId:z.string().max(40),timestamp:instant,localDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),timeZone:z.string().max(100),grade:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]),before:passageCardSchema,after:passageCardSchema,undone:z.boolean()}).refine(v=>v.pairId===v.before.id&&v.pairId===v.after.id,'Review identity mismatch');
export type PassageReview=z.infer<typeof passageReviewSchema>;
