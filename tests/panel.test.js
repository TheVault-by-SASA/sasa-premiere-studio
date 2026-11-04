import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('UXP startup tolerates null input values and retries delayed network permissions',async()=>{
  const source=await readFile(new URL('../apps/premiere-panel/index.js',import.meta.url),'utf8');
  const elements=new Map(['token','status','connection-toggle','connection-icon','detail'].map(id=>[id,{value:null,textContent:'',style:{},attributes:{},handlers:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,fn){this.handlers[k]=fn;}}]));
  let initialize, entrypoints, retries=[], attempts=0, socket;
  const context={require(name){
    if(name==='uxp')return {host:{version:'26.5'},entrypoints:{setup(value){assert.equal(typeof value.plugin.create,'function');entrypoints=value;}}};
    if(name==='premierepro')return {};
    if(name==='./adapter.js')return {createAdapter:()=>({capabilities:['host.info']})};
    if(name==='./agent-ui.js')return {createAgentUI:()=>({initialize(){},connected(){},disconnected(){},render(){}})};
    if(name==='./session.json')return {port:32145,token:'test-credential'};
    throw new Error('Unexpected require');
  },document:{getElementById:id=>elements.get(id),addEventListener(_name,fn){initialize=fn;}},setTimeout(fn){retries.push(fn);return retries.length;},clearTimeout(){},
    WebSocket:class {constructor(url){assert.equal(url,'ws://localhost:32145/premiere');if(++attempts===1)throw new Error('Manifest permissions not ready');socket=this;this.readyState=0;} send(text){this.sent=JSON.parse(text);} close(){this.readyState=3;this.onclose({code:1000});} }
  };
  vm.runInNewContext(source,context);
  initialize(); assert.equal(retries.length,1); retries.shift()();
  socket.onopen(); assert.equal(socket.sent.type,'hello'); assert.equal(socket.sent.token,'test-credential');
  entrypoints.panels['studio-panel'].show(); assert.equal(attempts,2);
  socket.readyState=1;socket.onmessage({data:JSON.stringify({type:'welcome'})});
  const toggle=elements.get('connection-toggle');
  assert.equal(toggle.attributes['aria-pressed'],'true');
  toggle.handlers.click();
  assert.equal(socket.readyState,3);assert.equal(toggle.attributes['aria-pressed'],'false');
  assert.equal(toggle.disabled,false);assert.equal(retries.length,0,'manual disconnect must not schedule reconnect');
  toggle.handlers.click();assert.equal(attempts,3);
  socket.readyState=1;socket.onmessage({data:JSON.stringify({type:'welcome'})});
  assert.equal(toggle.attributes['aria-pressed'],'true');
  socket.readyState=3;socket.onclose({code:1006});
  assert.equal(toggle.attributes['aria-pressed'],'false');assert.equal(retries.length,1);
});
