import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CodexSession } from '../services/codex-session/session.js';

class FakeRpc extends EventEmitter {
  constructor() { super(); this.calls = []; this.replies = []; this.turn = 0; }
  async start() {}
  async close() {}
  respond(id, result) { this.replies.push({id,result}); }
  write(value) { this.replies.push(value); }
  async call(method, params) {
    this.calls.push({method,params});
    if (method === 'account/read') return {account:{type:'chatgpt'}};
    if (method === 'model/list') return {data:[{model:'available',displayName:'Available',defaultReasoningEffort:'low',supportedReasoningEfforts:[{reasoningEffort:'low'},{reasoningEffort:'high'}],isDefault:true}],nextCursor:null};
    if (method === 'config/read') return {config:{model:'available',mcp_servers:{unrelated:{},'sasa-premiere-studio':{}}}};
    if (method === 'thread/start' || method === 'thread/resume') return {thread:{id:'thread-test',turns:[]}};
    if (method === 'turn/start') return {turn:{id:'turn-'+(++this.turn),status:'inProgress'}};
    return {};
  }
  event(method, params) { this.emit('notification',{method,params:{threadId:'thread-test',...params}}); }
}
async function setup(t, stateDir) {
  const rpc = new FakeRpc();
  const session = new CodexSession({stateDir:stateDir || await mkdtemp(join(tmpdir(),'sasa-codex-')),rpc});
  t.after(()=>session.close()); await session.command({action:'connect'}); return {rpc,session};
}
const usage = n => ({total:{totalTokens:n,inputTokens:n-10,outputTokens:10,cachedInputTokens:20,reasoningOutputTokens:5},last:{totalTokens:50},modelContextWindow:1000});

test('model selection is validated and actually applied to the next turn', async t => {
  const {session,rpc} = await setup(t);
  await assert.rejects(session.command({action:'select',model:'invented',effort:'low'}));
  await assert.rejects(session.command({action:'select',model:'available',effort:'ultra'}));
  await session.command({action:'select',model:'available',effort:'high'});
  await session.command({action:'send',text:'Consulta el proyecto.'});
  const turn = rpc.calls.find(c=>c.method==='turn/start').params;
  assert.equal(turn.model,'available'); assert.equal(turn.effort,'high');
  const config = rpc.calls.find(c=>c.method==='thread/start').params.config;
  assert.equal(config['mcp_servers.unrelated.enabled'],false);
  assert.equal(config['mcp_servers.sasa-premiere-studio'].enabled,true);
  assert.equal(config['mcp_servers.sasa-premiere-studio.enabled'],undefined);
});
test('absolute token snapshots do not double count cache, reasoning or repeated notifications', async t => {
  const {session,rpc} = await setup(t); await session.command({action:'send',text:'Hola'});
  rpc.event('thread/tokenUsage/updated',{turnId:'turn-1',tokenUsage:usage(100)});
  rpc.event('thread/tokenUsage/updated',{turnId:'turn-1',tokenUsage:usage(100)});
  assert.equal(session.snapshot().usage.total.totalTokens,100); assert.equal(session.snapshot().turnTokens,100);
  rpc.event('turn/completed',{turn:{id:'turn-1',status:'completed'}});
  await session.command({action:'send',text:'Otra'});
  rpc.event('thread/tokenUsage/updated',{turnId:'turn-2',tokenUsage:usage(180)});
  assert.equal(session.snapshot().turnTokens,80);
  rpc.event('thread/tokenUsage/updated',{threadId:'other',tokenUsage:usage(9999)});
  assert.equal(session.snapshot().usage.total.totalTokens,180);
});
test('a busy turn blocks duplicate sends, reset and model changes; stop targets the active turn', async t => {
  const {session,rpc} = await setup(t);
  const first = session.command({action:'send',text:'Hola'});
  await assert.rejects(session.command({action:'send',text:'Duplicado'})); await first;
  await assert.rejects(session.command({action:'new'}));
  await assert.rejects(session.command({action:'select',model:'available',effort:'low'}));
  await session.command({action:'stop'});
  assert.deepEqual(rpc.calls.at(-1),{method:'turn/interrupt',params:{threadId:'thread-test',turnId:'turn-1'}});
});
test('session restores history and usage and resumes the same thread', async t => {
  const {session,rpc} = await setup(t); await session.command({action:'send',text:'Primera'});
  rpc.event('item/agentMessage/delta',{itemId:'message',delta:'Respuesta'});
  rpc.event('item/completed',{item:{id:'message',type:'agentMessage',text:'Respuesta final'}});
  rpc.event('thread/tokenUsage/updated',{tokenUsage:usage(123)});
  rpc.event('turn/completed',{turn:{id:'turn-1',status:'completed'}}); await session.persist();
  const restored = await setup(t,session.stateDir);
  assert.equal(restored.session.snapshot().usage.total.totalTokens,123);
  assert.equal(restored.session.snapshot().messages.at(-1).text,'Respuesta final');
  await restored.session.command({action:'send',text:'Continuar'});
  assert.equal(restored.rpc.calls.find(c=>c.method==='thread/resume').params.threadId,'thread-test');
  const saved = await readFile(join(session.stateDir,'agent-session.json'),'utf8'); assert.equal(saved.includes('token"'),false);
});
test('approval requests remain pending until a scoped user answer, unsupported permissions are denied', async t => {
  const {session,rpc} = await setup(t); await session.command({action:'send',text:'Hola'});
  rpc.emit('request',{id:42,method:'item/commandExecution/requestApproval',params:{threadId:'thread-test',command:'example'}});
  assert.equal(rpc.replies.length,0); assert.equal(session.snapshot().requests.length,1);
  await session.command({action:'answer',requestId:'42',decision:'decline'});
  assert.deepEqual(rpc.replies[0],{id:42,result:{decision:'decline'}});
  await assert.rejects(session.command({action:'answer',requestId:'42',decision:'accept'}));
  rpc.emit('request',{id:43,method:'item/permissions/requestApproval',params:{threadId:'thread-test'}});
  assert.deepEqual(rpc.replies[1].result.permissions,{});
});
