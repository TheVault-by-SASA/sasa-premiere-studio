import { createEngine } from './server.js';
import { engineCall } from './client.js';

// Each MCP connection can supply the service if no other local client owns it.
// Starting the listener is atomic; a concurrent client must authenticate to it.
export function engineLifecycle(config) {
  let owned = null, pending = null, closing = null;
  async function start() {
    try {
      const status = await engineCall(config, '/status');
      if (status.app !== 'sasa-premiere-studio') throw new Error('El puerto pertenece a otra aplicación.');
      return;
    } catch (error) {
      if (error.code !== 'ENGINE_OFFLINE') throw error;
    }
    try { owned = await createEngine(config); }
    catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
      const status = await engineCall(config, '/status');
      if (status.app !== 'sasa-premiere-studio') throw new Error('El puerto pertenece a otra aplicación.');
    }
  }
  return {
    async ensure() {
      if (!pending) pending = start().finally(() => { pending = null; });
      await pending;
    },
    close() {
      if (!closing) closing = (async () => {
        if (pending) await pending.catch(() => {});
        if (owned) { await owned.close(); owned = null; }
      })();
      return closing;
    }
  };
}
