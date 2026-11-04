function createAgentUI(send, doc = document) {
  const el = id => doc.getElementById(id);
  let state = null, rendering = false, pending = false, online = false, historyKey = '', requestsKey = '', modelKey = '';
  const names = { none:'Sin razonamiento', minimal:'Mínimo', low:'Bajo', medium:'Medio', high:'Alto', xhigh:'Muy alto', max:'Máximo', ultra:'Ultra' };
  const number = value => typeof value === 'number' ? Math.round(value).toLocaleString('es-ES') : '—';
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function textNode(tag, text, parent, className) {
    const node = doc.createElement(tag); node.textContent = text;
    if (className) node.className = className;
    parent.appendChild(node); return node;
  }
  function options(id, list, selected) {
    const menu = el(id + '-options'); clear(menu);
    list.forEach((item, index) => { const node = textNode('sp-menu-item', item.label, menu); if (index === selected) node.setAttribute('selected', ''); });
    el(id).selectedIndex = selected;
  }
  function controls() {
    const busy = pending || !online || !state?.connected || state?.busy;
    for (const id of ['model','effort','model-toggle','new-session']) el(id).disabled = !!busy;
    el('send').disabled = !!busy || !String(el('prompt').value || '').trim();
    el('send').style.display = state?.busy ? 'none' : 'flex';
    el('stop').style.display = state?.busy ? 'flex' : 'none';
    el('stop').disabled = !online || !state?.busy || !state?.turnId;
    el('agent-connect').disabled = pending || !online || !!state?.busy;
  }
  async function command(value) {
    pending = true; controls(); el('agent-error').textContent = '';
    try { const next = await send(value); render(next); return true; }
    catch (error) { el('agent-error').textContent = error.message; return false; }
    finally { pending = false; controls(); }
  }
  function render(next) {
    if (!next) return;
    state = next; rendering = true;
    const models = state.models || [];
    const selected = models.findIndex(m => m.model === state.model);
    const model = models[selected];
    el('model-name').textContent = model?.name || 'Codex';
    el('effort-name').textContent = ' ' + (names[state.effort] || state.effort || '') + ' ';
    const key = JSON.stringify([models, state.model, state.effort]);
    if (key !== modelKey) {
      options('model', models.map(m => ({label:m.name})), selected);
      options('effort', (model?.efforts || []).map(e => ({label:names[e] || e})), model?.efforts.indexOf(state.effort) ?? -1);
      modelKey = key;
    }
    el('agent-status').textContent = state.status;
    el('agent-error').textContent = state.error || '';
    el('tokens-total').textContent = number(state.usage?.total?.totalTokens);
    el('tokens-input').textContent = number(state.usage?.total?.inputTokens);
    el('tokens-output').textContent = number(state.usage?.total?.outputTokens);
    el('tokens-turn').textContent = number(state.turnTokens);
    el('tokens-note').textContent = state.usageUpdatedAt ? 'Uso confirmado · actualizado ' + new Date(state.usageUpdatedAt).toLocaleTimeString('es-ES') : 'El consumo aparecerá cuando Codex lo confirme.';
    const messages = state.messages || [];
    const nextHistory = JSON.stringify(messages);
    if (nextHistory !== historyKey) {
      const history = el('messages');
      const follow = history.scrollHeight - history.scrollTop - history.clientHeight < 60;
      clear(history);
      if (!messages.length) textNode('p', 'Dime qué quieres hacer con tu proyecto.', history, 'muted');
      for (const message of messages) {
        const card = doc.createElement('div'); card.className = 'message ' + (message.role === 'user' ? 'user' : 'assistant');
        textNode('small', message.role === 'user' ? 'TÚ' : 'CODEX', card);
        textNode('div', message.text, card, 'message-text'); history.appendChild(card);
      }
      if (follow) history.scrollTop = history.scrollHeight;
      historyKey = nextHistory;
    }
    const requests = state.requests || [];
    const nextRequests = JSON.stringify(requests);
    if (nextRequests !== requestsKey) {
      clear(el('requests'));
      for (const request of requests) {
        const card = doc.createElement('div'); card.className = 'request';
        if (request.kind === 'approval') {
          textNode('p', request.title, card); textNode('div', request.detail, card, 'message-text');
          for (const decision of ['accept','decline']) {
            const button = textNode('button', decision === 'accept' ? 'Autorizar esta vez' : 'Rechazar', card);
            button.addEventListener('click', () => command({action:'answer',requestId:request.id,decision}));
          }
        } else {
          const fields = [];
          for (const question of request.questions) {
            textNode('p', question.question, card);
            const input = doc.createElement('input'); input.type = question.isSecret ? 'password' : 'text'; input.placeholder = 'Tu respuesta';
            if (question.options) for (const option of question.options) {
              const button = textNode('button', option.label, card); button.addEventListener('click', () => { input.value = option.label; });
            }
            card.appendChild(input); fields.push({id:question.id,input});
          }
          const button = textNode('button', 'Responder', card);
          button.addEventListener('click', () => { const answers = {}; fields.forEach(f => { answers[f.id] = String(f.input.value || ''); }); command({action:'answer',requestId:request.id,answers}); });
        }
        el('requests').appendChild(card);
      }
      requestsKey = nextRequests;
    }
    rendering = false; controls();
  }
  function initialize() {
    const toggle = (button, panel) => {
      el(button).addEventListener('click', () => {
        const open = el(panel).style.display !== 'block';
        for (const other of ['model-menu','pairing','usage-details']) el(other).style.display = 'none';
        for (const other of ['model-toggle','settings-toggle','usage-toggle']) el(other).setAttribute('aria-expanded','false');
        el(panel).style.display = open ? 'block' : 'none';
        el(button).setAttribute('aria-expanded',String(open));
      });
    };
    toggle('model-toggle','model-menu'); toggle('settings-toggle','pairing'); toggle('usage-toggle','usage-details');
    el('agent-connect').addEventListener('click', () => command({action:'connect'}));
    el('model').addEventListener('change', () => {
      if (rendering || pending || state?.busy) return;
      const model = state?.models[el('model').selectedIndex];
      if (model) command({action:'select',model:model.model,effort:model.defaultEffort || model.efforts[0]});
    });
    el('effort').addEventListener('change', () => {
      if (rendering || pending || state?.busy) return;
      const model = state?.models.find(m => m.model === state.model);
      const effort = model?.efforts[el('effort').selectedIndex];
      if (effort) command({action:'select',model:model.model,effort});
    });
    const submit = async () => {
      if (pending || state?.busy || !online || !state?.connected) return;
      const text = String(el('prompt').value || '').trim(); if (!text) return;
      el('model-menu').style.display = 'none'; el('model-toggle').setAttribute('aria-expanded','false');
      el('tooltip').style.display = 'none';
      if (await command({action:'send',text})) {
        if (String(el('prompt').value || '').trim() === text) el('prompt').value = '';
      }
      controls();
    };
    el('send').addEventListener('click', submit);
    el('prompt').addEventListener('input', controls);
    el('prompt').addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); submit(); }
      if (event.key === 'Escape') { el('model-menu').style.display = 'none'; el('model-toggle').setAttribute('aria-expanded','false'); }
    });
    el('stop').addEventListener('click', () => command({action:'stop'}));
    el('new-session').addEventListener('click', () => command({action:'new'}));
    controls();
  }
  return { initialize, render, connected() { online = true; controls(); command({action:'connect'}); }, disconnected() { online = false; controls(); el('agent-status').textContent = 'Esperando la conexión con el servicio local…'; } };
}
module.exports = { createAgentUI };
