import {it, expect} from 'vitest';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {checkBuildContent} from '../../../scripts/app-build.mjs';
it('permits a matching build and rejects a rotated content version with recovery instructions', () => {
 expect(() => checkBuildContent('a'.repeat(16), 'a'.repeat(16))).not.toThrow();
 expect(() => checkBuildContent('old', 'new')).toThrow('npm run build:app');
 expect(() => checkBuildContent(undefined, undefined)).toThrow('npm run build:app');
});
it('checks the actual startup record before the production server can launch', () => {
 const directory = mkdtempSync(join(tmpdir(),'harf-build-check-'));
 const script = resolve('scripts/app-build.mjs');
 try {
  mkdirSync(join(directory,'public/content'),{recursive:true});
  mkdirSync(join(directory,'.next'));
  writeFileSync(join(directory,'public/content/manifest.json'),JSON.stringify({contentVersion:'a'.repeat(16)}));
  const run = () => spawnSync(process.execPath,[script,'check'],{cwd:directory,encoding:'utf8'});
  const missing = run();
  expect(missing.status).toBe(1);expect(missing.stderr).toContain('no content-version record');
  writeFileSync(join(directory,'.next/harf-content.json'),JSON.stringify({contentVersion:'b'.repeat(16)}));
  const stale = run();
  expect(stale.status).toBe(1);expect(stale.stderr).toContain('npm run build:app');
  writeFileSync(join(directory,'.next/harf-content.json'),JSON.stringify({contentVersion:'a'.repeat(16)}));
  expect(run().status).toBe(0);
 } finally {rmSync(directory,{recursive:true,force:true});}
});
