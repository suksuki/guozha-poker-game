# Electron 打包配置指南

## 概述

将Vite + React应用打包成Electron桌面应用，支持多声道语音播放。

## 安装Electron

```bash
npm install --save-dev electron electron-builder
npm install --save-dev @types/electron
```

## 项目结构

创建以下文件：

### 1. electron/main.js (Electron主进程)

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
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
```

### 2. electron/preload.js (预加载脚本)

```javascript
const { contextBridge } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: process.versions
});
```

### 3. 更新 package.json

添加以下脚本和配置：

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:pack": "npm run build && electron-builder --dir"
  },
  "build": {
    "appId": "com.guozha.poker",
    "productName": "过炸扑克",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.games"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

### 4. 安装额外依赖

```bash
npm install --save-dev concurrently wait-on
```

## 多声道支持

Electron基于Chromium，仍然使用浏览器的SpeechSynthesis API。要实现真正的多声道，需要：

1. **使用Web Audio API混合多个音频源**
2. **使用原生音频库**（如通过Node.js原生模块）

### 方案1：Web Audio API混合（推荐）

在`multiChannelVoiceService.ts`中已经实现了基础的多声道支持。在Electron中，Web Audio API的行为与浏览器相同。

### 方案2：原生音频库

如果需要更强的多声道控制，可以考虑：
- 使用`node-speaker`（Linux/Mac）
- 使用`win-audio`（Windows）
- 通过Electron的IPC与主进程通信，在主进程中使用原生音频库

## 运行和打包

### 开发模式

```bash
npm run electron:dev
```

### 打包应用

```bash
# 打包当前平台
npm run electron:build

# 仅打包不生成安装程序
npm run electron:pack
```

## 注意事项

1. **多声道限制**：Electron仍然基于Chromium，SpeechSynthesis API的单声道限制仍然存在
2. **Web Audio API**：可以使用Web Audio API实现多声道混合，但需要额外的音频处理
3. **性能**：Electron应用比原生应用占用更多资源
4. **打包大小**：Electron应用通常较大（100MB+）

## 替代方案

如果多声道是核心需求，考虑：
1. **React Native** - 移动应用，支持多声道
2. **Tauri** - 更轻量的桌面应用框架
3. **原生应用** - 完全控制，但开发成本高

