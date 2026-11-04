import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = { module: {exports:{}} }; vm.createContext(context);
vm.runInContext(await readFile(new URL('../apps/premiere-panel/adapter.js',import.meta.url),'utf8'),context);
const {createAdapter}=context.module.exports;
const time=seconds=>({ticks:String(seconds*254016000000),seconds});
const clip={getName:async()=>'<script>title</script>',getStartTime:async()=>time(0),getEndTime:async()=>time(5),getInPoint:async()=>time(2),getOutPoint:async()=>time(7)};
const sequence={guid:{toString:()=> 'sequence-1'},name:'Test',getVideoTrackCount:async()=>1,getAudioTrackCount:async()=>0,getEndTime:async()=>time(10),getVideoTrack:async()=>({name:'Video 1',getTrackItems:async()=>[clip,clip]})};
function fixture() { const project={guid:{toString:()=> 'project-1'},name:'Test project',path:'C:/synthetic.prproj',getActiveSequence:async()=>sequence,getSequences:async()=>[sequence]};
  const ppro={Project:{getActiveProject:async()=>project},Constants:{TrackItemType:{CLIP:1}}}; return {ppro,project,adapter:createAdapter(ppro,{version:'26.5'})}; }
test('adapter refuses execution and reports missing projects',async()=>{
  const {adapter,ppro}=fixture(); await assert.rejects(adapter.dispatch('eval',{}),{code:'UNSUPPORTED_OPERATION'});
  ppro.Project.getActiveProject=async()=>null; await assert.rejects(adapter.dispatch('project.snapshot'),{code:'NO_PROJECT'});
});
test('timeline validates project and sequence and explicitly reports truncation',async()=>{
  const {adapter}=fixture();
  await assert.rejects(adapter.dispatch('sequence.timeline',{projectId:'other',sequenceId:'sequence-1',limit:1}),{code:'PROJECT_CHANGED'});
  await assert.rejects(adapter.dispatch('sequence.timeline',{projectId:'project-1',sequenceId:'other',limit:1}),{code:'SEQUENCE_NOT_FOUND'});
  const result=await adapter.dispatch('sequence.timeline',{projectId:'project-1',sequenceId:'sequence-1',limit:1});
  assert.equal(result.totalClips,2); assert.equal(result.returnedClips,1); assert.equal(result.truncated,true);
  assert.equal(result.tracks[0].clips[0].inPoint.ticks,'508032000000');
});
test('project switching while reading is detected',async()=>{
  const {adapter,ppro,project}=fixture(); let calls=0;
  ppro.Project.getActiveProject=async()=>++calls===1?project:{...project,guid:{toString:()=> 'changed'}};
  await assert.rejects(adapter.dispatch('project.snapshot'),{code:'PROJECT_CHANGED'});
});

test('demo never creates or edits a project while another project is active',async()=>{
  const {adapter,ppro}=fixture(); let created=false;
  ppro.Project.createProject=async()=>{created=true;};
  await assert.rejects(adapter.dispatch('demo.create',{projectPath:'C:/demo/SASA-Prueba-MCP.prproj',mediaPath:'C:/demo/SASA-test-6s.mp4'}),{code:'PROJECT_OPEN'});
  assert.equal(created,false);
});

test('video trim rejects stale clip identity before creating an action',async()=>{
  const {adapter}=fixture();
  await assert.rejects(adapter.dispatch('sequence.trimVideoEnd',{projectId:'project-1',sequenceId:'sequence-1',trackIndex:0,clipIndex:0,
    expectedName:'wrong clip',expectedStartTicks:'0',expectedEndTicks:time(5).ticks,newEndTicks:time(4).ticks}),{code:'CLIP_CHANGED'});
});

test('video trim creates its action inside the host lock and verifies the result',async()=>{
  const {adapter,project,ppro}=fixture(); let locked=false,actualEnd=5;
  const editedClip={...clip,getEndTime:async()=>time(actualEnd),createSetEndAction(target){assert.equal(locked,true);return ()=>{actualEnd=target.seconds;};}};
  project.getSequences=async()=>[{...sequence,getVideoTrack:async()=>({getTrackItems:async()=>[editedClip]})}];
  ppro.TickTime={createWithTicks:t=>time(Number(t)/254016000000)};
  project.lockedAccess=fn=>{locked=true;try{fn();}finally{locked=false;}};
  project.executeTransaction=fn=>{assert.equal(locked,true);fn({addAction:action=>action()});return true;};
  const args={projectId:'project-1',sequenceId:'sequence-1',trackIndex:0,clipIndex:0,expectedName:'<script>title</script>',expectedStartTicks:'0',expectedEndTicks:time(5).ticks,newEndTicks:time(4).ticks};
  const result=await adapter.dispatch('sequence.trimVideoEnd',args);
  assert.equal(result.after.seconds,4);assert.equal(result.saved,false);
  await assert.rejects(adapter.dispatch('sequence.trimVideoEnd',args),{code:'CLIP_CHANGED'});
});
