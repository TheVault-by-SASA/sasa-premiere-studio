import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { findCodex } from '../services/codex-session/rpc.js';
import { stateDirectory } from '../packages/platform/index.js';
const require = createRequire(import.meta.url);
let failed = false;
const report = (ok, label, required = true) => {
  console.log(`${ok ? 'OK' : required ? 'FAIL' : 'OPTIONAL'}: ${label}`);
  if (!ok && required) failed = true;
};
report(Number(process.versions.node.split('.')[0]) >= 22, 'Node.js 22+');
for (const name of ['ws','zod','@modelcontextprotocol/sdk/server/mcp.js']) {
  let ok = true; try { require.resolve(name); } catch { ok = false; }
  report(ok, 'Dependency: ' + name);
}
for (const [binary, args, label, required] of [
  [process.env.SASA_FFPROBE || 'ffprobe', ['-version'], 'FFprobe for media analysis', false],
  ['ffmpeg', ['-version'], 'FFmpeg for synthetic demo and media tests', false],
  [await findCodex(), ['app-server','--help'], 'Codex App Server (required for panel chat only)', process.argv.includes('--codex')]
]) {
  const result = spawnSync(binary, args, { encoding: 'utf8', timeout: 15000, windowsHide: true });
  report(result.status === 0, label, required);
}
console.log('Private state directory: ' + stateDirectory());
console.log('Manual check: Premiere 25.6+, UXP Developer Tools 2.2+, developer mode, staged panel loaded.');
console.log('No model requests, project edits, or credential reads were performed.');
process.exitCode = failed ? 1 : 0;
