import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { probeMedia } from '../packages/media-analysis/probe.js';
test('FFprobe reads actual generated video and audio without altering the media',async()=>{
  await mkdir('work/tests',{recursive:true}); const path=resolve('work/tests/synthetic clip.mp4');
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=purple:s=320x180:r=24:d=1','-f','lavfi','-i','sine=frequency=440:duration=1','-c:v','libx264','-c:a','aac','-shortest',path],{windowsHide:true});
  const result=await probeMedia(path); assert.equal(result.durationSeconds,1); assert.equal(result.streams[0].width,320); assert.equal(result.streams[1].type,'audio');
});
test('probe refuses URLs, missing files and non-media',async()=>{
  await assert.rejects(probeMedia('https://example.com/movie.mp4'),{code:'INVALID_PATH'});
  await assert.rejects(probeMedia(resolve('work/tests/does-not-exist.mp4')),{code:'FILE_NOT_FOUND'});
  await mkdir('work/tests',{recursive:true}); const file=resolve('work/tests/not-media.txt'); await writeFile(file,'not media');
  await assert.rejects(probeMedia(file),{code:'INVALID_MEDIA'});
});
