import { cp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { loadConfig } from '../services/local-engine/config.js';
export async function stagePanel(config) {
  const source = fileURLToPath(new URL('../apps/premiere-panel/', import.meta.url));
  const destination = join(config.stateDir, 'panel');
  await mkdir(destination, { recursive: true });
  for (const name of ['manifest.json', 'index.html', 'index.js', 'adapter.js', 'agent-ui.js']) await cp(join(source, name), join(destination, name));
  const manifest = JSON.parse(await readFile(join(destination, 'manifest.json'), 'utf8'));
  manifest.requiredPermissions.network.domains = [`ws://localhost:${config.port}/`, 'ws://localhost/'];
  await writeFile(join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await writeFile(join(destination, 'session.json'), JSON.stringify({ token: config.token, port: config.port }), { mode: 0o600 });
  return join(destination, 'manifest.json');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) console.log(await stagePanel(await loadConfig()));
