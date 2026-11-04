import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('panel displays reported totals, sends chosen model/effort, and preserves draft on failure',async()=>{
  class Element {
    constructor(){this.children=[];this.handlers={};this.style={};this.attributes={};this.value='';this.textContent='';this.selectedIndex=-1;this.scrollHeight=0;this.scrollTop=0;this.clientHeight=0;}
    get firstChild(){return this.children[0];} removeChild(n){this.children.splice(this.children.indexOf(n),1);}
    appendChild(n){this.children.push(n);}setAttribute(key,value){this.attributes[key]=value;}getAttribute(key){return this.attributes[key];}addEventListener(name,fn){this.handlers[name]=fn;}
  }
  const elements=new Map();const doc={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement(){return new Element();}};
  const context={module:{exports:{}},document:doc};vm.runInNewContext(await readFile(new URL('../apps/premiere-panel/agent-ui.js',import.meta.url),'utf8'),context);
  const state={connected:true,busy:false,model:'one',effort:'low',models:[{model:'one',name:'One',efforts:['low','high'],defaultEffort:'low'},{model:'two',name:'Two',efforts:['high'],defaultEffort:'high'}],messages:[],requests:[],usage:{total:{totalTokens:1200,inputTokens:1000,outputTokens:200}},turnTokens:1200};
  const calls=[];let fail=false;
  const ui=context.module.exports.createAgentUI(async cmd=>{calls.push(cmd);if(fail)throw new Error('No confirmado');if(cmd.action==='select')Object.assign(state,{model:cmd.model,effort:cmd.effort});return state;},doc);
  ui.initialize();ui.connected();await new Promise(r=>setImmediate(r));
  assert.equal(doc.getElementById('tokens-total').textContent,'1200');
  assert.equal(doc.getElementById('send').disabled,true);
  doc.getElementById('model-toggle').handlers.click();assert.equal(doc.getElementById('model-menu').style.display,'block');
  doc.getElementById('usage-toggle').handlers.click();assert.equal(doc.getElementById('model-menu').style.display,'none');assert.equal(doc.getElementById('usage-details').style.display,'block');
  doc.getElementById('model').selectedIndex=1;doc.getElementById('model').handlers.change();await new Promise(r=>setImmediate(r));
  assert.equal(calls.at(-1).model,'two');assert.equal(calls.at(-1).effort,'high');
  fail=true;doc.getElementById('prompt').value='Consulta';await doc.getElementById('send').handlers.click();assert.equal(doc.getElementById('prompt').value,'Consulta');
  assert.equal(doc.getElementById('agent-error').textContent,'No confirmado');
  ui.disconnected();assert.equal(doc.getElementById('send').disabled,true);
});
