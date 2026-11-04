const { entrypoints, host } = require('uxp');
const ppro = require('premierepro');
const { createAdapter } = require('./adapter.js');
const adapter = createAdapter(ppro, host);
const { createAgentUI } = require('./agent-ui.js');
const agentPending = new Map();
let nextAgentId = 0;
const agentUI = createAgentUI(command => new Promise((resolve, reject) => {
  if (!socket || socket.readyState !== 1) { reject(new Error('Conecta Premiere con el servicio local.')); return; }
  const id = 'agent-' + (++nextAgentId);
  const timer = setTimeout(() => { agentPending.delete(id); reject(new Error('La petición sigue sin confirmar. No se repetirá automáticamente.')); }, 45000);
  agentPending.set(id, {resolve,reject,timer});
  socket.send(JSON.stringify({type:'agent.command',id,command}));
}));
let socket = null, reconnectTimer = null, stopped = false, queue = Promise.resolve(), initialized = false;
let settings = { port: 32145, token: '' };
try { settings = require('./session.json'); } catch (_) { /* Manual pairing remains available. */ }
function show(text) { const element = document.getElementById('status'); if (element) element.textContent = text; }
function connectionState(value, closing = false) {
  const button = document.getElementById('connection-toggle');
  const connected = value === 'connected', waiting = value === 'waiting';
  const label = connected ? 'Desconectar · Conectado' : waiting ? 'Cancelar conexión · Conectando…' : 'Conectar · Desconectado';
  button.disabled = closing;
  button.setAttribute('title', label);
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-pressed', String(connected));
  button.style.background = connected ? '#26392d' : 'transparent';
  document.getElementById('connection-icon').style.fill = connected ? '#8bdda5' : waiting ? '#d6ba7d' : '#999999';
}
function connect() {
  stopped = false;
  clearTimeout(reconnectTimer);
  if (socket && (socket.readyState === 0 || socket.readyState === 1)) return;
  const token = String(document.getElementById('token').value || '').trim() || settings.token;
  if (!token) { connectionState('off'); show('Prepara el panel desde la app o pega la clave de conexión.'); return; }
  connectionState('waiting');
  show('Conectando con la app…');
  let ws;
  try { ws = new WebSocket('ws://localhost:' + settings.port + '/premiere'); }
  catch (error) { show('Esperando permisos de red de Adobe. Reintentando…'); reconnectTimer = setTimeout(connect, 5000); return; }
  socket = ws;
  ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', protocol: 1, token,
    host: { app: 'premierepro', version: String(host.version), pluginVersion: '0.3.0-alpha.1', capabilities: adapter.capabilities } }));
  ws.onmessage = event => {
    let message;
    try { message = JSON.parse(event.data); } catch (_) { ws.close(); return; }
    if (message.type === 'welcome') { connectionState('connected'); show('Conectado · Premiere ' + host.version); agentUI.connected(); return; }
    if (message.type === 'agent.state') { agentUI.render(message.state); return; }
    if (message.type === 'agent.result') {
      const pending = agentPending.get(message.id); if (!pending) return;
      clearTimeout(pending.timer); agentPending.delete(message.id);
      if (message.ok) pending.resolve(message.state); else pending.reject(new Error(message.error));
      return;
    }
    if (message.type !== 'request' || typeof message.id !== 'string') return;
    queue = queue.then(async () => {
      // Leave the network event callback before entering host operations.
      await new Promise(resolve => setTimeout(resolve, 50));
      if (ws !== socket || ws.readyState !== 1) return;
      let reply;
      try { reply = { type: 'result', id: message.id, ok: true, result: await adapter.dispatch(message.operation, message.params) }; }
      catch (error) { reply = { type: 'result', id: message.id, ok: false, error: { code: error.code || 'PREMIERE_ERROR', message: String(error.message).slice(0, 2000) } }; }
      if (ws === socket && ws.readyState === 1) ws.send(JSON.stringify(reply));
    }).catch(() => show('Error de conexión. Desconecta y vuelve a conectar.'));
  };
  ws.onerror = () => show('No se pudo conectar. Abre SASA Premiere Studio.');
  ws.onclose = event => {
    if (socket !== ws) return;
    socket = null;
    for (const pending of agentPending.values()) { clearTimeout(pending.timer); pending.reject(new Error('Se perdió la conexión. Consulta el estado antes de repetir una edición.')); }
    agentPending.clear(); agentUI.disconnected();
    if (event.code === 1008) { stopped = true; show('Conexión rechazada. Prepara el panel de nuevo desde la app.'); }
    else show(stopped ? 'Desconectado.' : 'Esperando la app. Reintentando…');
    connectionState(stopped ? 'off' : 'waiting');
    if (!stopped) reconnectTimer = setTimeout(connect, 5000);
  };
}
function disconnect() {
  stopped = true; clearTimeout(reconnectTimer); reconnectTimer = null;
  connectionState('off', !!socket); agentUI.disconnected(); show('Desconectado.');
  if (socket) socket.close();
}
function initialize() {
  if (!initialized) {
    document.getElementById('connection-toggle').addEventListener('click', () => {
      if (!stopped && (socket || reconnectTimer)) disconnect(); else connect();
    });
    agentUI.initialize();
    document.getElementById('detail').textContent = 'Panel 0.3.0-alpha.1 · Codex, modelos y consumo de sesión';
    initialized = true;
  }
  connect();
}
entrypoints.setup({ panels: { 'studio-panel': { show: initialize } }, plugin: { create() {}, destroy: disconnect } });
document.addEventListener('DOMContentLoaded', initialize);
