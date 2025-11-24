# 修复音频问题 - 详细指南

## 当前问题分析

从日志可以看到：

1. **语音合成问题**：
   - `=== 可用语音列表 (共0个) ===`
   - 需要安装语音引擎

2. **音频文件问题**：
   - 文件可以下载（HTTP 200）
   - 但文件大小只有 **1766 bytes**（太小！）
   - 正常音频文件应该是几十KB到几百KB
   - 这些可能是占位文件或损坏文件

## 解决方案

### 步骤1：检查音频文件

```bash
# 运行检查脚本
chmod +x check-audio-files.sh
./check-audio-files.sh
```

如果文件太小（< 10KB），说明是占位文件，需要下载真实文件。

### 步骤2：下载音频文件

根据 `public/sounds/README.md` 的说明，需要下载以下文件：

- `dun-small.mp3` - 小墩音效
- `dun-medium.mp3` - 中墩音效  
- `dun-large.mp3` - 大墩音效
- `dun-huge.mp3` - 超大墩音效
- `bomb.mp3` - 炸弹音效
- `explosion.mp3` - 爆炸音效

**推荐网站**：
- [Freesound.org](https://freesound.org/) - 免费音效库
- [Zapsplat](https://www.zapsplat.com/) - 免费音效库
- [Mixkit](https://mixkit.co/free-sound-effects/) - 完全免费

**搜索关键词**：
- `pop`, `click`, `whoosh` - 出墩音效
- `explosion`, `boom` - 炸弹/爆炸音效

下载后，将文件放到 `public/sounds/` 目录。

### 步骤3：安装语音引擎

```bash
# 运行安装脚本
chmod +x install-voice-packages.sh
./install-voice-packages.sh
```

或者手动安装：

```bash
sudo apt-get update
sudo apt-get install -y speech-dispatcher espeak espeak-data espeak-data-zh
speech-dispatcher -d
```

### 步骤4：验证修复

重启Electron应用后，在开发者工具控制台运行：

```javascript
// 检查语音
const voices = window.speechSynthesis.getVoices();
console.log('可用语音数量:', voices.length);
if (voices.length > 0) {
  console.log('✅ 语音引擎正常');
} else {
  console.error('❌ 语音引擎未安装');
}

// 检查音频文件
import { soundService } from './services/soundService';
soundService.preloadSounds().then(() => {
  console.log('音频预加载完成');
  // 检查加载的音频
  console.log('Web Audio:', soundService.sounds.size);
  console.log('HTML5 Audio:', soundService.htmlAudioSounds.size);
});
```

## 快速修复命令

```bash
# 1. 检查音频文件
./check-audio-files.sh

# 2. 安装语音引擎
./install-voice-packages.sh

# 3. 重启应用
./start-electron.sh
```

## 如果音频文件下载困难

如果暂时无法下载音频文件，可以：

1. **使用系统音效**（临时方案）：
   - 从系统音效目录复制一些音效文件
   - Ubuntu系统音效通常在 `/usr/share/sounds/`

2. **生成简单音效**（临时方案）：
   - 使用在线工具生成简单的音效
   - 或者使用 `ffmpeg` 生成测试音效

3. **暂时禁用音效**：
   - 游戏功能不受影响，只是没有音效
   - 语音合成更重要，优先修复语音引擎

## 优先级

1. **高优先级**：安装语音引擎（语音合成）
2. **中优先级**：下载/修复音频文件（音效）

即使没有音效文件，游戏仍然可以正常运行，只是没有音效。但语音合成是必需的。

