import { randomUUID, timingSafeEqual } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { helloSchema, replySchema, StudioError, VERSION } from '../../packages/contracts/index.js';

export function tokenMatches(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class PremiereBridge {
  constructor(token, { timeoutMs = 20000 } = {}) {
    this.token = token; this.timeoutMs = timeoutMs; this.peer = null; this.host = null;
    this.pending = new Map();
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 2 * 1024 * 1024 });
    this.wss.on('connection', ws => this.accept(ws));
    this.heartbeat = setInterval(() => {
      for (const ws of this.wss.clients) {
        if (ws.alive === false) { ws.terminate(); continue; }
        ws.alive = false; ws.ping();
      }
    }, 15000);
    this.heartbeat.unref();
  }
  accept(ws) {
    ws.alive = true;
    ws.on('pong', () => { ws.alive = true; });
    const deadline = setTimeout(() => ws.close(1008, 'Authentication timeout'), 5000);
    ws.on('error', () => {});
    ws.on('message', data => {
      let message;
      try { message = JSON.parse(data.toString()); } catch { ws.close(1008, 'Invalid JSON'); return; }
      if (!ws.authenticated) {
        const parsed = helloSchema.safeParse(message);
        if (!parsed.success || !tokenMatches(parsed.data.token, this.token)) { ws.close(1008, 'Invalid handshake'); return; }
        if (this.peer && this.peer !== ws) { ws.close(1008, 'Host already connected'); return; }
        clearTimeout(deadline); ws.authenticated = true;
        this.peer = ws; this.host = { ...parsed.data.host, connectedAt: new Date().toISOString() };
        ws.send(JSON.stringify({ type: 'welcome', protocol: 1, version: VERSION }));
        return;
      }
      if (message.type === 'agent.command' && typeof message.id === 'string' && message.id.length <= 100 && this.agentCommand) {
        if ((ws.agentPending || 0) >= 4) { ws.send(JSON.stringify({type:'agent.result',id:message.id,ok:false,error:'Hay peticiones pendientes. Espera unos segundos.'})); return; }
        ws.agentSubscribed = true; ws.agentPending = (ws.agentPending || 0) + 1;
        Promise.resolve().then(() => this.agentCommand(message.command)).then(
          state => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({type:'agent.result',id:message.id,ok:true,state})); },
          error => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({type:'agent.result',id:message.id,ok:false,error:String(error.message).slice(0,2000)})); }
        ).finally(() => { ws.agentPending--; });
        return;
      }
      const parsed = replySchema.safeParse(message);
      if (!parsed.success) { ws.close(1008, 'Invalid result'); return; }
      const reply = parsed.data, request = this.pending.get(reply.id);
      if (!request || request.peer !== ws) return;
      clearTimeout(request.timer); this.pending.delete(reply.id);
      if (reply.ok) request.resolve(reply.result);
      else request.reject(new StudioError(reply.error.code, reply.error.message));
    });
    ws.on('close', () => {
      clearTimeout(deadline);
      if (this.peer !== ws) return;
      this.peer = null; this.host = null;
      for (const [id, request] of this.pending) {
        clearTimeout(request.timer); this.pending.delete(id);
        request.reject(new StudioError('HOST_DISCONNECTED', 'Premiere se desconectó durante la consulta. Vuelve a conectar el panel.'));
      }
    });
  }
  status() { return { connected: this.peer?.readyState === WebSocket.OPEN, host: this.host }; }
  publishAgent(state) {
    if (this.peer?.agentSubscribed && this.peer.readyState === WebSocket.OPEN) this.peer.send(JSON.stringify({type:'agent.state',state}));
  }
  request(operation, params = {}) {
    const peer = this.peer;
    if (!peer || peer.readyState !== WebSocket.OPEN) return Promise.reject(new StudioError('HOST_OFFLINE', 'Abre Premiere y conecta el panel SASA Premiere Studio.'));
    if (!this.host.capabilities.includes(operation)) return Promise.reject(new StudioError('UNSUPPORTED_OPERATION', 'Esta versión del panel no admite la operación.'));
    if (this.pending.size >= 4) return Promise.reject(new StudioError('BUSY', 'Hay consultas en curso. Espera a que terminen.'));
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new StudioError('HOST_TIMEOUT', ['demo.create','sequence.trimVideoEnd','project.save'].includes(operation) ? 'Premiere no respondió a tiempo. La operación puede haberse aplicado; consulta el proyecto antes de repetir.' : 'Premiere no respondió a tiempo; la consulta no se ha completado.'));
      }, this.timeoutMs);
      this.pending.set(id, { peer, resolve, reject, timer });
      peer.send(JSON.stringify({ type: 'request', id, operation, params }), error => {
        if (!error || !this.pending.has(id)) return;
        clearTimeout(timer); this.pending.delete(id); reject(new StudioError('SEND_FAILED', 'No se pudo enviar la consulta a Premiere.'));
      });
    });
  }
  async close() {
    clearInterval(this.heartbeat);
    for (const request of this.pending.values()) {
      clearTimeout(request.timer); request.reject(new StudioError('ENGINE_STOPPED', 'El servicio se cerró.'));
    }
    this.pending.clear();
    for (const ws of this.wss.clients) ws.terminate();
    await new Promise(resolve => this.wss.close(resolve));
  }
}
