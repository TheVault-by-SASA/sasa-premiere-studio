import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createEngine } from '../services/local-engine/server.js';
import { engineLifecycle } from '../services/local-engine/ensure.js';
import { engineCall } from '../services/local-engine/client.js';

test('MCP lifecycle authenticates existing engine and can take over when its owner closes',async()=>{
  const token=randomBytes(32).toString('hex');
  const external=await createEngine({token,port:0});
  const config={token,port:external.port};
  const lifecycle=engineLifecycle(config);
  try {
    await lifecycle.ensure();
    assert.equal((await engineCall(config,'/status')).connected,false);
    await external.close();
    await Promise.all([lifecycle.ensure(),lifecycle.ensure()]);
    assert.equal((await engineCall(config,'/status')).app,'sasa-premiere-studio');
  } finally { await lifecycle.close(); }
});

test('an unrelated local service is never replaced or used with a wrong token',async()=>{
  const external=await createEngine({token:randomBytes(32).toString('hex'),port:0});
  const lifecycle=engineLifecycle({token:randomBytes(32).toString('hex'),port:external.port});
  try { await assert.rejects(lifecycle.ensure(),e=>e.code==='UNAUTHORIZED'); }
  finally { await lifecycle.close(); await external.close(); }
});
