// Windows desktop shell: shows the offline calculator in its own window.
// Nothing is loaded from a server or the internet.
const { app, BrowserWindow, Menu, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const PAGE = path.join(__dirname, 'generated', 'calculator.html');
const PAGE_URL = require('node:url').pathToFileURL(PAGE).href;
const BOUNDS_FILE = () => path.join(app.getPath('userData'), 'window-bounds.json');

// The calculator's natural size in CSS pixels (narrowest comfortable width, and
// the height at which everything fits with the LCD at its minimum). The page is
// zoomed so this always fits the window: smaller windows shrink the whole
// calculator instead of cutting off the bottom, larger ones enlarge it.
const BASE_WIDTH = 420;
const BASE_HEIGHT = 720;
const fitZoom = (width, height) => Math.min(3, Math.max(0.4, Math.min(width / BASE_WIDTH, height / BASE_HEIGHT)));

if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function fitToWindow() {
  if (!win || win.isDestroyed()) return;
  const [width, height] = win.getContentSize();
  win.webContents.setZoomFactor(fitZoom(width, height));
}

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
    minWidth: 240,
    minHeight: 400,
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

  win.once('ready-to-show', () => { fitToWindow(); win.show(); });
  win.webContents.on('did-finish-load', () => {
    win.webContents.setVisualZoomLevelLimits(1, 1);
    fitToWindow();
  });
  win.on('resize', fitToWindow);
  win.on('maximize', fitToWindow);
  win.on('unmaximize', fitToWindow);
  // Ctrl+scroll or keyboard zoom would undo the fit, so put it back.
  win.webContents.on('zoom-changed', () => setImmediate(fitToWindow));
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
