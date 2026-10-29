import {readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export function checkBuildContent(built, current) {
 if (typeof current !== 'string' || !/^[a-f0-9]{16}$/.test(current) || built !== current) throw Error('The application build and Quran content differ. Stop Harf, run npm run build:app, then npm start.');
}
const readVersion = () => JSON.parse(readFileSync('public/content/manifest.json', 'utf8')).contentVersion;
if (process.argv[1] === fileURLToPath(import.meta.url)) {
 try {
  const current = readVersion();
  if (process.argv[2] === 'build') {
   const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'], {stdio:'inherit'});
   if (result.error) throw result.error;
   if (result.status !== 0) process.exit(result.status ?? 1);
   checkBuildContent(current, readVersion());
   writeFileSync('.next/harf-content.json', JSON.stringify({contentVersion:current}));
  } else {
   let built;
   try {built = JSON.parse(readFileSync('.next/harf-content.json', 'utf8')).contentVersion;}
   catch {throw Error('This build has no content-version record. Run npm run build:app before npm start.');}
   checkBuildContent(built, current);
  }
 } catch (error) {console.error(error.message); process.exitCode = 1;}
}
