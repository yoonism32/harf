import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const svg = await readFile(new URL('../public/icons/icon.svg', import.meta.url));
const output = name => fileURLToPath(new URL(`../public/icons/${name}`, import.meta.url));
await Promise.all([
  sharp(svg).resize(192, 192).png().toFile(output('icon-192.png')),
  sharp(svg).resize(512, 512).png().toFile(output('icon-512.png')),
  sharp(svg).resize(410, 410).extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#F6F3EC' }).png().toFile(output('icon-maskable.png')),
]);
