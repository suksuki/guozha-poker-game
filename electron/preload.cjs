/**
 * Electron预加载脚本
 * 在渲染进程和主进程之间提供安全的通信桥梁
 */

const { contextBridge } = require('electron');

// 过滤 Electron CSP 警告（开发环境）
const originalWarn = console.warn;
console.warn = function(...args) {
  // 过滤 Electron CSP 警告
  if (args[0] && typeof args[0] === 'string' && 
      (args[0].includes('Content-Security-Policy') || 
       args[0].includes('Electron Security Warning') ||
       args[0].includes('Insecure Content-Security-Policy'))) {
    return; // 忽略 CSP 警告
  }
  originalWarn.apply(console, args);
};

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: process.versions,
  // 可以添加更多API，如文件系统访问等
});

