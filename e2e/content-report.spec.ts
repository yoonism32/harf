import {test, expect, type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({serviceWorkers: 'block'});

test.beforeEach(async ({page}) => {
  await page.goto('/offline.html');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('harf');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
});

async function openReport(page: Page) {
  await page.goto('/progress');
  await expect(page.getByRole('heading', {name: 'What you’ve practiced'})).toBeVisible();
  await page.getByText('Content report', {exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Semantic content baseline report'})).toBeVisible();
  return page.locator('.content-report');
}

async function readExpected(page: Page) {
  return page.evaluate(async () => {
    const pointer = await (await fetch('/content/manifest.json')).json();
    const base = `/content/${pointer.contentVersion}`;
    const [catalog, overlap, semantic] = await Promise.all([
      fetch(`${base}/catalog.json`).then(response => response.json()),
      fetch(`${base}/overlap.json`).then(response => response.json()),
      fetch(`${base}/semantic-diff.json`).then(response => response.json()),
    ]);
    const rootCounts = new Map<string, number>();
    for (const entry of catalog.entries) {
      if (entry.root) rootCounts.set(entry.root, (rootCounts.get(entry.root) ?? 0) + 1);
    }
    const sourceGroups = new Set(
      catalog.entries.map((entry: {sourceIds: string[]}) =>
        [...entry.sourceIds].sort().join('|') || 'none',
      ),
    );
    const approved = catalog.entries.filter(
      (entry: {approval: {status: string}}) => entry.approval.status === 'approved',
    );
    return {
      version: pointer.contentVersion,
      entryCount: catalog.entries.length.toLocaleString(),
      approvedText: approved.length.toLocaleString(),
      coursePositions: Object.values(overlap.entries)
        .flat()
        .length.toLocaleString(),
      totalWords: overlap.totalWords.toLocaleString(),
      rooted: catalog.entries.filter((entry: {root: string | null}) => entry.root).length.toLocaleString(),
      rootless: catalog.entries.filter((entry: {root: string | null}) => !entry.root).length.toLocaleString(),
      distinctRoots: rootCounts.size.toLocaleString(),
      sharedRoots: [...rootCounts.values()].filter(count => count > 1).length.toLocaleString(),
      examples3: catalog.entries.filter((entry: {exampleKeys: string[]}) => entry.exampleKeys.length === 3)
        .length.toLocaleString(),
      sourceGroupCount: sourceGroups.size,
      reviewer: approved[0].approval.reviewer,
      reviewedAt: approved[0].approval.reviewedAt,
      semanticStatus: semantic.status,
      baselineVersion: semantic.baseline?.contentVersion,
      baselineApproved: semantic.baseline?.approvedEntries.toLocaleString(),
      semanticCounts: semantic.counts,
    };
  });
}

test('reports the stored semantic baseline and numbers that match the catalog', async ({page}) => {
  const report = await openReport(page);
  const expected = await readExpected(page);
  expect(expected.semanticStatus).toBe('ok');
  expect(expected.semanticCounts.total).toBe(0);

  await expect(report.getByText(`Content version ${expected.version}`, {exact: false})).toBeVisible();
  await expect(report.getByRole('heading', {name: 'Semantic change set'})).toBeVisible();
  await expect(
    report.getByText('No semantic changes against the approved baseline.', {exact: false}),
  ).toBeVisible();
  await expect(report.getByText(`Baseline ${expected.baselineVersion}`, {exact: false})).toBeVisible();
  await expect(
    report.getByText(`${expected.baselineApproved} entries with a stored approved record`, {
      exact: false,
    }),
  ).toBeVisible();

  const stats = report.locator('.stats-grid > div');
  await expect(stats.filter({hasText: 'Course entries'}).locator('strong')).toHaveText(expected.entryCount);
  await expect(stats.filter({hasText: 'Approved entries'}).locator('strong')).toHaveText(
    `${expected.approvedText} / ${expected.entryCount}`,
  );
  await expect(stats.filter({hasText: 'Course word positions'}).locator('strong')).toHaveText(
    expected.coursePositions,
  );
  await expect(stats.filter({hasText: 'Course word positions'}).locator('small')).toContainText(
    expected.totalWords,
  );
  await expect(stats.filter({hasText: 'Release ready'}).locator('strong')).toHaveText('Yes');

  const approval = report.getByRole('table', {name: 'Approval records by status'});
  const approvedRow = approval.locator('tbody tr').filter({hasText: 'Approved'});
  await expect(approvedRow).toContainText(expected.approvedText);
  await expect(approvedRow).toContainText(expected.reviewer);
  await expect(approvedRow).toContainText(expected.reviewedAt);

  const sources = report.getByRole('table', {name: 'Source bundles'});
  await expect(sources.locator('tbody tr')).toHaveCount(expected.sourceGroupCount);
  await expect(sources.locator('tbody tr').first()).toContainText(expected.entryCount);
  await expect(sources.locator('tbody tr').first()).toContainText(expected.coursePositions);

  const roots = report.getByText(/rooted ·/);
  await expect(roots).toContainText(`${expected.rooted} rooted`);
  await expect(roots).toContainText(`${expected.rootless} rootless`);
  await expect(roots).toContainText(`${expected.distinctRoots} distinct roots`);
  await expect(roots).toContainText(`${expected.sharedRoots} shared`);

  await expect(report.getByText(/Examples per entry/)).toContainText(`3 — ${expected.examples3}`);
  await expect(report.getByText('No findings in this baseline.', {exact: false})).toBeVisible();
  await expect(report.locator('.content-report-finding')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(await report.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect((await new AxeBuilder({page}).include('.content-report').analyze()).violations).toEqual([]);
});

test('states plainly when the baseline has nothing to report', async ({page}) => {
  const report = await openReport(page);

  await expect(
    report.getByText('No semantic changes against the approved baseline.', {exact: false}),
  ).toBeVisible();
  await expect(
    report.getByText('0 vocabulary cards · 0 active vocabulary review events.', {exact: false}),
  ).toBeVisible();
  await expect(
    report.getByText('No stored vocabulary card or active review refers to a missing catalog entry.'),
  ).toBeVisible();
  await expect(
    report.getByText('No findings in this baseline. The catalog matches its stored approval', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(report.locator('.content-report-finding')).toHaveCount(0);
});

test('does not read a missing semantic report as a clean diff', async ({page}) => {
  await page.route('**/semantic-diff.json', route =>
    route.fulfill({status: 404, contentType: 'application/json', body: '{}'}),
  );
  const report = await openReport(page);

  await expect(
    report.getByText('No semantic change report is stored for this content version.', {exact: false}),
  ).toBeVisible();
  await expect(report.getByText('This is not a clean diff.', {exact: false})).toBeVisible();
});

test('renders the populated semantic change set with citations', async ({page}) => {
  await page.route('**/semantic-diff.json', async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.status = 'ok';
    body.message = '3 semantic changes against the approved baseline.';
    body.counts = {added: 1, removed: 0, rekeyed: 1, changed: 1, total: 3};
    body.changes = [
      {
        kind: 'changed',
        scope: 'entry',
        field: 'gloss',
        entryId: 'l-0000000000000001',
        before: 'from',
        after: 'in',
        citation: 'Al-Fatihah 1:1 word 1 · مِن',
      },
      {
        kind: 'rekeyed',
        scope: 'entry',
        previousEntryId: 'l-0000000000000002',
        entryId: 'l-0000000000000003',
        before: 'l-0000000000000002',
        after: 'l-0000000000000003',
        citation: 'Al-Baqarah 2:3 word 1 · قَالَ',
      },
      {
        kind: 'added',
        scope: 'entry',
        entryId: 'l-0000000000000004',
        after: 'كَانَ · he was',
        citation: 'Al-Fatihah 1:2 word 1 · كَانَ',
      },
    ];
    await route.fulfill({response, json: body});
  });
  const report = await openReport(page);

  await expect(report.getByText('3 changes', {exact: false})).toBeVisible();
  const table = report.getByRole('table', {
    name: 'Semantic changes against the approved baseline',
  });
  await expect(table.locator('tbody tr')).toHaveCount(3);
  await expect(table.getByText('Al-Fatihah 1:1 word 1 · مِن')).toBeVisible();
  await expect(table.getByText('Gloss')).toBeVisible();
  await expect(table.getByText('Re-keyed')).toBeVisible();
  await expect(table.getByText('Added')).toBeVisible();
});

test('states plainly when the approved baseline manifest is missing', async ({page}) => {
  await page.route('**/semantic-diff.json', async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.status = 'missing-baseline';
    body.message =
      'No approved baseline manifest is stored for this build, so no semantic change set is claimed.';
    body.baseline = null;
    body.counts = {added: 0, removed: 0, rekeyed: 0, changed: 0, total: 0};
    body.changes = [];
    await route.fulfill({response, json: body});
  });
  const report = await openReport(page);

  await expect(
    report.getByText('No approved baseline manifest is stored for this build', {exact: false}),
  ).toBeVisible();
  await expect(report.getByText('This is not a clean diff.', {exact: false})).toBeVisible();
});

test('marks a semantic report generated for another content version as stale', async ({page}) => {
  await page.route('**/semantic-diff.json', async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.current.contentVersion = 'ffffffffffffffff';
    await route.fulfill({response, json: body});
  });
  const report = await openReport(page);

  await expect(report.getByText('The change set is stale and is not shown as current.', {exact: false})).toBeVisible();
  await expect(
    report.getByText('No semantic changes against the approved baseline.', {exact: false}),
  ).toHaveCount(0);
});

test('reports stored cards and active reviews that no longer map to the catalog', async ({page}) => {
  await page.goto('/progress');
  await expect(page.getByRole('heading', {name: 'What you’ve practiced'})).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('harf', 3);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const card = {
      id: 'vocabulary:missing-entry',
      entryId: 'missing-entry',
      collection: 'vocabulary',
      card: {
        due: '2026-10-29T00:00:00.000Z',
        stability: 4,
        difficulty: 5,
        elapsed_days: 1,
        scheduled_days: 2,
        learning_steps: 0,
        reps: 3,
        lapses: 0,
        state: 2,
        last_review: '2026-10-28T10:00:00.000Z',
      },
      paused: false,
      contentVersion: 'test',
      revision: 1,
    };
    const review = {
      id: 'review-missing',
      attemptId: 'attempt-missing',
      cardId: card.id,
      sessionId: 'seed',
      timestamp: '2026-10-28T10:00:00.000Z',
      localDate: '2026-10-28',
      timeZone: 'UTC',
      grade: 3,
      before: null,
      after: card,
      undone: false,
    };
    const transaction = db.transaction(['cards', 'reviews'], 'readwrite');
    transaction.objectStore('cards').put(card, card.id);
    transaction.objectStore('reviews').put(review, review.id);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole('heading', {name: 'What you’ve practiced'})).toBeVisible();
  await page.getByText('Content report', {exact: true}).click();

  const report = page.locator('.content-report');
  await expect(report.getByText('1 vocabulary card · 1 active vocabulary review event.', {exact: false})).toBeVisible();
  await expect(report.getByText('Stored study records are orphaned')).toBeVisible();
  await expect(report.getByText(/1 card and 1 active review refer to 1 entry missing/)).toBeVisible();
  await expect(report.locator('.content-report-finding').getByText(/They were not remapped\./)).toBeVisible();
  await expect(report.locator('.content-report-finding')).toHaveCount(1);
  await expect(report.locator('.content-report-finding .badge')).toHaveText('2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
