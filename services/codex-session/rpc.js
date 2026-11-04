import { spawn } from 'node:child_process';
import { access, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { EventEmitter } from 'node:events';

export async function findCodex() {
  if (process.env.SASA_CODEX_EXECUTABLE) { await access(process.env.SASA_CODEX_EXECUTABLE); return process.env.SASA_CODEX_EXECUTABLE; }
  if (process.platform !== 'win32') return 'codex';
  const root = join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'OpenAI', 'Codex', 'bin');
  const candidates = [];
  for (const name of await readdir(root).catch(() => [])) {
    const path = join(root, name, 'codex.exe');
    const info = await stat(path).catch(() => null);
    if (info?.isFile()) candidates.push({ path, time: info.mtimeMs });
  }
  return candidates.sort((a, b) => b.time - a.time)[0]?.path || 'codex';
}

// JSON lines over private stdio. No public app-server port or copied credentials.
export class CodexRpc extends EventEmitter {
  constructor({ executable, cwd, spawnProcess = spawn, timeoutMs = 30000 } = {}) {
    super(); Object.assign(this, { executable, cwd, spawnProcess, timeoutMs });
    this.pending = new Map(); this.nextId = 1; this.child = null; this.starting = null;
  }
  start() {
    if (!this.starting) this.starting = this.launch().catch(async error => { await this.close(); this.starting = null; throw error; });
    return this.starting;
  }
  async launch() {
    const executable = this.executable || await findCodex();
    const child = this.spawnProcess(executable, ['app-server', '--stdio'], { cwd: this.cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child = child;
    let buffer = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      buffer += chunk;
      if (buffer.length > 16 * 1024 * 1024) { child.kill(); return; }
      let end;
      while ((end = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        if (!line.trim()) continue;
        let message;
        try { message = JSON.parse(line); } catch { continue; }
        if (message.method) this.emit(message.id === undefined ? 'notification' : 'request', message);
        else {
          const pending = this.pending.get(message.id);
          if (!pending) continue;
          clearTimeout(pending.timer); this.pending.delete(message.id);
          if (message.error) pending.reject(Object.assign(new Error(message.error.message), { code: 'CODEX_RPC_ERROR' }));
          else pending.resolve(message.result);
        }
      }
    });
    // Drain diagnostics without leaking auth or account data to the panel/logs.
    child.stderr.on('data', () => {});
    child.stdin.on('error', () => {});
    let ended = false;
    const finish = () => {
      if (ended) return; ended = true;
      if (this.child === child) { this.child = null; this.starting = null; }
      for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error('Se cerró la conexión con Codex. Las operaciones en curso pueden haberse aplicado; revisa Premiere antes de repetir.')); }
      this.pending.clear(); this.emit('disconnected');
    };
    child.once('error', finish); child.once('exit', finish);
    await this.call('initialize', { clientInfo: { name: 'sasa_premiere_studio', title: 'SASA Premiere Studio', version: '0.3.0-alpha.1' }, capabilities: {} });
    this.write({ method: 'initialized', params: {} });
  }
  write(message) {
    if (!this.child?.stdin.writable) throw new Error('Codex no está conectado.');
    this.child.stdin.write(JSON.stringify(message) + '\n');
  }
  call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => { this.pending.delete(id); reject(Object.assign(new Error('Codex no respondió a tiempo. No se repetirá la petición automáticamente.'), { code: 'CODEX_TIMEOUT' })); }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { this.write({ id, method, params }); } catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }
  respond(id, result) { this.write({ id, result }); }
  async close() {
    const child = this.child;
    if (!child) return;
    await new Promise(resolve => {
      const timer = setTimeout(() => { child.kill(); resolve(); }, 1500);
      child.once('exit', () => { clearTimeout(timer); resolve(); }); child.stdin.end();
    });
  }
}
