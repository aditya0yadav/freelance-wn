const { app, BrowserWindow, shell, protocol, net, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Register custom protocol scheme before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: false,
      supportFetchAPI: true,
      corsEnabled: false,
      stream: true,
    },
  },
]);

const isDev = process.env.ELECTRON_DEV === '1' || !app.isPackaged;
let mainWindow = null;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' },
            ]
          : [{ role: 'close' }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const iconPath = path.join(__dirname, '../public/images/logo.png');

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    title: 'Wanhong Survey',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#0b0f19',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      sandbox: false,
    },
  });

  // Intercept window.open calls to open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadURL('app://./index.html');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Setup custom protocol handler for SPA routing in packaged app
function setupProtocol() {
  protocol.handle('app', (request) => {
    try {
      const parsedUrl = new URL(request.url);
      let pathname = decodeURIComponent(parsedUrl.pathname);
      if (pathname.startsWith('/')) {
        pathname = pathname.slice(1);
      }

      const distDir = path.join(__dirname, '../dist');
      let targetFile = path.join(distDir, pathname);

      // SPA fallback: if file does not exist or is a directory, fallback to dist/index.html
      if (!fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
        targetFile = path.join(distDir, 'index.html');
      }

      return net.fetch(pathToFileURL(targetFile).toString());
    } catch (err) {
      console.error('Failed to handle app protocol:', err);
      const fallback = path.join(__dirname, '../dist/index.html');
      return net.fetch(pathToFileURL(fallback).toString());
    }
  });
}

app.whenReady().then(() => {
  createMenu();
  if (!isDev) {
    setupProtocol();
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// =========================================================================
// Octo / Doge Local Client IPC Handlers (for Windows Laptop Desktop App)
// Allows Desktop App to launch profiles on localhost even when backend is hosted remotely!
// =========================================================================
const OCTO_PORTS = [46666, 58888, 50888, 59999];

ipcMain.handle('octo:checkClient', async () => {
  for (const port of OCTO_PORTS) {
    try {
      const res = await net.fetch(`http://127.0.0.1:${port}/api/profiles`, { method: 'GET' });
      if (res.ok || res.status === 401 || res.status === 403) {
        return { active: true, port };
      }
    } catch (e) {}
  }
  return { active: false };
});

ipcMain.handle('octo:startProfile', async (event, { uuid, targetUrl }) => {
  const flags = ['--start-maximized', '--no-default-browser-check'];
  if (targetUrl) {
    flags.unshift(targetUrl);
  }
  const payload = {
    uuid,
    headless: false,
    debug_port: true,
    timeout: 120,
    flags
  };

  let lastErr = null;
  for (const port of OCTO_PORTS) {
    try {
      const res = await net.fetch(`http://127.0.0.1:${port}/api/profiles/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return { success: true, port, data };
    } catch (err) {
      lastErr = err;
    }
  }
  return { success: false, error: lastErr?.message || 'Local Octo / Doge browser client not responding' };
});

ipcMain.handle('octo:stopProfile', async (event, { uuid }) => {
  for (const port of OCTO_PORTS) {
    try {
      const res = await net.fetch(`http://127.0.0.1:${port}/api/profiles/force_stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid })
      });
      const data = await res.json();
      return { success: true, data };
    } catch (e) {}
  }
  return { success: false };
});
