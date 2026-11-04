import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { WebSocket } from 'ws';
import { createEngine } from '../services/local-engine/server.js';
import { engineCall } from '../services/local-engine/client.js';
import { VERSION } from '../packages/contracts/index.js';

test('agent commands and streamed usage use the authenticated host connection without breaking Premiere requests', async t => {
  let created = 0;
  class Session extends EventEmitter {
    snapshot(){return {connected:true,usage:{total:{totalTokens:123}}};}
    async command(cmd){assert.equal(cmd.action,'connect');return this.snapshot();}
    async close(){}
  }
  const token='a'.repeat(64), session=new Session();
  const engine=await createEngine({token,port:0,sessionFactory:()=>{created++;return session;}});
  t.after(()=>engine.close()); const config={token,port:engine.port};
  const ws=new WebSocket(`ws://127.0.0.1:${engine.port}/premiere`); await once(ws,'open');
  let reply=once(ws,'message');
  ws.send(JSON.stringify({type:'hello',protocol:1,token,host:{app:'premierepro',version:'26.5',pluginVersion:VERSION,capabilities:['host.info']}}));
  await reply; assert.equal(created,0);
  reply=once(ws,'message');ws.send(JSON.stringify({type:'agent.command',id:'a',command:{action:'connect'}}));
  assert.equal(JSON.parse((await reply)[0]).state.usage.total.totalTokens,123);
  reply=once(ws,'message');session.emit('state',session.snapshot());assert.equal(JSON.parse((await reply)[0]).type,'agent.state');
  ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='request')ws.send(JSON.stringify({type:'result',id:m.id,ok:true,result:{version:'26.5'}}));});
  assert.equal((await engineCall(config,'/operations',{operation:'host.info'})).result.version,'26.5');
  assert.equal((await fetch(`http://127.0.0.1:${engine.port}/agent`)).status,401);
  assert.equal((await engineCall(config,'/agent',{action:'connect'})).result.connected,true);
});
