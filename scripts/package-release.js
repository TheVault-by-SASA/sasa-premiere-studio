import { readdir, readFile, mkdir, writeFile, cp, mkdtemp, rm } from 'node:fs/promises';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const sourceDirs = ['apps','services','packages','scripts','tests','docs','.github'];
const sourceFiles = ['package.json','package-lock.json','README.md','INSTALL.md','AGENTS.md','FINDINGS.md',
  'validation-results.json','.gitignore','mcp-client.example.json','Install Windows.cmd','Start macOS.command','Abrir SASA Premiere Studio.cmd'];
export function assertPublishable(path, bytes) {
  if (/^(connection|session|agent-session|auth|mcp-client)\.json(?:\.tmp)?$/i.test(basename(path)) || /(^|\/)\.env(?:\.|$)/.test(path)) throw new Error('Private state in source: ' + path);
  const text = bytes.toString('utf8');
  if (/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-proj-[A-Za-z0-9_-]{20,})\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text)) throw new Error('Potential credential in ' + path);
  if (/\b[A-Z]:[\\/]Users[\\/](?!PUBLIC|YOUR_USER)[^\\/\s"']+/i.test(text)) throw new Error('Developer-specific home path in ' + path);
}
export async function distributionFiles(root) {
  const files = [...sourceFiles];
  async function walk(dir) {
    for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
      const path = dir + '/' + entry.name;
      if (entry.isSymbolicLink()) throw new Error('Symlinks are not distributable: ' + path);
      if (entry.isDirectory()) await walk(path); else files.push(path);
    }
  }
  for (const dir of sourceDirs) await walk(dir);
  for (const path of files) assertPublishable(path, await readFile(join(root, path)));
  return files.sort();
}
export async function packageRelease(root, destination = join(root, 'dist')) {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const files = await distributionFiles(root);
  const staging = await mkdtemp(join(tmpdir(), 'sasa-release-'));
  const folder = `${pkg.name}-${pkg.version}`;
  try {
    const checksums = [];
    for (const file of files) {
      const bytes = await readFile(join(root, file));
      const target = join(staging, folder, file); await mkdir(dirname(target), { recursive: true });
      await cp(join(root, file), target);
      checksums.push(createHash('sha256').update(bytes).digest('hex') + '  ' + file);
    }
    await writeFile(join(staging, folder, 'SOURCE-SHA256SUMS'), checksums.join('\n') + '\n');
    await mkdir(destination, { recursive: true });
    const archive = join(destination, folder + '.tar.gz');
    const result = spawnSync('tar', ['-czf', archive, '-C', staging, folder], { stdio: 'inherit', windowsHide: true });
    if (result.status !== 0) throw new Error('Archive creation failed; install tar.');
    const checksum = createHash('sha256').update(await readFile(archive)).digest('hex') + '  ' + basename(archive) + '\n';
    await writeFile(join(destination, 'SHA256SUMS'), checksum);
    console.log(`Packaged ${files.length} source files: ${archive}`);
    return archive;
  } finally { await rm(staging, { recursive: true, force: true }); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await packageRelease(fileURLToPath(new URL('../', import.meta.url)), process.argv[2] ? resolve(process.argv[2]) : undefined);
}
