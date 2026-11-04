const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('studio', {
  status: () => ipcRenderer.invoke('studio:status'),
  operation: input => ipcRenderer.invoke('studio:operation', input),
  chooseMedia: () => ipcRenderer.invoke('studio:choose-media'),
  copyKey: () => ipcRenderer.invoke('studio:copy-key'),
  panel: () => ipcRenderer.invoke('studio:panel'),
  launchPremiere: () => ipcRenderer.invoke('studio:launch-premiere')
});
