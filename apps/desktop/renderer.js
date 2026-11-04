const $ = id => document.getElementById(id);
let snapshot = null, noticeTimer, refreshing = false, wasConnected = false;
function note(message) { $('notice').textContent = message; $('notice').hidden = false; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('notice').hidden = true, 6500); }
function section(id) { document.querySelectorAll('.page').forEach(el => el.hidden = el.id !== id); document.querySelectorAll('.nav').forEach(el => el.classList.toggle('active', el.dataset.section === id)); }
document.querySelectorAll('.nav').forEach(el => el.addEventListener('click', () => section(el.dataset.section)));
$('go-setup').onclick = () => section('setup');
async function run(button, fn) { button.disabled = true; try { const response = await fn(); if (!response.ok) throw new Error(response.error.message); return response.result; } catch (error) { note(error.message); return undefined; } finally { button.disabled = false; } }
const names = { 'host.info': 'Información de Premiere', 'project.snapshot': 'Consulta del proyecto', 'sequence.timeline': 'Consulta de clips', 'media.probe': 'Análisis de un medio' };
function rowTable(headers, rows) {
  const table = document.createElement('table'), head = document.createElement('tr');
  headers.forEach(label => { const th = document.createElement('th'); th.textContent = label; head.append(th); }); table.append(head);
  rows.forEach(values => { const tr = document.createElement('tr'); values.forEach(value => { const td = document.createElement('td'); td.textContent = value ?? '—'; tr.append(td); }); table.append(tr); });
  return table;
}
function clearProject() { snapshot = null; $('project-empty').hidden = false; $('project-content').hidden = true; $('timeline').hidden = true; $('project-count').textContent = '—'; }
function renderProject(project) {
  snapshot = project; $('project-empty').hidden = true; $('project-content').hidden = false;
  $('project-name').textContent = project.name; $('project-path').textContent = project.path;
  $('project-count').textContent = project.sequences.length + ' secuencias'; $('sequences').replaceChildren();
  project.sequences.forEach(sequence => {
    const button = document.createElement('button'); button.className = 'sequence-row';
    const name = document.createElement('span'), meta = document.createElement('span'); name.textContent = sequence.name;
    meta.textContent = `${sequence.videoTracks} V · ${sequence.audioTracks} A · ${sequence.duration.seconds.toFixed(1)} s →`; button.append(name, meta);
    button.onclick = async () => {
      const timeline = await run(button, () => window.studio.operation({ operation: 'sequence.timeline', params: { projectId: project.id, sequenceId: sequence.id, limit: 200 } }));
      if (!timeline) return;
      $('timeline').hidden = false; $('timeline-count').textContent = `${timeline.returnedClips} de ${timeline.totalClips} clips`;
      $('timeline-content').replaceChildren();
      timeline.tracks.forEach(track => {
        const label = document.createElement('p'); label.className = 'track-title'; label.textContent = `${track.type === 'video' ? 'V' : 'A'}${track.index + 1} · ${track.name}`; $('timeline-content').append(label);
        $('timeline-content').append(rowTable(['CLIP','INICIO','FIN'], track.clips.map(c => [c.name, c.start.seconds.toFixed(3) + ' s', c.end.seconds.toFixed(3) + ' s'])));
      });
      if (timeline.truncated) note('Vista limitada a los primeros 200 clips. El MCP permite consultar hasta 500.');
    };
    $('sequences').append(button);
  });
}
async function refresh(loadProject = false) {
  if (refreshing) return; refreshing = true;
  try {
    const response = await window.studio.status();
    if (!response.ok) throw new Error(response.error.message);
    const status = response.result;
    $('engine-status').textContent = 'Disponible'; $('host-status').textContent = status.connected ? 'Conectado' : 'Sin conexión';
    $('host-version').textContent = status.host ? 'Premiere ' + status.host.version : 'Esperando al panel';
    $('connection-badge').textContent = status.connected ? '● Premiere conectado' : '○ Panel pendiente'; $('connection-badge').classList.toggle('online', status.connected);
    if (!status.connected) clearProject();
    if (status.connected && (loadProject || !wasConnected)) {
      const project = await window.studio.operation({ operation: 'project.snapshot' });
      if (project.ok) renderProject(project.result); else { clearProject(); note(project.error.message); }
    }
    wasConnected = status.connected;
    $('activity-list').replaceChildren();
    if (!status.history.length) $('activity-list').textContent = 'Las consultas y sus resultados aparecerán aquí.';
    status.history.slice(0, 5).forEach(item => {
      const row = document.createElement('div'); row.className = 'activity-row';
      const label = document.createElement('span'), state = document.createElement('span'); label.textContent = names[item.operation] || item.operation;
      state.textContent = (item.ok ? 'Completado' : 'No completado') + ' · ' + new Date(item.time).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); state.className = item.ok ? 'ok' : 'error'; row.append(label, state); $('activity-list').append(row);
    });
  } catch (error) { $('engine-status').textContent = 'No disponible'; $('connection-badge').textContent = 'Servicio desconectado'; $('connection-badge').classList.remove('online'); $('host-status').textContent = 'Sin conexión'; clearProject(); wasConnected = false; if (loadProject) note(error.message); }
  finally { refreshing = false; }
}
$('refresh').onclick = () => refresh(true);
$('launch-premiere').onclick = () => run($('launch-premiere'), () => window.studio.launchPremiere());
$('prepare-panel').onclick = () => run($('prepare-panel'), () => window.studio.panel());
$('copy-key').onclick = async () => { if (await run($('copy-key'), () => window.studio.copyKey())) note('Clave copiada. Pégala únicamente en el panel SASA de Premiere.'); };
$('choose-media').onclick = async () => {
  const media = await run($('choose-media'), () => window.studio.chooseMedia()); if (!media) return;
  $('media-result').hidden = false; $('media-result').replaceChildren();
  const heading = document.createElement('h2'); heading.textContent = media.path.split(/[\\/]/).pop(); $('media-result').append(heading);
  const detail = document.createElement('p'); detail.textContent = `${media.format} · ${media.durationSeconds === null ? 'Duración desconocida' : media.durationSeconds.toFixed(2) + ' s'} · ${media.sizeBytes === null ? 'Tamaño desconocido' : (media.sizeBytes / 1048576).toFixed(1) + ' MB'}`; $('media-result').append(detail);
  $('media-result').append(rowTable(['TIPO','CODEC','DETALLES'], media.streams.map(s => [s.type, s.codec, s.type === 'video' ? `${s.width} × ${s.height} · ${s.frameRate} fps` : s.type === 'audio' ? `${s.channels} canales · ${s.sampleRate} Hz` : '—'])));
  refresh();
};
refresh(); setInterval(() => refresh(), 3000);
