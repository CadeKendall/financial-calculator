// Windows desktop shell: shows the offline calculator in its own window.
// Nothing is loaded from a server or the internet.
const { app, BrowserWindow, Menu, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const PAGE = path.join(__dirname, 'generated', 'calculator.html');
const PAGE_URL = require('node:url').pathToFileURL(PAGE).href;
const BOUNDS_FILE = () => path.join(app.getPath('userData'), 'window-bounds.json');

if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function savedBounds() {
  try {
    const b = JSON.parse(fs.readFileSync(BOUNDS_FILE(), 'utf8'));
    if ([b.width, b.height].every(Number.isFinite)) return b;
  } catch { /* first launch or unreadable file: use defaults */ }
  return { width: 440, height: 880 };
}

function createWindow() {
  win = new BrowserWindow({
    ...savedBounds(),
    minWidth: 360,
    minHeight: 640,
    title: 'Financial Calculator',
    icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: '#272a29',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.on('close', () => {
    try { fs.writeFileSync(BOUNDS_FILE(), JSON.stringify(win.getNormalBounds())); } catch { /* not critical */ }
  });

  // Stay on the calculator page: block navigation, and open real web links
  // (if any) in the user's browser instead of inside the app.
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== PAGE_URL) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadFile(PAGE);
}

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  // The Copy key writes to the system clipboard; nothing else is allowed.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'clipboard-sanitized-write');
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'clipboard-sanitized-write');
  createWindow();
});

app.on('window-all-closed', () => app.quit());
