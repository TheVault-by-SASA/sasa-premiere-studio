import http from 'node:http';
import { PremiereBridge, tokenMatches } from './bridge.js';
import { operationSchema, errorBody, VERSION } from '../../packages/contracts/index.js';
import { probeMedia } from '../../packages/media-analysis/probe.js';
import { prepareDemo } from '../../packages/media-analysis/demo.js';
import { CodexSession } from '../codex-session/session.js';
import { defaultStateDir } from './config.js';

export async function createEngine({ token, port = 32145, timeoutMs = 20000, stateDir = defaultStateDir(), sessionFactory = options => new CodexSession(options) }) {
  const bridge = new PremiereBridge(token, { timeoutMs });
  let agent;
  const session = () => {
    if (!agent) {
      agent = sessionFactory({ stateDir });
      agent.on('state', state => bridge.publishAgent(state));
    }
    return agent;
  };
  bridge.agentCommand = command => session().command(command);
  const history = [];
  const status = () => ({ app: 'sasa-premiere-studio', version: VERSION, phase: 'editing-preview',
    ...bridge.status(), history: [...history] });
  function record(operation, ok, code) {
    history.unshift({ operation, ok, code, time: new Date().toISOString() }); history.splice(40);
  }
  const server = http.createServer(async (req, res) => {
    const send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(body)); };
    if (req.headers.host !== `127.0.0.1:${server.address().port}` || req.headers.origin) return send(403, { error: { code: 'FORBIDDEN', message: 'Acceso local exclusivamente.' } });
    if (!tokenMatches(req.headers.authorization, `Bearer ${token}`)) return send(401, { error: { code: 'UNAUTHORIZED', message: 'Conexión no autorizada.' } });
    if (req.method === 'GET' && req.url === '/status') return send(200, status());
    if (req.method === 'GET' && req.url === '/agent') return send(200, session().snapshot());
    if (req.method !== 'POST' || !['/operations','/agent'].includes(req.url)) return send(404, { error: { code: 'NOT_FOUND', message: 'Ruta no disponible.' } });
    if (!(req.headers['content-type'] || '').startsWith('application/json')) return send(415, { error: { code: 'INVALID_CONTENT_TYPE', message: 'Se requiere JSON.' } });
    let raw = '';
    try {
      for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > (req.url === '/agent' ? 65536 : 16384)) { send(413, { error: { code: 'TOO_LARGE', message: 'Solicitud demasiado grande.' } }); return; } }
      if (req.url === '/agent') {
        const command = JSON.parse(raw);
        try { return send(200, { ok: true, result: await session().command(command) }); }
        catch (error) { return send(422, { ok: false, error: errorBody(error) }); }
      }
      const parsed = operationSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return send(400, { error: { code: 'INVALID_OPERATION', message: 'Operación o parámetros inválidos.' } });
      const { operation, params } = parsed.data;
      try {
        let result;
        if (operation === 'media.probe') result = await probeMedia(params.path);
        else if (operation === 'demo.create') {
          if (!bridge.status().connected) throw Object.assign(new Error('Conecta Premiere antes de crear la prueba.'), { code: 'HOST_OFFLINE' });
          result = await bridge.request(operation, await prepareDemo());
        } else result = await bridge.request(operation, params);
        record(operation, true); return send(200, { ok: true, result });
      } catch (error) { record(operation, false, error.code); return send(422, { ok: false, error: errorBody(error) }); }
    } catch { return send(400, { error: { code: 'INVALID_JSON', message: 'Solicitud JSON inválida.' } }); }
  });
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/premiere' || ![`127.0.0.1:${server.address().port}`, `localhost:${server.address().port}`].includes(req.headers.host) ||
        (req.headers.origin && !['null', 'file://', 'uxp://'].includes(req.headers.origin))) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); socket.destroy(); return;
    }
    bridge.wss.handleUpgrade(req, socket, head, ws => bridge.wss.emit('connection', ws, req));
  });
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  } catch (error) { await bridge.close(); throw error; }
  return { port: server.address().port, bridge, status, async close() {
    if (agent) await agent.close();
    await bridge.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  } };
}
