const { contextBridge, ipcRenderer } = require('electron');

// Expose safe desktop capabilities to the renderer
contextBridge.exposeInMainWorld('desktopApp', {
  isDesktop: true,
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0',
  startOctoProfile: (args) => ipcRenderer.invoke('octo:startProfile', args),
  stopOctoProfile: (args) => ipcRenderer.invoke('octo:stopProfile', args),
  checkOctoClient: () => ipcRenderer.invoke('octo:checkClient')
});
