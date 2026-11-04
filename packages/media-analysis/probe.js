import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { stat, realpath } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { StudioError } from '../contracts/index.js';

const run = promisify(execFile);
export async function probeMedia(path) {
  if (!isAbsolute(path) || path.includes('\0')) throw new StudioError('INVALID_PATH', 'Selecciona un archivo local con ruta absoluta.');
  let resolved;
  try { resolved = await realpath(path); if (!(await stat(resolved)).isFile()) throw new Error(); }
  catch { throw new StudioError('FILE_NOT_FOUND', 'No se encontró un archivo en esa ruta.'); }
  try {
    const { stdout } = await run(process.env.SASA_FFPROBE || 'ffprobe', ['-v', 'error', '-protocol_whitelist', 'file', '-show_format', '-show_streams', '-of', 'json', '-i', resolved],
      { timeout: 30000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    const info = JSON.parse(stdout);
    return { path: resolved, format: info.format?.format_name || null, durationSeconds: Number(info.format?.duration) || null,
      sizeBytes: Number(info.format?.size) || null, streams: (info.streams || []).map(s => ({
        index: s.index, type: s.codec_type, codec: s.codec_name, width: s.width, height: s.height,
        frameRate: s.avg_frame_rate, sampleRate: s.sample_rate, channels: s.channels
      })) };
  } catch (error) {
    if (error.code === 'ENOENT') throw new StudioError('FFPROBE_MISSING', 'FFprobe no está disponible en este equipo.');
    throw new StudioError(error.killed ? 'PROBE_TIMEOUT' : 'INVALID_MEDIA', error.killed ? 'El análisis superó el tiempo disponible.' : 'FFprobe no pudo leer este archivo como medio audiovisual.');
  }
}
