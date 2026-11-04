import { StudioError } from '../../packages/contracts/index.js';
export async function engineCall(config, path, body) {
  let response;
  try { response = await fetch(`http://127.0.0.1:${config.port}${path}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(35000)
  }); } catch { throw new StudioError('ENGINE_OFFLINE', 'El servicio local no está disponible. Reconecta el MCP o abre SASA Premiere Studio.'); }
  const result = await response.json();
  if (!response.ok) throw new StudioError(result.error?.code || 'ENGINE_ERROR', result.error?.message || 'El servicio devolvió un error.');
  return result;
}
