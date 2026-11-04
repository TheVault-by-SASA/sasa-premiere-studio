import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
const client = new Client({ name: 'sasa-live-verification', version: '1.0.0' });
const report = [];
async function call(name, args = {}) {
  const start = Date.now();
  const response = await client.callTool({ name, arguments: args });
  const entry = { name, elapsedMs: Date.now()-start, isError: !!response.isError, result: JSON.parse(response.content[0].text) };
  report.push(entry); console.log(JSON.stringify(entry)); return entry;
}
try {
  await client.connect(new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL('../services/mcp-server/main.js', import.meta.url))], env: { ...process.env } }));
  await call('studio_status'); await call('premiere_host_info');
  if (process.argv.includes('--demo')) await call('premiere_create_demo_edit');
  const snapshot = await call('premiere_project_snapshot');
  if (!snapshot.isError && snapshot.result.activeSequenceId) {
    const ids = { projectId: snapshot.result.id, sequenceId: snapshot.result.activeSequenceId, limit: 20 };
    const timeline = await call('premiere_sequence_timeline', ids);
    if (process.argv.includes('--finish-demo')) {
      if (!/[/\\]demos[/\\]sasa-demo-[^/\\]+[/\\]SASA-Prueba-MCP\.prproj$/.test(snapshot.result.path)) throw new Error('Solo se puede completar la prueba en un proyecto sintético gestionado.');
      const clip = timeline.result.tracks[0].clips[0];
      if (clip.name !== 'SASA-test-6s.mp4' || clip.end.seconds !== 6) throw new Error('La prueba no coincide con el estado esperado.');
      const edit = await call('premiere_trim_video_clip_end', { projectId: ids.projectId, sequenceId: ids.sequenceId,
        trackIndex: 0, clipIndex: 0, expectedName: clip.name, expectedStartTicks: clip.start.ticks, expectedEndTicks: clip.end.ticks, newEndTicks:'1016064000000' });
      if (!edit.isError) await call('premiere_save_project', {projectId:ids.projectId});
      await call('premiere_sequence_timeline', ids);
    }
  }
} finally {
  await mkdir('work', {recursive:true}); await writeFile('work/live-verification.json',JSON.stringify(report,null,2));
  await client.close();
}
