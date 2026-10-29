import type {SemanticDiff} from './semantic-diff';

export type SemanticReportState =
  | 'clean'
  | 'changed'
  | 'stale'
  | 'missing-baseline'
  | 'invalid-baseline';

export function semanticReportState(
  diff: Pick<SemanticDiff, 'status' | 'current' | 'changes'>,
  currentContentVersion: string,
): SemanticReportState {
  if (diff.status === 'missing-baseline') return 'missing-baseline';
  if (diff.status === 'invalid-baseline') return 'invalid-baseline';
  if (diff.current.contentVersion !== currentContentVersion) return 'stale';
  return diff.changes.length > 0 ? 'changed' : 'clean';
}
