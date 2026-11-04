const { app, BrowserWindow, ipcMain, dialog, clipboard, shell } = require('electron');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const { existsSync, readdirSync } = require('node:fs');
if (process.env.SASA_STUDIO_USER_DATA) app.setPath('userData', process.env.SASA_STUDIO_USER_DATA);
let ownedEngine = null, window = null, config, client, panel;
const moduleAt = relative => import(pathToFileURL(join(__dirname, '..', '..', relative)).href);
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { window.restore(); window.focus(); } });
  app.whenReady().then(async () => {
    const { loadConfig } = await moduleAt('services/local-engine/config.js');
    const { createEngine } = await moduleAt('services/local-engine/server.js');
    const { engineCall } = await moduleAt('services/local-engine/client.js');
    const { stagePanel } = await moduleAt('scripts/stage-panel.js');
    const { operationSchema } = await moduleAt('packages/contracts/index.js');
    config = await loadConfig(); client = engineCall;
    try { ownedEngine = await createEngine(config); }
    catch (error) { if (error.code !== 'EADDRINUSE') throw error; const status = await client(config, '/status'); if (status.app !== 'sasa-premiere-studio') throw new Error('El puerto está ocupado por otra aplicación.'); }
    panel = await stagePanel(config);
    const register = (name, fn) => ipcMain.handle(name, async (event, ...args) => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Emisor no permitido.');
      try { return { ok: true, result: await fn(...args) }; }
      catch (error) { return { ok: false, error: { code: error.code || 'APP_ERROR', message: error.message } }; }
    });
    register('studio:status', () => client(config, '/status'));
    register('studio:operation', async input => { const request = operationSchema.parse(input); return (await client(config, '/operations', request)).result; });
    register('studio:choose-media', async () => {
      const selection = await dialog.showOpenDialog(window, { title: 'Seleccionar medio', properties: ['openFile'], filters: [
        { name: 'Video y audio', extensions: ['mp4','mov','mxf','avi','mkv','webm','wav','mp3','aif','aiff','flac'] }, { name: 'Todos los archivos', extensions: ['*'] }
      ] });
      if (selection.canceled) return null;
      return (await client(config, '/operations', { operation: 'media.probe', params: { path: selection.filePaths[0] } })).result;
    });
    register('studio:copy-key', () => { clipboard.writeText(config.token); return true; });
    register('studio:panel', async () => { panel = await stagePanel(config); shell.showItemInFolder(panel); return panel; });
    register('studio:launch-premiere', () => {
      let executable = process.env.SASA_PREMIERE_EXECUTABLE;
      if (!executable && process.platform === 'win32') {
        const adobe = join(process.env.ProgramFiles || 'C:\\Program Files', 'Adobe');
        const versions = existsSync(adobe) ? readdirSync(adobe).filter(n => n.startsWith('Adobe Premiere Pro ')).sort().reverse() : [];
        executable = versions.map(n => join(adobe, n, 'Adobe Premiere Pro.exe')).find(existsSync);
      }
      if (!executable || !existsSync(executable)) throw new Error('Abre Premiere desde Creative Cloud o configura SASA_PREMIERE_EXECUTABLE con la ruta del ejecutable.');
      const child = spawn(executable, [], { detached: true, stdio: 'ignore', windowsHide: true }); child.on('error', () => {}); child.unref(); return true;
    });
    window = new BrowserWindow({ width: 1180, height: 820, minWidth: 850, minHeight: 640, title: 'SASA Premiere Studio', backgroundColor: '#111318',
      webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    window.removeMenu(); window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', event => event.preventDefault());
    window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    await window.loadFile(join(__dirname, 'index.html'));
    if (process.env.SASA_STUDIO_SCREENSHOT) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const image = await window.webContents.capturePage();
      require('node:fs').writeFileSync(process.env.SASA_STUDIO_SCREENSHOT, image.toPNG());
    }
  }).catch(error => { dialog.showErrorBox('SASA Premiere Studio', error.message); app.quit(); });
  app.on('window-all-closed', () => app.quit());
  let closing = false;
  app.on('before-quit', event => { if (ownedEngine && !closing) { event.preventDefault(); closing = true; ownedEngine.close().finally(() => app.quit()); } });
}
