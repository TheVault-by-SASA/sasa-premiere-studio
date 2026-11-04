import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { loadConfig } from '../services/local-engine/config.js';
import { createEngine } from '../services/local-engine/server.js';
import { writeFile } from 'node:fs/promises';
import { engineCall } from '../services/local-engine/client.js';
test('real MCP transport discovers tools and propagates host-offline errors',async t=>{
  await mkdir('work/tests',{recursive:true}); const stateDir=await mkdtemp(resolve('work/tests/mcp-'));
  const config=await loadConfig(stateDir); const engine=await createEngine({...config,port:0});
  await writeFile(join(stateDir,'connection.json'),JSON.stringify({token:config.token,port:engine.port}));
  const transport=new StdioClientTransport({command:process.execPath,args:[resolve('services/mcp-server/main.js')],env:{...process.env,SASA_STUDIO_STATE_DIR:stateDir}});
  const client=new Client({name:'studio-test',version:'1.0.0'});
  t.after(async()=>{await client.close();await engine.close();});
  await client.connect(transport);
  const {tools}=await client.listTools(); assert.equal(tools.length,8); assert.equal(tools.filter(t=>t.annotations.readOnlyHint).length,5);
  assert.equal(tools.find(t=>t.name==='premiere_create_demo_edit').annotations.readOnlyHint,false);
  const status=await client.callTool({name:'studio_status',arguments:{}}); assert.equal(JSON.parse(status.content[0].text).connected,false);
  const project=await client.callTool({name:'premiere_project_snapshot',arguments:{}}); assert.equal(project.isError,true); assert.equal(JSON.parse(project.content[0].text).code,'HOST_OFFLINE');
});

test('MCP starts the local engine without the desktop app',async t=>{
  await mkdir('work/tests',{recursive:true}); const stateDir=await mkdtemp(resolve('work/tests/mcp-headless-'));
  const config=await loadConfig(stateDir); const initial=await createEngine({...config,port:0});
  config.port=initial.port;
  await writeFile(join(stateDir,'connection.json'),JSON.stringify({token:config.token,port:config.port}));
  await initial.close();
  const client=new Client({name:'headless-test',version:'1.0.0'});
  t.after(()=>client.close());
  await client.connect(new StdioClientTransport({command:process.execPath,args:[resolve('services/mcp-server/main.js')],env:{...process.env,SASA_STUDIO_STATE_DIR:stateDir}}));
  assert.equal((await engineCall(config,'/status')).app,'sasa-premiere-studio');
  const status=await client.callTool({name:'studio_status',arguments:{}});
  assert.equal(JSON.parse(status.content[0].text).connected,false);
  await client.close();
});
