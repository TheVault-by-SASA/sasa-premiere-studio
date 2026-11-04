import { join } from 'node:path';
import { homedir } from 'node:os';

export function stateDirectory(env = process.env, platform = process.platform, home = homedir()) {
  if (env.SASA_STUDIO_STATE_DIR) return env.SASA_STUDIO_STATE_DIR;
  if (platform === 'win32') return join(env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'SASA', 'PremiereStudio');
  if (platform === 'darwin') return join(home, 'Library', 'Application Support', 'SASA', 'PremiereStudio');
  return join(env.XDG_STATE_HOME || join(home, '.local', 'state'), 'sasa', 'premiere-studio');
}
