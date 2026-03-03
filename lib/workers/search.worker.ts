// Web Worker: Quran verse transliteration search
// Runs off the main thread so the UI stays responsive during the ~50ms scan.
// Streams partial results after every 2,000 verses so the first hits appear fast.

import translitDataRaw from '@/data/transliteration.json';
import { searchVersesStreaming, type TranslitSearchResult } from '@/lib/transliteration-search';

const translitData = translitDataRaw as Record<string, string>;

export interface SearchWorkerRequest {
  id:         number;   // monotonic request ID — stale responses are ignored by main thread
  query:      string;
  maxResults: number;
}

export interface SearchWorkerResponse {
  id:      number;
  type:    'partial' | 'done';
  results: TranslitSearchResult[];
}

self.onmessage = (e: MessageEvent<SearchWorkerRequest>) => {
  const { id, query, maxResults } = e.data;

  let lastPartial: TranslitSearchResult[] = [];

  for (const batch of searchVersesStreaming(query, translitData, 2000, maxResults)) {
    lastPartial = batch;
    self.postMessage({ id, type: 'partial', results: batch } satisfies SearchWorkerResponse);
  }

  // Signal completion (main thread uses this to clear the spinner)
  self.postMessage({ id, type: 'done', results: lastPartial } satisfies SearchWorkerResponse);
};
