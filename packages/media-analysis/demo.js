import { mkdir, mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
const run = promisify(execFile);

export async function prepareDemo() {
  const root = process.env.SASA_STUDIO_DEMO_DIR ? resolve(process.env.SASA_STUDIO_DEMO_DIR) : join(homedir(), 'Documents', 'Codex', 'PremiereStudio', 'demos');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'sasa-demo-'));
  const mediaPath = join(directory, 'SASA-test-6s.mp4');
  await run('ffmpeg', ['-hide_banner','-loglevel','error','-n','-f','lavfi','-i',
    'testsrc2=size=640x360:rate=24:duration=6','-c:v','libx264','-pix_fmt','yuv420p',mediaPath],
    { windowsHide: true, timeout: 30000, maxBuffer: 1024*1024 });
  return { projectPath: join(directory, 'SASA-Prueba-MCP.prproj'), mediaPath };
}
