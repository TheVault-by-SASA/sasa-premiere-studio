// Opt-in live integration check. Sends one bounded read-only request using the account's selected model.
import { loadConfig } from '../services/local-engine/config.js';
import { engineCall } from '../services/local-engine/client.js';
import { engineLifecycle } from '../services/local-engine/ensure.js';
const config = await loadConfig(), lifecycle = engineLifecycle(config);
const command = async input => (await engineCall(config, '/agent', input)).result;
let started = false;
try {
  await lifecycle.ensure();
  let state = await command({action:'connect'});
  if (state.busy) throw new Error('La sesión está ocupada; espera antes de ejecutar la prueba.');
  console.log(JSON.stringify({connected:state.connected,models:state.models.map(m=>m.model),selected:state.model,effort:state.effort}));
  const deadline = Date.now() + 120000;
  state = await command({action:'send',text:'Prueba de conexión del panel. Usa únicamente premiere_project_snapshot del MCP sasa-premiere-studio para consultar el proyecto activo. No edites ni guardes nada. Responde con una frase breve indicando su nombre.'}); started = true;
  while (state.busy && Date.now() < deadline) { await new Promise(resolve=>setTimeout(resolve,1000)); state = await engineCall(config,'/agent'); }
  if (state.busy) { await command({action:'stop'}); throw new Error('La prueba superó el plazo.'); }
  if (state.error || !state.usage?.total?.totalTokens) throw new Error(state.error || 'No se recibió consumo de tokens.');
  console.log(JSON.stringify({verified:true,model:state.model,usage:state.usage,reply:state.messages.at(-1)?.text}));
} finally {
  if (started) { const state = await engineCall(config,'/agent').catch(()=>null); if (state?.busy) await command({action:'stop'}).catch(()=>{}); }
  await lifecycle.close();
}
