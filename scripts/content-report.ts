import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {z} from 'zod';
import {ayahSchema, catalogSchema, overlapSchema} from '../lib/content/schema';
import {
  buildSemanticDiff,
  buildSemanticSnapshot,
  invalidSemanticBaseline,
  missingSemanticBaseline,
  type SemanticBaseline,
  type SemanticDiff,
  type SemanticSnapshot,
} from '../lib/content/semantic-diff';
import {semanticBaselineSchema, semanticDiffSchema} from '../lib/content/semantic-report-schema';

const root = process.cwd();
const baselinePath = 'data/content-baseline.json';
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const json = (path: string) => JSON.parse(read(path));
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const write = (path: string, value: unknown) => writeFileSync(join(root, path), JSON.stringify(value));

type CompiledContent = {
  version: string;
  catalog: z.infer<typeof catalogSchema>;
  ayahs: z.infer<typeof ayahSchema>[];
  overlap: z.infer<typeof overlapSchema>;
};

export function readCompiledContent(): CompiledContent {
  const pointer = z
    .object({contentVersion: z.string().regex(/^[a-f0-9]{16}$/), releaseReady: z.boolean()})
    .parse(json('public/content/manifest.json'));
  const base = `public/content/${pointer.contentVersion}`;
  const manifest = z
    .object({contentVersion: z.string(), files: z.record(z.string(), z.string())})
    .parse(json(`${base}/manifest.json`));
  const catalog = catalogSchema.parse(json(`${base}/catalog.json`));
  if (manifest.contentVersion !== pointer.contentVersion || catalog.contentVersion !== pointer.contentVersion) {
    throw new Error('Compiled content version mismatch');
  }
  for (const path of [
    'catalog.json',
    'overlap.json',
    ...catalog.surahs.map(surah => `surahs/${surah.number}.json`),
  ]) {
    const expected = manifest.files[path];
    if (!expected) throw new Error(`Missing compiled output checksum: ${path}`);
    if (hash(readFileSync(join(root, base, path))) !== expected) {
      throw new Error(`Compiled output checksum mismatch: ${path}`);
    }
  }
  const ayahs = catalog.surahs.flatMap(surah =>
    z.array(ayahSchema).parse(json(`${base}/surahs/${surah.number}.json`)),
  );
  const overlap = overlapSchema.parse(json(`${base}/overlap.json`));
  return {version: pointer.contentVersion, catalog, ayahs, overlap};
}

function baselinePayload(snapshot: SemanticSnapshot): SemanticSnapshot {
  return {
    contentVersion: snapshot.contentVersion,
    approvalCounts: snapshot.approvalCounts,
    entries: snapshot.entries,
    ayahs: snapshot.ayahs,
  };
}

function baselineDigest(snapshot: SemanticSnapshot) {
  return hash(JSON.stringify(baselinePayload(snapshot)));
}

export function writeSemanticBaseline(content = readCompiledContent()): SemanticBaseline {
  const snapshot = buildSemanticSnapshot(content);
  const incompleteApproval = snapshot.entries.filter(
    entry =>
      entry.approval.status === 'approved' &&
      !(entry.approval.reviewer && entry.approval.reviewedAt && entry.approval.evidence),
  );
  if (!content.catalog.releaseReady || snapshot.approvalCounts.pending > 0 || incompleteApproval.length > 0) {
    throw new Error(
      'Cannot record an approved semantic baseline while the catalog is not release-ready, entries remain unapproved, or approval evidence is incomplete.',
    );
  }
  const baseline: SemanticBaseline = {
    schemaVersion: 1,
    kind: 'harf-semantic-baseline',
    ...baselinePayload(snapshot),
    digest: baselineDigest(snapshot),
  };
  write(baselinePath, baseline);
  return baseline;
}

type BaselineLoad =
  | {status: 'ok'; baseline: SemanticBaseline}
  | {status: 'missing'}
  | {status: 'invalid'; message: string};

function loadBaseline(): BaselineLoad {
  if (!existsSync(join(root, baselinePath))) return {status: 'missing'};
  try {
    const parsed = semanticBaselineSchema.parse(json(baselinePath));
    const snapshot: SemanticSnapshot = {
      contentVersion: parsed.contentVersion,
      approvalCounts: parsed.approvalCounts,
      entries: parsed.entries,
      ayahs: parsed.ayahs,
    };
    if (baselineDigest(snapshot) !== parsed.digest) {
      return {status: 'invalid', message: 'The baseline digest does not match its contents.'};
    }
    return {status: 'ok', baseline: {...snapshot, schemaVersion: 1, kind: 'harf-semantic-baseline', digest: parsed.digest}};
  } catch (error) {
    return {
      status: 'invalid',
      message: `The baseline manifest could not be read: ${
        error instanceof Error ? error.message : 'invalid JSON'
      }`,
    };
  }
}

export function buildSemanticReport(content = readCompiledContent()): SemanticDiff {
  const current = buildSemanticSnapshot(content);
  const loaded = loadBaseline();
  if (loaded.status === 'missing') return missingSemanticBaseline(current);
  if (loaded.status === 'invalid') return invalidSemanticBaseline(current, loaded.message);
  return buildSemanticDiff({baseline: loaded.baseline, current});
}

export function writeSemanticReport(content = readCompiledContent()): SemanticDiff {
  const report = semanticDiffSchema.parse(buildSemanticReport(content));
  write(`public/content/${content.version}/semantic-diff.json`, report);
  return report as SemanticDiff;
}

function print(report: SemanticDiff) {
  console.log(
    JSON.stringify(
      {
        status: report.status,
        message: report.message,
        baseline: report.baseline?.contentVersion ?? null,
        current: report.current.contentVersion,
        counts: report.counts,
        changes: report.changes.slice(0, 20),
        moreChanges: Math.max(0, report.changes.length - 20),
      },
      null,
      2,
    ),
  );
}

function main() {
  if (process.argv.includes('--write-report')) {
    const report = writeSemanticReport();
    print(report);
    if (report.status !== 'ok') process.exitCode = 1;
    return;
  }
  if (process.argv.includes('--write-baseline')) {
    const baseline = writeSemanticBaseline();
    console.log(
      JSON.stringify(
        {
          baseline: baselinePath,
          contentVersion: baseline.contentVersion,
          digest: baseline.digest,
          entries: baseline.entries.length,
          ayahs: baseline.ayahs.length,
          approvalCounts: baseline.approvalCounts,
        },
        null,
        2,
      ),
    );
    return;
  }
  const report = buildSemanticReport();
  print(report);
  if (report.status !== 'ok' || report.counts.total > 0) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
