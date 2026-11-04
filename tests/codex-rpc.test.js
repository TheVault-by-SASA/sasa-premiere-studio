import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { CodexRpc } from '../services/codex-session/rpc.js';

test('stdio RPC correlates replies and handles notifications without a model invocation', async t => {
  const fixture = `const r=require('readline').createInterface({input:process.stdin});r.on('line',line=>{const m=JSON.parse(line);if(m.id===undefined)return;const out=JSON.stringify({id:m.id,result:{method:m.method}})+'\\n';process.stdout.write(out.slice(0,7));setTimeout(()=>process.stdout.write(out.slice(7)),2);if(m.method==='ping')setTimeout(()=>process.stdout.write(JSON.stringify({method:'thread/tokenUsage/updated',params:{threadId:'test'}})+'\\n'),5);});`;
  const rpc = new CodexRpc({executable:process.execPath,spawnProcess:(_exe,_args,options)=>spawn(process.execPath,['-e',fixture],options)});
  t.after(()=>rpc.close());await rpc.start();const notification=once(rpc,'notification');
  assert.deepEqual(await rpc.call('ping'),{method:'ping'});assert.equal((await notification)[0].method,'thread/tokenUsage/updated');
  await rpc.close();assert.equal(rpc.child,null);assert.equal(rpc.pending.size,0);
});
test('an initialization timeout terminates its child instead of leaking a process',async()=>{
  const rpc = new CodexRpc({executable:process.execPath,timeoutMs:40,spawnProcess:(_exe,_args,options)=>spawn(process.execPath,['-e','process.stdin.resume();'],options)});
  await assert.rejects(rpc.start(),{code:'CODEX_TIMEOUT'});
  assert.equal(rpc.child,null);assert.equal(rpc.pending.size,0);
});
