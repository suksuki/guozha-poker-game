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

// 禁用GPU加速（解决WSL/某些环境下的GPU错误）
// 注意：必须在app.whenReady()之前调用
app.disableHardwareAcceleration();

// 设置命令行参数，禁用GPU相关功能
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer');

// 设置 Content Security Policy 和字符编码
function setupCSP() {
  // 在开发环境中，完全禁用响应头拦截，让Vite自己处理所有Content-Type
  // 只在生产环境中设置CSP和charset
  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      const contentType = responseHeaders['content-type']?.[0] || '';
      
      // 设置CSP
      responseHeaders['Content-Security-Policy'] = [
        "default-src 'self' 'unsafe-inline' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
      ];
      
      // 只对HTML文件添加charset
      if (contentType.includes('text/html') && !contentType.includes('charset')) {
        responseHeaders['content-type'] = [contentType + '; charset=UTF-8'];
      }
      
      callback({ responseHeaders });
    });
  } else {
    // 开发环境：只设置CSP，不修改任何Content-Type
    // 使用beforeRequest来设置CSP，避免影响响应头
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      // 不拦截，让请求正常进行
      callback({});
    });
    
    // 只在响应头中添加CSP，不修改Content-Type
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      
      // 只设置CSP，不修改Content-Type
      responseHeaders['Content-Security-Policy'] = [
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* data: blob:;"
      ];
      
      callback({ responseHeaders });
    });
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      // 设置默认字体，确保中文显示正常
      defaultFontFamily: {
        standard: 'Microsoft YaHei',
        serif: 'SimSun',
        sansSerif: 'Microsoft YaHei',
        monospace: 'Consolas'
      },
      defaultFontSize: 14,
      defaultMonospaceFontSize: 14
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
    // 直接加载URL，编码由响应头控制
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: {},
      search: ''
    });
  }
  
  // 在页面加载完成后，确保文档编码正确
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      (function() {
        // 确保meta charset存在
        if (!document.querySelector('meta[charset]')) {
          const meta = document.createElement('meta');
          meta.setAttribute('charset', 'UTF-8');
          document.head.insertBefore(meta, document.head.firstChild);
        }
        
        // 确保所有meta charset都是UTF-8
        const charsetMeta = document.querySelector('meta[charset]');
        if (charsetMeta) {
          charsetMeta.setAttribute('charset', 'UTF-8');
        }
        
        // 设置文档字符集
        console.log('文档字符集:', document.characterSet);
        console.log('文档语言:', document.documentElement.lang);
        if (document.characterSet !== 'UTF-8') {
          console.warn('⚠️ 文档字符集不是UTF-8，当前是:', document.characterSet);
        }
        
        // 强制设置body字体
        document.body.style.fontFamily = "'Microsoft YaHei', '微软雅黑', 'SimHei', '黑体', 'SimSun', '宋体', sans-serif";
        
        // 测试中文显示
        const testDiv = document.createElement('div');
        testDiv.textContent = '测试中文：过炸扑克游戏';
        testDiv.style.position = 'fixed';
        testDiv.style.top = '10px';
        testDiv.style.right = '10px';
        testDiv.style.background = 'rgba(0,0,0,0.8)';
        testDiv.style.color = 'white';
        testDiv.style.padding = '10px';
        testDiv.style.zIndex = '99999';
        testDiv.style.fontSize = '16px';
        testDiv.id = 'encoding-test';
        if (!document.getElementById('encoding-test')) {
          document.body.appendChild(testDiv);
          setTimeout(() => {
            const testEl = document.getElementById('encoding-test');
            if (testEl) testEl.remove();
          }, 3000);
        }
      })();
    `).catch(err => {
      console.error('设置页面编码失败:', err);
    });
  });

  // 开发模式下自动打开DevTools
  if (isDev) {
    win.webContents.on('did-frame-finish-load', () => {
      win.webContents.openDevTools();
      
      // 设置DevTools字体大小和中文支持
      // 注意：DevTools有自己的窗口，需要在DevTools窗口中设置
      win.webContents.on('devtools-opened', () => {
        // 延迟执行，确保DevTools完全加载
        setTimeout(() => {
          win.webContents.executeJavaScript(`
            (function() {
              try {
                const style = document.createElement('style');
                style.id = 'devtools-chinese-font';
                style.textContent = \`
                  * {
                    font-family: 'Microsoft YaHei', '微软雅黑', 'Consolas', 'Courier New', monospace !important;
                    font-size: 14px !important;
                  }
                  .console-message-text,
                  .console-message,
                  .console-view-object-properties-section,
                  .console-view-object-properties-section * {
                    font-size: 14px !important;
                    line-height: 1.6 !important;
                  }
                  .source-code,
                  .monospace,
                  code {
                    font-size: 14px !important;
                  }
                \`;
                if (!document.getElementById('devtools-chinese-font')) {
                  document.head.appendChild(style);
                }
              } catch(e) {
                console.error('设置DevTools字体失败:', e);
              }
            })();
          `).catch(err => {
            console.error('注入DevTools字体样式失败:', err);
          });
        }, 500);
      });
    });
  }
}

// 在应用启动前禁用GPU加速（解决WSL/某些环境下的GPU错误）
app.disableHardwareAcceleration();

// 设置命令行参数，禁用GPU相关功能
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(() => {
  // 设置默认编码环境变量（Windows/Linux）
  if (process.platform === 'win32') {
    process.env.LANG = 'zh_CN.UTF-8';
  }
  
  // 设置 CSP 和编码
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

