# Electron 资源加载问题修复指南

## 问题描述

在Ubuntu上运行Electron应用时，可能出现：
1. 卡通头像（emoji）不显示
2. 按钮图标不显示
3. 没有声音

## 解决方案

### 1. Emoji字体支持

#### 安装Emoji字体（Ubuntu）

```bash
# 安装Noto Color Emoji字体（推荐）
sudo apt-get update
sudo apt-get install fonts-noto-color-emoji

# 或者安装其他emoji字体
sudo apt-get install fonts-emojione
```

#### 验证字体安装

```bash
# 检查emoji字体
fc-list | grep -i emoji
```

应该看到类似输出：
```
/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf: Noto Color Emoji:style=Regular
```

#### 刷新字体缓存

```bash
fc-cache -fv
```

### 2. 代码修复

已更新的文件：

1. **`electron/main.js`** - 添加了emoji字体支持
2. **`src/index.css`** - 添加了emoji元素字体样式
3. **`src/components/game/DealingAnimation.css`** - 为头像emoji添加字体支持

### 3. 音频文件检查

#### 检查音频文件是否存在

```bash
ls -la public/sounds/
```

应该看到以下文件：
- `dun-small.aiff` 或 `dun-small.mp3`
- `dun-medium.aiff` 或 `dun-medium.mp3`
- `dun-large.aiff` 或 `dun-large.mp3`
- `dun-huge.aiff` 或 `dun-huge.mp3`
- `bomb.aiff` 或 `bomb.mp3`
- `explosion.aiff` 或 `explosion.mp3`

#### 如果音频文件缺失

根据 `public/sounds/README.md` 的说明下载音频文件。

#### 在Electron中调试音频

打开开发者工具（DevTools），在控制台运行：

```javascript
// 检查音频服务
import { soundService } from './services/soundService';
soundService.preloadSounds().then(() => {
  console.log('音频预加载完成');
  soundService.playSound('dun-small');
});
```

### 4. 资源路径问题

在Electron开发环境中，资源路径应该是：
- 开发模式：`http://localhost:3000/sounds/xxx.mp3`
- 生产模式：`file:///path/to/dist/sounds/xxx.mp3`

如果路径不对，检查：
1. Vite配置中的`publicDir`设置
2. Electron的`loadURL`或`loadFile`配置

### 5. 完整修复步骤

```bash
# 1. 安装emoji字体
sudo apt-get install fonts-noto-color-emoji
fc-cache -fv

# 2. 检查音频文件
ls -la public/sounds/

# 3. 如果音频文件缺失，根据README下载

# 4. 重启Electron应用
./start-electron.sh
```

### 6. 调试技巧

#### 检查Emoji显示

在开发者工具控制台运行：

```javascript
// 测试emoji显示
const testDiv = document.createElement('div');
testDiv.style.fontSize = '80px';
testDiv.textContent = '🤖👾👽👻🦾🏆🥈';
document.body.appendChild(testDiv);
```

#### 检查音频加载

在开发者工具控制台运行：

```javascript
// 测试音频文件
const audio = new Audio('/sounds/dun-small.aiff');
audio.addEventListener('canplaythrough', () => {
  console.log('✅ 音频文件可以播放');
  audio.play();
});
audio.addEventListener('error', (e) => {
  console.error('❌ 音频文件加载失败:', e);
});
```

#### 检查资源路径

在开发者工具Network标签中，查看：
- 音频文件请求是否成功（200状态码）
- 如果404，检查路径是否正确
- 如果CORS错误，检查Electron的webSecurity设置

### 7. 常见问题

#### 问题1：Emoji显示为方块或问号

**原因**：系统没有安装emoji字体

**解决**：
```bash
sudo apt-get install fonts-noto-color-emoji
fc-cache -fv
# 重启Electron应用
```

#### 问题2：音频文件404错误

**原因**：文件路径不正确或文件不存在

**解决**：
1. 检查文件是否存在：`ls -la public/sounds/`
2. 检查Vite配置中的public目录设置
3. 在Electron中，确保使用正确的URL路径

#### 问题3：音频文件加载但无法播放

**原因**：浏览器安全限制或音频格式不支持

**解决**：
1. 确保用户有交互（点击、按键等）后才能播放音频
2. 检查音频格式（优先使用MP3，AIFF在某些系统可能不支持）
3. 检查浏览器控制台的错误信息

### 8. 验证修复

修复后，应该能看到：
- ✅ 卡通头像正常显示（🤖, 👾, 👽等）
- ✅ 按钮图标正常显示（如果有emoji图标）
- ✅ 游戏音效正常播放

如果仍有问题，请检查：
1. 浏览器控制台的错误信息
2. Network标签中的资源加载状态
3. 系统字体列表（`fc-list | grep emoji`）

