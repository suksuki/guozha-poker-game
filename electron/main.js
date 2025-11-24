import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 在应用启动前设置字符编码环境变量（Windows/WSL环境）
if (process.platform === 'win32' || process.platform === 'linux') {
  process.env.LANG = 'zh_CN.UTF-8';
  process.env.LC_ALL = 'zh_CN.UTF-8';
  process.env.LC_CTYPE = 'zh_CN.UTF-8';
  
  // 设置语音引擎环境变量（让Electron使用系统语音引擎）
  // 如果speech-dispatcher未运行，尝试启动它
  if (process.platform === 'linux') {
    // 检查speech-dispatcher是否运行
    try {
      execSync('pgrep -x speech-dispatcher', { stdio: 'ignore' });
      console.log('[Electron] speech-dispatcher已在运行');
    } catch (e) {
      // 未运行，尝试启动（后台运行，不阻塞）
      try {
        execSync('speech-dispatcher -d', { stdio: 'ignore', detached: true });
        console.log('[Electron] 已启动speech-dispatcher');
        // 等待一下，让speech-dispatcher完全启动
        setTimeout(() => {}, 500);
      } catch (err) {
        console.warn('[Electron] 无法启动speech-dispatcher，请手动运行: speech-dispatcher -d');
        console.warn('[Electron] 或者安装: sudo apt-get install -y speech-dispatcher espeak espeak-data');
      }
    }
    
    // 设置环境变量，让Chromium能找到语音引擎
    process.env.SPEECHD_SPEECH_DISPATCHER = '1';
    process.env.SPEECHD_MODULE = 'espeak';
  }
}

