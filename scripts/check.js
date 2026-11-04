import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
async function walk(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (['node_modules','work','.git'].includes(entry.name)) continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path)); else files.push(path);
  }
  return files;
}
const files = await walk('.'); let checked = 0;
for (const file of files) {
  if (/\.(js|cjs)$/.test(file)) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status) { console.error(result.stderr); process.exit(1); } checked++;
  } else if (file.endsWith('.json')) { JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, '')); checked++; }
}
const manifest = JSON.parse(await readFile('apps/premiere-panel/manifest.json','utf8'));
if (manifest.host.app !== 'premierepro' || manifest.manifestVersion !== 5) throw new Error('Manifest inválido.');
console.log(`${checked} archivos validados (sintaxis y JSON). No sustituye la carga en Premiere.`);
