import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { stateDirectory } from '../packages/platform/index.js';

if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22+ is required.');
const args = process.argv.slice(2);
if (args.some(a => a !== '--desktop')) throw new Error('Usage: node scripts/setup.js [--desktop]');
const root = fileURLToPath(new URL('../', import.meta.url));
const desktop = args.includes('--desktop');
// Only fixed commands reach cmd.exe; no paths or user input are interpolated.
const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';
const npmArgs = ['ci', '--no-fund', '--no-audit', ...(desktop ? [] : ['--omit=dev'])];
const install = spawnSync(command, process.platform === 'win32' ? ['/d', '/s', '/c', 'npm ' + npmArgs.join(' ')] : npmArgs,
  { cwd: root, stdio: 'inherit', windowsHide: true });
if (install.status !== 0) throw new Error('Dependency installation failed. Check npm access and retry.');
const { loadConfig } = await import('../services/local-engine/config.js');
const { stagePanel } = await import('./stage-panel.js');
const config = await loadConfig();
const manifest = await stagePanel(config);
const clientConfig = { mcpServers: { 'sasa-premiere-studio': {
  command: process.execPath, args: [join(root, 'services', 'mcp-server', 'main.js')],
  env: { SASA_STUDIO_STATE_DIR: config.stateDir }
} } };
await mkdir(config.stateDir, { recursive: true });
const configFile = join(stateDirectory(), 'mcp-client.json');
await writeFile(configFile, JSON.stringify(clientConfig, null, 2) + '\n', { mode: 0o600 });
console.log('Setup complete. Load this panel manifest in Adobe UXP Developer Tools:\n' + manifest);
console.log('Merge this MCP configuration into your agent client (never replace unrelated entries):\n' + configFile);
console.log('Keep this extracted folder in place. Start with npm run engine' + (desktop ? ' or npm start.' : '.'));
