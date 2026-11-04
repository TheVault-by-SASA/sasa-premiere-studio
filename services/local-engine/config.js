import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stateDirectory } from '../../packages/platform/index.js';
import { randomBytes } from 'node:crypto';
import { DEFAULT_PORT } from '../../packages/contracts/index.js';

export function defaultStateDir() {
  return stateDirectory();
}
export async function loadConfig(stateDir = defaultStateDir()) {
  await mkdir(stateDir, { recursive: true });
  const path = join(stateDir, 'connection.json');
  try {
    const config = JSON.parse(await readFile(path, 'utf8'));
    if (!/^[a-f0-9]{64}$/.test(config.token) || !Number.isInteger(config.port) || config.port < 1024 || config.port > 65535) throw new Error('Configuración de conexión inválida.');
    return { ...config, stateDir };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const config = { port: DEFAULT_PORT, token: randomBytes(32).toString('hex') };
    try { await writeFile(path, JSON.stringify(config), { flag: 'wx', mode: 0o600 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; return loadConfig(stateDir); }
    return { ...config, stateDir };
  }
}
