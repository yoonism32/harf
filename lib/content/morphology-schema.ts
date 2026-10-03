import {z} from 'zod';
export const wordKeySchema=z.string().regex(/^\d+:\d+:\d+$/);
export const grammarSegmentSchema=z.object({arabic:z.string(),tag:z.string(),features:z.array(z.string())});
export const wordDetailSchema=z.object({
 key:wordKeySchema,sourceKey:wordKeySchema,canonicalKeys:z.array(wordKeySchema).min(1),
 sourceArabic:z.string().min(1),segments:z.array(grammarSegmentSchema).min(1),
 audioPath:z.string().regex(/^wbw\/\d{3}_\d{3}_\d{3}\.mp3$/).nullable(),
 rootId:z.string().regex(/^r-[a-f0-9]{16}$/).nullable(),
});
export const morphologySchema=z.record(wordKeySchema,wordDetailSchema);
export const rootFamilySchema=z.object({
 id:z.string().regex(/^r-[a-f0-9]{16}$/),root:z.string().min(1),
 occurrences:z.array(z.object({key:wordKeySchema,arabic:z.string(),gloss:z.string(),lemma:z.string().nullable(),entryId:z.string().nullable()})),
 notes:z.array(z.object({legacyId:z.string(),summary:z.string().nullable(),summaryKeys:z.array(wordKeySchema),verbForms:z.record(z.string(),z.string())})),
});
export type WordDetail=z.infer<typeof wordDetailSchema>;
export type GrammarSegment=z.infer<typeof grammarSegmentSchema>;
export type RootFamily=z.infer<typeof rootFamilySchema>;
