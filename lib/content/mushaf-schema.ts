import {z} from 'zod';
const word = z.object({key:z.string().regex(/^\d+:\d+:\d+$/),glyph:z.string().min(1)});
export const mushafPageSchema = z.object({
 page:z.number().int().min(1).max(604),
 lines:z.array(z.object({number:z.number().int().min(1).max(15),type:z.enum(['ayah','surah_name','basmallah']),centered:z.boolean(),surah:z.number().int().min(1).max(114).nullable(),words:z.array(word)})).min(1).max(15),
});
export const mushafIndexSchema=z.record(z.string().regex(/^\d+:\d+$/),z.number().int().min(1).max(604));
export type MushafPage= z.infer<typeof mushafPageSchema>;
