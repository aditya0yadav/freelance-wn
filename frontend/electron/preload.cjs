const { contextBridge } = require('electron');

// Expose safe desktop capabilities to the renderer
contextBridge.exposeInMainWorld('desktopApp', {
  isDesktop: true,
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0'
});