// 在开发环境中禁用安全警告（因为 Vite 需要 unsafe-eval 进行 HMR）
// 注意：这个警告在生产环境中不会出现
if (isDev) {
  // 设置环境变量来禁用安全警告
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

// 禁用GPU加速（解决WSL/某些环境下的GPU错误）
// 注意：必须在app.whenReady()之前调用
app.disableHardwareAcceleration();

// 设置环境变量禁用Vulkan和WebGPU（Dawn）
process.env.DISABLE_VULKAN = '1';
process.env.DISABLE_DAWN = '1';

// 设置命令行参数，禁用GPU相关功能
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-webgl');
app.commandLine.appendSwitch('disable-webgl2');
app.commandLine.appendSwitch('disable-2d-canvas-image-chromium');
app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-accelerated-video-decode');
app.commandLine.appendSwitch('disable-vulkan');

// 在Linux上，启用语音合成支持
if (process.platform === 'linux') {
  // 不禁用语音合成相关功能
  // 让Electron使用系统的语音引擎
}

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
    // 开发环境：设置CSP和UTF-8编码
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      let contentType = responseHeaders['content-type']?.[0] || '';
      
      // 设置CSP
      responseHeaders['Content-Security-Policy'] = [
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* data: blob:;"
      ];
      
      // 强制为所有文本类型添加UTF-8编码（修复Windows/WSL乱码问题）
      if (contentType) {
        // 移除可能存在的旧charset
        contentType = contentType.split(';')[0].trim();
        
        // 为所有文本类型添加UTF-8
        if (contentType.includes('text/') || 
            contentType.includes('application/json') ||
            contentType.includes('application/javascript') ||
            contentType.includes('application/x-javascript') ||
            contentType.includes('application/ecmascript') ||
            contentType.includes('text/javascript') ||
            contentType.includes('text/css') ||
            contentType.includes('text/xml') ||
            contentType.includes('application/xml')) {
          responseHeaders['content-type'] = [contentType + '; charset=UTF-8'];
        }
      }
      
      callback({ responseHeaders });
    });
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true, // 确保窗口立即显示
    autoHideMenuBar: false, // 显示菜单栏（开发环境）
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      // 禁用硬件加速相关功能（解决WSL下的Vulkan错误）
      enableWebSQL: false,
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

  // 确保窗口显示并置于前台
  win.show();
  win.focus();

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
    // 在加载前设置编码相关选项
    win.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      callback({});
    });
    
    win.loadURL('http://localhost:3000', {
      extraHeaders: 'Content-Type: text/html; charset=UTF-8\n'
    });
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: {},
      search: ''
    });
  }
  
  // 在页面开始加载时就注入编码设置
  win.webContents.on('dom-ready', () => {
    win.webContents.executeJavaScript(`
      (function() {
        // 强制设置文档编码
        document.characterSet = 'UTF-8';
        document.charset = 'UTF-8';
        
        // 确保meta charset存在且正确
        let charsetMeta = document.querySelector('meta[charset]');
        if (!charsetMeta) {
          charsetMeta = document.createElement('meta');
          charsetMeta.setAttribute('charset', 'UTF-8');
          document.head.insertBefore(charsetMeta, document.head.firstChild);
        } else {
          charsetMeta.setAttribute('charset', 'UTF-8');
        }
        
        // 也设置http-equiv方式
        let httpEquivMeta = document.querySelector('meta[http-equiv="Content-Type"]');
        if (!httpEquivMeta) {
          httpEquivMeta = document.createElement('meta');
          httpEquivMeta.setAttribute('http-equiv', 'Content-Type');
          httpEquivMeta.setAttribute('content', 'text/html; charset=UTF-8');
          document.head.insertBefore(httpEquivMeta, document.head.firstChild);
        } else {
          httpEquivMeta.setAttribute('content', 'text/html; charset=UTF-8');
        }
        
        console.log('[编码修复] 文档字符集已设置为:', document.characterSet);
      })();
    `);
  });

  // 在页面加载完成后，确保文档编码正确和字体设置
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      (function() {
        // 再次确保编码正确
        document.characterSet = 'UTF-8';
        document.charset = 'UTF-8';
        
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
        console.log('[编码检查] 文档字符集:', document.characterSet);
        console.log('[编码检查] 文档语言:', document.documentElement.lang);
        if (document.characterSet !== 'UTF-8') {
          console.error('❌ 文档字符集不是UTF-8，当前是:', document.characterSet);
        } else {
          console.log('✅ 文档字符集正确: UTF-8');
        }
        
        // 强制注入全局字体样式（确保所有元素都使用中文字体，同时支持emoji）
        const style = document.createElement('style');
        style.id = 'electron-chinese-font-fix';
        style.textContent = \`
          /* 普通文本使用中文字体 */
          *:not(.avatar-emoji):not([class*="emoji"]):not([class*="icon"]) {
            font-family: 'Microsoft YaHei', '微软雅黑', 'SimHei', '黑体', 'SimSun', '宋体', 
                         'PingFang SC', 'Hiragino Sans GB', 'STHeiti', '华文黑体',
                         -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          }
          body {
            font-family: 'Microsoft YaHei', '微软雅黑', 'SimHei', '黑体', 'SimSun', '宋体', 
                         'PingFang SC', 'Hiragino Sans GB', 'STHeiti', '华文黑体',
                         -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          }
          /* Emoji和图标元素使用系统emoji字体 */
          .avatar-emoji,
          [class*="emoji"],
          [class*="icon"],
          .trophy-icon,
          button:has(> *:first-child:matches([class*="emoji"], [class*="icon"])),
          *:has(> *:first-child:matches([class*="emoji"], [class*="icon"])) {
            font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 
                         'Noto Color Emoji', 'EmojiOne Color', 'Twemoji Mozilla',
                         'Android Emoji', 'EmojiSymbols', 'EmojiOne Mozilla',
                         'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Emoji',
                         'Apple Color Emoji', 'Android Emoji', 'EmojiSymbols',
                         'EmojiOne', 'Twemoji', 'Noto Color Emoji',
                         'Microsoft YaHei', '微软雅黑', sans-serif !important;
            font-feature-settings: 'liga', 'kern' !important;
            text-rendering: optimizeLegibility !important;
          }
        \`;
        if (!document.getElementById('electron-chinese-font-fix')) {
          document.head.appendChild(style);
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

app.whenReady().then(() => {
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

