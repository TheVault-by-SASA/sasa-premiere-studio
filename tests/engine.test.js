import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { createEngine } from '../services/local-engine/server.js';
import { engineCall } from '../services/local-engine/client.js';
import { VERSION } from '../packages/contracts/index.js';

async function setup(t, timeoutMs = 1000) {
  const token = randomBytes(32).toString('hex');
  const engine = await createEngine({ token, port: 0, timeoutMs });
  t.after(() => engine.close()); return { engine, config: { token, port: engine.port } };
}
async function peer(config, capabilities = ['host.info','project.snapshot','sequence.timeline']) {
  const ws = new WebSocket(`ws://127.0.0.1:${config.port}/premiere`);
  await once(ws,'open'); const welcome = once(ws,'message');
  ws.send(JSON.stringify({type:'hello',protocol:1,token:config.token,host:{app:'premierepro',version:'26.5.0-test',pluginVersion:VERSION,capabilities}}));
  await welcome; return ws;
}
test('HTTP requires auth, denies foreign origins and unsupported operations', async t => {
  const { config } = await setup(t); const url = `http://127.0.0.1:${config.port}`;
  assert.equal((await fetch(url+'/status')).status,401);
  assert.equal((await fetch(url+'/status',{headers:{Authorization:`Bearer ${config.token}`,Origin:'https://example.org'}})).status,403);
  await assert.rejects(engineCall(config,'/operations',{operation:'execute_script',params:{code:'danger'}}), {code:'INVALID_OPERATION'});
  const status = await engineCall(config,'/status'); assert.equal(status.connected,false);
  assert.equal(JSON.stringify(status).includes(config.token),false);
});
test('host absence is an explicit failure, never a success response', async t => {
  const { config } = await setup(t);
  await assert.rejects(engineCall(config,'/operations',{operation:'project.snapshot'}), {code:'HOST_OFFLINE'});
});
test('authenticated bridge round-trip and capabilities', async t => {
  const { config } = await setup(t); const ws = await peer(config);
  ws.on('message', raw => { const r=JSON.parse(raw); ws.send(JSON.stringify({type:'result',id:r.id,ok:true,result:{id:'test-project',name:'Synthetic project',sequences:[]}})); });
  const response = await engineCall(config,'/operations',{operation:'project.snapshot'});
  assert.equal(response.result.id,'test-project'); assert.equal(response.ok,true);
  const status = await engineCall(config,'/status'); assert.equal(status.connected,true); assert.equal(status.history[0].ok,true);
});
test('wrong token and a second host cannot take ownership', async t => {
  const { config, engine } = await setup(t);
  const first = await peer(config);
  const ws = new WebSocket(`ws://127.0.0.1:${config.port}/premiere`); await once(ws,'open');
  const closed=once(ws,'close');
  ws.send(JSON.stringify({type:'hello',protocol:1,token:'wrong',host:{app:'premierepro',version:'fake',pluginVersion:VERSION,capabilities:[]}}));
  assert.equal((await closed)[0],1008); assert.equal(engine.status().host.version,'26.5.0-test');
  const second = new WebSocket(`ws://127.0.0.1:${config.port}/premiere`); await once(second,'open'); const rejected=once(second,'close');
  second.send(JSON.stringify({type:'hello',protocol:1,token:config.token,host:{app:'premierepro',version:'fake',pluginVersion:VERSION,capabilities:[]}}));
  assert.equal((await rejected)[0],1008); assert.equal(first.readyState,WebSocket.OPEN);
});
test('disconnect rejects in-flight calls and a new host can reconnect', async t => {
  const { config } = await setup(t); const ws = await peer(config);
  ws.on('message',()=>ws.close());
  await assert.rejects(engineCall(config,'/operations',{operation:'host.info'}), {code:'HOST_DISCONNECTED'});
  const next = await peer(config); assert.equal(next.readyState,WebSocket.OPEN);
});
test('timeouts and malformed responses do not produce false completion', async t => {
  const { config, engine } = await setup(t,60); const ws=await peer(config);
  await assert.rejects(engineCall(config,'/operations',{operation:'host.info'}), {code:'HOST_TIMEOUT'});
  assert.equal(engine.bridge.pending.size,0);
  ws.on('message', raw => { const r=JSON.parse(raw); ws.send(JSON.stringify({type:'result',id:r.id,ok:'yes'})); });
  await assert.rejects(engineCall(config,'/operations',{operation:'host.info'}), {code:'HOST_DISCONNECTED'});
});
test('unadvertised capabilities and invalid sequence identities are rejected', async t => {
  const { config } = await setup(t); await peer(config,['host.info']);
  await assert.rejects(engineCall(config,'/operations',{operation:'project.snapshot'}),{code:'UNSUPPORTED_OPERATION'});
  await assert.rejects(engineCall(config,'/operations',{operation:'sequence.timeline',params:{limit:1000}}),{code:'INVALID_OPERATION'});
});
