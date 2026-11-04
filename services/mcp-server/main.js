import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadConfig } from '../local-engine/config.js';
import { engineCall } from '../local-engine/client.js';
import { engineLifecycle } from '../local-engine/ensure.js';
import { errorBody, VERSION, trimInput } from '../../packages/contracts/index.js';

const config = await loadConfig();
const lifecycle = engineLifecycle(config);
await lifecycle.ensure();
const server = new McpServer({ name: 'sasa-premiere-studio', version: VERSION });
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
function register(name, description, inputSchema, fn, annotations = readOnly) {
  server.registerTool(name, { description, inputSchema, annotations }, async args => {
    try { await lifecycle.ensure(); const result = await fn(args); return { content: [{ type: 'text', text: JSON.stringify(result) }] }; }
    catch (error) { return { isError: true, content: [{ type: 'text', text: JSON.stringify(errorBody(error)) }] }; }
  });
}
register('studio_status', 'Estado real de la app y del panel de Premiere. No inicia ni modifica proyectos.', {}, () => engineCall(config, '/status'));
register('premiere_create_demo_edit', 'Prueba de edición: crea un proyecto nuevo con vídeo sintético de 6 segundos, lo recorta a 4 segundos y guarda el proyecto. Solo funciona sin un proyecto activo. No edita medios del usuario.', {}, async () => (await engineCall(config, '/operations', { operation: 'demo.create' })).result,
  { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false });
register('premiere_trim_video_clip_end', 'Acorta el final de UN clip de vídeo. Requiere identidad y tiempos de una lectura reciente de la secuencia. Mantiene el inicio, no desplaza otros clips, no modifica audio vinculado. Deshacer disponible en Premiere. No guarda.', trimInput,
  async params => (await engineCall(config, '/operations', {operation:'sequence.trimVideoEnd',params})).result,
  {readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false});
register('premiere_save_project', 'Guarda los cambios del proyecto activo en su archivo actual, solo si coincide el identificador indicado.', {projectId:z.string().min(1).max(200)},
  async params => (await engineCall(config, '/operations', {operation:'project.save',params})).result,
  {readOnlyHint:false,destructiveHint:true,idempotentHint:true,openWorldHint:false});
register('premiere_host_info', 'Lee versión y capacidades del panel conectado a Premiere.', {}, async () => (await engineCall(config, '/operations', { operation: 'host.info' })).result);
register('premiere_project_snapshot', 'Lee el proyecto activo y sus secuencias. Requiere Premiere y el panel conectado.', {}, async () => (await engineCall(config, '/operations', { operation: 'project.snapshot' })).result);
register('premiere_sequence_timeline', 'Lee clips y tiempos de una secuencia identificada por premiere_project_snapshot. No edita.', {
  projectId: z.string().min(1), sequenceId: z.string().min(1), limit: z.number().int().min(1).max(500).default(200)
}, async params => (await engineCall(config, '/operations', { operation: 'sequence.timeline', params })).result);
register('media_probe', 'Inspecciona formato, duración, resolución y pistas de un archivo audiovisual local. No modifica el archivo.', {
  path: z.string().min(1)
}, async params => (await engineCall(config, '/operations', { operation: 'media.probe', params })).result);
await server.connect(new StdioServerTransport());
server.server.onclose = () => { lifecycle.close().catch(error => console.error(error.message)); };
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.close(); await lifecycle.close(); process.exit(0); });
