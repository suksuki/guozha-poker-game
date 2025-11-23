import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 在开发环境中禁用安全警告（因为 Vite 需要 unsafe-eval 进行 HMR）
// 注意：这个警告在生产环境中不会出现
if (isDev) {
  // 设置环境变量来禁用安全警告
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

// 设置 Content Security Policy
function setupCSP() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* data: blob:;"
            : "default-src 'self' 'unsafe-inline' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        ]
      }
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true
    },
    icon: path.join(__dirname, '../assets/icon.png') // 可选：应用图标
  });

  // 在开发环境中过滤 CSP 警告
  if (isDev) {
    win.webContents.on('console-message', (event, level, message) => {
      if (message && message.includes('Content-Security-Policy')) {
        event.preventDefault(); // 阻止警告显示
      }
    });
  }

  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 开发模式下自动打开DevTools
  if (isDev) {
    win.webContents.on('did-frame-finish-load', () => {
      win.webContents.openDevTools();
    });
  }
}

app.whenReady().then(() => {
  // 设置 CSP
  setupCSP();
  
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

// 处理证书错误（开发环境）
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

