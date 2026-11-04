import { loadConfig } from './config.js';
import { createEngine } from './server.js';
const engine = await createEngine(await loadConfig());
console.error(`SASA Premiere Studio: servicio local activo en 127.0.0.1:${engine.port}`);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await engine.close(); process.exit(0); });
