# Electron安装指南

## 安装步骤

### 1. 安装Electron依赖

```bash
cd /Users/jin/dev/dev/guozha/guozha-poker-game
npm install --save-dev electron electron-builder concurrently wait-on
```

如果遇到权限问题，可以尝试：

```bash
# 清理npm缓存
npm cache clean --force

# 或者使用sudo（不推荐，但可以临时解决）
sudo npm install --save-dev electron electron-builder concurrently wait-on
```

### 2. 验证安装

```bash
npx electron --version
```

应该显示Electron版本号。

## 运行Electron应用

### 开发模式

```bash
npm run electron:dev
```

这会：
1. 启动Vite开发服务器
2. 等待服务器就绪
3. 启动Electron窗口

### 打包应用

```bash
# 打包当前平台
npm run electron:build

# 仅打包不生成安装程序
npm run electron:pack
```

打包后的应用在 `release/` 目录中。

## 多声道支持说明

### 当前状态

⚠️ **重要**：Electron仍然基于Chromium，`window.speechSynthesis` API的单声道限制仍然存在。

### 实现多声道的方案

1. **Web Audio API混合**（需要进一步实现）
   - 使用AudioWorklet处理多声道混合
   - 将每个玩家的语音分配到不同的声道

2. **TTS API + 音频文件**
   - 使用TTS API生成音频文件
   - 使用Web Audio API播放多个音频文件

3. **原生音频库**（Electron主进程）
   - 在Electron主进程中使用原生音频库
   - 通过IPC与渲染进程通信

详细说明请参考 `MULTI_CHANNEL_VOICE.md`。

## 故障排除

### 问题1：npm权限错误

如果遇到 `EACCES: permission denied` 错误，请按以下步骤修复：

**方法1：修复npm缓存目录权限（推荐）**
```bash
sudo chown -R $(whoami) ~/.npm
npm install --save-dev electron electron-builder concurrently wait-on
```

**方法2：使用修复脚本**
```bash
./fix-npm-permissions.sh
```

**方法3：完全清理npm缓存**
```bash
rm -rf ~/.npm
npm install --save-dev electron electron-builder concurrently wait-on
```

**方法4：删除特定有问题的缓存文件**
```bash
rm -rf ~/.npm/_cacache/content-v2/sha512/b4/fb
npm install --save-dev electron electron-builder concurrently wait-on
```

### 问题2：Electron窗口空白

检查：
1. Vite开发服务器是否正常运行
2. 控制台是否有错误信息
3. `electron/main.js` 中的URL是否正确

### 问题3：打包失败

检查：
1. `package.json` 中的 `build` 配置是否正确
2. 是否有足够的磁盘空间
3. 查看详细错误日志

## 下一步

1. 安装依赖后，运行 `npm run electron:dev` 测试
2. 查看 `MULTI_CHANNEL_VOICE.md` 了解多声道实现方案
3. 根据需求选择合适的多声道实现方案

