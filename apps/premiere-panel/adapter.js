/* CommonJS for the UXP runtime; no Node APIs are used here. */
function createAdapter(ppro, host) {
  const version = '0.1.0';
  const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };
  const idOf = value => value.guid.toString();
  const timeOf = time => ({ ticks: String(time.ticks), seconds: time.seconds });
  async function activeProject() {
    const project = await ppro.Project.getActiveProject();
    if (!project) fail('NO_PROJECT', 'Abre un proyecto en Premiere.');
    return project;
  }
  async function summary(sequence) {
    return { id: idOf(sequence), name: sequence.name, videoTracks: await sequence.getVideoTrackCount(),
      audioTracks: await sequence.getAudioTrackCount(), duration: timeOf(await sequence.getEndTime()) };
  }
  const operations = {
    'host.info': async () => ({ app: 'premierepro', version: String(host.version), pluginVersion: version,
      capabilities: Object.keys(operations), readOnly: false }),
    'demo.create': async params => {
      if (!params || !/[/\\]SASA-Prueba-MCP\.prproj$/.test(params.projectPath) || !/[/\\]SASA-test-6s\.mp4$/.test(params.mediaPath)) fail('INVALID_PARAMS', 'Rutas de prueba inválidas.');
      const existing = await ppro.Project.getActiveProject();
      if (existing) fail('PROJECT_OPEN', 'Cierra el proyecto activo antes de crear la prueba aislada.');
      const project = await ppro.Project.createProject(params.projectPath);
      if (!project) fail('CREATE_FAILED', 'Premiere no creó el proyecto de prueba.');
      const root = await project.getRootItem();
      if (!await project.importFiles([params.mediaPath], true, root, false)) fail('IMPORT_FAILED', 'No se pudo importar el vídeo de prueba.');
      const imported = (await root.getItems()).find(item => item.name === 'SASA-test-6s.mp4');
      if (!imported) fail('IMPORT_FAILED', 'El vídeo importado no aparece en el proyecto.');
      const sequence = await project.createSequenceFromMedia('SASA · Primera edición MCP', [ppro.ClipProjectItem.cast(imported)], root);
      const track = await sequence.getVideoTrack(0);
      const clips = await track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false);
      if (clips.length !== 1) fail('DEMO_LAYOUT_CHANGED', 'La secuencia de prueba no tiene la estructura esperada.');
      const clip = clips[0];
      const before = timeOf(await clip.getEndTime());
      if (Math.abs(before.seconds - 6) > 0.05) fail('DEMO_DURATION', 'Duración original inesperada.');
      if (idOf(await activeProject()) !== idOf(project)) fail('PROJECT_CHANGED', 'El proyecto activo cambió.');
      project.lockedAccess(() => {
        const action = clip.createSetEndAction(ppro.TickTime.createWithSeconds(4));
        if (!project.executeTransaction(compound => compound.addAction(action), 'SASA: recortar prueba de 6 a 4 segundos')) fail('EDIT_FAILED', 'Premiere rechazó la edición.');
      });
      const after = timeOf(await clip.getEndTime());
      if (Math.abs(after.seconds - 4) > 0.05) fail('VERIFY_FAILED', 'La edición no produjo la duración esperada.');
      await project.openSequence(sequence);
      if (!await project.save()) fail('SAVE_FAILED', 'El proyecto de prueba no se guardó.');
      return { projectId: idOf(project), projectPath: project.path, sequenceId: idOf(sequence), before, after, saved: true };
    },
    'sequence.trimVideoEnd': async params => {
      const project = await activeProject();
      if (idOf(project) !== params.projectId) fail('PROJECT_CHANGED', 'El proyecto activo cambió.');
      const sequence = (await project.getSequences()).find(s => idOf(s) === params.sequenceId);
      if (!sequence || params.trackIndex >= await sequence.getVideoTrackCount()) fail('SEQUENCE_NOT_FOUND', 'Secuencia o pista no disponible.');
      const track = await sequence.getVideoTrack(params.trackIndex);
      const items = await track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false);
      const clip = items[params.clipIndex];
      if (!clip) fail('CLIP_CHANGED', 'El clip ya no existe en esa posición.');
      const start = await clip.getStartTime(), end = await clip.getEndTime();
      if (await clip.getName() !== params.expectedName || String(start.ticks) !== params.expectedStartTicks || String(end.ticks) !== params.expectedEndTicks) fail('CLIP_CHANGED', 'El clip cambió desde la lectura. Actualiza la secuencia.');
      const target = ppro.TickTime.createWithTicks(params.newEndTicks);
      if (target.seconds <= start.seconds || target.seconds >= end.seconds) fail('INVALID_TRIM', 'El nuevo final debe acortar el clip y mantener duración positiva.');
      if (idOf(await activeProject()) !== params.projectId) fail('PROJECT_CHANGED', 'El proyecto activo cambió.');
      project.lockedAccess(() => {
        const action = clip.createSetEndAction(target);
        if (!project.executeTransaction(compound => compound.addAction(action), 'SASA: recortar final del clip de vídeo')) fail('EDIT_FAILED', 'Premiere rechazó el recorte.');
      });
      const actual = await clip.getEndTime();
      if (String(actual.ticks) !== params.newEndTicks) fail('VERIFY_FAILED', 'La duración obtenida no coincide. Revisa la secuencia antes de repetir.');
      return { projectId: params.projectId, sequenceId: params.sequenceId, before: timeOf(end), after: timeOf(actual), saved: false, audioModified: false };
    },
    'project.save': async params => {
      const project = await activeProject();
      if (idOf(project) !== params.projectId) fail('PROJECT_CHANGED', 'El proyecto activo cambió.');
      if (!await project.save()) fail('SAVE_FAILED', 'Premiere no confirmó el guardado.');
      return { projectId: idOf(project), path: project.path, saved: true };
    },
    'project.snapshot': async () => {
      const project = await activeProject();
      const active = await project.getActiveSequence();
      const sequences = await project.getSequences();
      const result = { id: idOf(project), name: project.name, path: project.path,
        activeSequenceId: active ? idOf(active) : null, sequences: [] };
      for (const sequence of sequences) result.sequences.push(await summary(sequence));
      const latest = await activeProject();
      if (idOf(latest) !== result.id) fail('PROJECT_CHANGED', 'El proyecto activo cambió durante la lectura. Repite la consulta.');
      return result;
    },
    'sequence.timeline': async params => {
      if (!params || typeof params.projectId !== 'string' || typeof params.sequenceId !== 'string' ||
          !Number.isInteger(params.limit) || params.limit < 1 || params.limit > 500) fail('INVALID_PARAMS', 'Parámetros de secuencia inválidos.');
      const project = await activeProject();
      if (idOf(project) !== params.projectId) fail('PROJECT_CHANGED', 'El proyecto activo ha cambiado. Actualiza la lista.');
      const sequences = await project.getSequences();
      const sequence = sequences.find(s => idOf(s) === params.sequenceId);
      if (!sequence) fail('SEQUENCE_NOT_FOUND', 'La secuencia ya no está disponible.');
      const result = { projectId: idOf(project), sequence: await summary(sequence), tracks: [], returnedClips: 0, totalClips: 0, truncated: false };
      for (const kind of ['video', 'audio']) {
        const count = kind === 'video' ? await sequence.getVideoTrackCount() : await sequence.getAudioTrackCount();
        for (let index = 0; index < count; index++) {
          const track = kind === 'video' ? await sequence.getVideoTrack(index) : await sequence.getAudioTrack(index);
          const items = await track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false);
          result.totalClips += items.length;
          const output = { type: kind, index, name: track.name, totalClips: items.length, clips: [] };
          for (let itemIndex = 0; itemIndex < items.length && result.returnedClips < params.limit; itemIndex++) {
            const item = items[itemIndex];
            output.clips.push({ index: itemIndex, name: await item.getName(), start: timeOf(await item.getStartTime()),
              end: timeOf(await item.getEndTime()), inPoint: timeOf(await item.getInPoint()), outPoint: timeOf(await item.getOutPoint()) });
            result.returnedClips++;
          }
          result.tracks.push(output);
        }
      }
      result.truncated = result.returnedClips < result.totalClips;
      if (idOf(await activeProject()) !== params.projectId) fail('PROJECT_CHANGED', 'El proyecto cambió durante la lectura.');
      result.observedAt = new Date().toISOString();
      return result;
    }
  };
  return { capabilities: Object.keys(operations), async dispatch(operation, params) {
    if (!Object.prototype.hasOwnProperty.call(operations, operation)) fail('UNSUPPORTED_OPERATION', 'Operación no implementada.');
    return operations[operation](params);
  } };
}
module.exports = { createAdapter };
