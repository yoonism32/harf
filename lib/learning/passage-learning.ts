import {z} from 'zod';
import {parseRef} from '@/lib/content/refs';

const reference = z.string().refine(value => !!parseRef(value), 'Invalid ayah');
export const assessmentSchema = z.object({
 reference, assessment: z.enum(['Understood', 'Partly understood', 'Need another look']),
 obstacle: z.enum(['word', 'construction', 'context', 'none']),
 updatedAt: z.iso.datetime(),
});
export const rangeSchema = z.object({reference, end: z.number().int(), current: z.number().int()}).refine(value => {
 const start = parseRef(value.reference);
 return !!start && value.end >= start.ayah && value.end < start.ayah + 10 && value.current >= start.ayah && value.current <= value.end && !!parseRef(`${start.surah}:${value.end}`);
}, 'Invalid passage range');
export const passageLearningSchema = z.object({
 range: rangeSchema.nullable().default(null),
 assessments: z.array(assessmentSchema).max(200).default([]),
}).refine(value => new Set(value.assessments.map(item => item.reference)).size === value.assessments.length, 'Duplicate assessment');
export type Assessment = z.infer<typeof assessmentSchema>;
export type PassageRange = z.infer<typeof rangeSchema>;
export const obstacleLabels: Record<Assessment['obstacle'], string> = {
 word: 'Unfamiliar word', construction: 'Language construction', context: 'Missing context', none: 'No particular obstacle',
};
export function passageLearning(value: unknown) {
 return passageLearningSchema.parse(value ?? {});
}
