import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const version = JSON.parse(await readFile('lib/content/version.json', 'utf8')).contentVersion;
const content = join('public', 'content', version);
const limits = [
  [join(content, 'catalog.json'), 100 * 1024],
  [join(content, 'search', 'arabic.json'), 1024 * 1024],
  [join(content, 'search', 'english.json'), 1024 * 1024],
  [join(content, 'search', 'transliteration.json'), 1024 * 1024],
];
for (const [file, limit] of limits) {
  const size = gzipSync(await readFile(file)).byteLength;
  if (size > limit) throw new Error(`${file} is ${size} gzip bytes; limit is ${limit}`);
}

const appRoot = join('.next', 'static', 'chunks', 'app');
const routeLimits = [
  [join(appRoot, '(main)', 'today'), 100 * 1024],
  [join(appRoot, '(main)', 'learn'), 100 * 1024],
  [join(appRoot, '(focus)', 'study'), 150 * 1024],
];
for (const [directory, limit] of routeLimits) {
  const files = (await readdir(directory, { recursive: true })).filter(file => file.endsWith('.js'));
  const size = (await Promise.all(files.map(file => readFile(join(directory, file)))))
    .reduce((total, file) => total + gzipSync(file).byteLength, 0);
  if (size > limit) throw new Error(`${directory} is ${size} route-specific gzip bytes; limit is ${limit}`);
}
console.log('Content and route-specific JavaScript budgets passed.');
