# 音频问题修复指南

> 本文档由以下文档合并而成：
- `docs/fixes/FIX_AUDIO_ISSUES.md`
- `docs/fixes/FIX_VOICE_QUICK.md`
- `docs/fixes/QUICK_FIX_AUDIO.md`
- `docs/fixes/SIMPLE_VOICE_FIX.md`
- `docs/fixes/VOICE_INSTALL_FIX.md`

---

## 来源: FIX_AUDIO_ISSUES.md

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
# 运行安装脚本（使用整理后的路径）
chmod +x docs/root-docs/scripts/install/install-voice-packages.sh
./docs/root-docs/scripts/install/install-voice-packages.sh

# 或创建符号链接后直接使用
./docs/root-docs/create-symlinks.sh
# 使用整理后的脚本路径
./docs/root-docs/scripts/install/install-voice-packages.sh

# 或创建符号链接后直接使用
./docs/root-docs/create-symlinks.sh
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
# 使用整理后的脚本路径
./docs/root-docs/scripts/install/install-voice-packages.sh

# 或创建符号链接后直接使用
./docs/root-docs/create-symlinks.sh
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



---

## 来源: FIX_VOICE_QUICK.md

## 问题
Electron应用中听不到中文发音，控制台显示：
- `=== 可用语音列表 (共0个) ===`
- `[玩家X] 警告：没有可用的语音`
- `播放出错: synthesis-failed`

## 快速解决方案

### 方法1：使用测试脚本（推荐）

```bash
# 1. 运行测试脚本，查看当前状态
chmod +x test-voice.sh
# 使用整理后的脚本路径
./docs/root-docs/scripts/test/test-voice.sh

# 或创建符号链接后直接使用
./docs/root-docs/create-symlinks.sh
./test-voice.sh

# 2. 如果espeak未安装，运行安装脚本
chmod +x install-voice-packages.sh
# 使用整理后的脚本路径
./docs/root-docs/scripts/install/install-voice-packages.sh

# 或创建符号链接后直接使用
./docs/root-docs/create-symlinks.sh
./install-voice-packages.sh

# 3. 重启Electron应用
./start-electron.sh
```

### 方法2：手动安装

```bash
# 1. 安装语音引擎
sudo apt-get update
sudo apt-get install -y speech-dispatcher espeak espeak-data espeak-data-zh

# 2. 启动speech-dispatcher
speech-dispatcher -d

# 3. 测试espeak（应该听到"测试"）
espeak -v zh "测试"

# 4. 重启Electron应用
./start-electron.sh
```

## 验证修复

在Electron应用的开发者工具控制台运行：

```javascript
// 检查可用语音（应该 > 0）
const voices = window.speechSynthesis.getVoices();
console.log('可用语音数量:', voices.length);
console.log('语音列表:', voices.map(v => `${v.name} (${v.lang})`));

// 测试中文语音
if (voices.length > 0) {
  const utterance = new SpeechSynthesisUtterance('测试中文语音');
  utterance.lang = 'zh-CN';
  utterance.onend = () => console.log('✅ 语音播放完成');
  utterance.onerror = (e) => console.error('❌ 语音播放失败:', e);
  window.speechSynthesis.speak(utterance);
} else {
  console.error('❌ 没有可用的语音引擎，请安装speech-dispatcher和espeak');
}
```

## 常见问题

### Q: espeak可以工作，但Electron中仍然没有语音

**A:** 确保speech-dispatcher正在运行：

```bash
# 检查是否运行
pgrep -x speech-dispatcher

# 如果没有运行，启动它
speech-dispatcher -d

# 然后重启Electron应用
```

### Q: 只有英文语音，没有中文语音

**A:** 安装中文语音包：

```bash
sudo apt-get install -y espeak-data-zh
speech-dispatcher -d  # 重启speech-dispatcher
# 然后重启Electron应用
```

### Q: speech-dispatcher无法启动

**A:** 检查错误信息：

```bash
# 尝试手动启动并查看错误
speech-dispatcher -d -v

# 检查日志
journalctl --user -u speech-dispatcher -n 20
```

## 完整安装命令

如果上面的方法都不行，尝试完整安装：

```bash
# 1. 更新包列表
sudo apt-get update

# 2. 安装所有必需的包
sudo apt-get install -y \
  speech-dispatcher \
  espeak \
  espeak-data \
  espeak-data-zh \
  festival \
  festvox-cmu-us-slt-hts

# 3. 启动speech-dispatcher
speech-dispatcher -d

# 4. 验证安装
espeak -v zh "测试中文"
espeak -v en "test english"

# 5. 重启Electron应用
./start-electron.sh
```

## 如果仍然没有声音

1. **检查系统音频**：
   ```bash
   # 测试系统音频
   speaker-test -t sine -f 1000 -l 1
   ```

2. **检查Electron中的音频上下文**：
   在开发者工具控制台运行：
   ```javascript
   const audioContext = new (window.AudioContext || window.webkitAudioContext)();
   console.log('音频上下文状态:', audioContext.state);
   if (audioContext.state === 'suspended') {
     audioContext.resume().then(() => console.log('✅ 音频上下文已恢复'));
   }
   ```

3. **查看详细日志**：
   ```bash
   # speech-dispatcher日志
   journalctl --user -u speech-dispatcher -f
   ```



---

## 来源: QUICK_FIX_AUDIO.md

## 问题
Electron应用没有声音，控制台显示：
- `=== 可用语音列表 (共0个) ===`
- `[SoundService] HTML5 Audio 加载失败`

## 快速解决方案

### 方法1：使用安装脚本（推荐）

```bash
# 1. 给脚本添加执行权限
chmod +x install-voice-packages.sh

# 2. 运行安装脚本
# 使用整理后的脚本路径
./docs/root-docs/scripts/install/install-voice-packages.sh

# 或创建符号链接后直接使用
./docs/root-docs/create-symlinks.sh
./install-voice-packages.sh

# 3. 重启Electron应用
./start-electron.sh
```

### 方法2：手动安装

```bash
# 1. 安装语音合成引擎
sudo apt-get update
sudo apt-get install -y speech-dispatcher espeak espeak-data espeak-data-zh

# 2. 启动speech-dispatcher
speech-dispatcher -d

# 或者作为用户服务启动
systemctl --user start speech-dispatcher

# 3. 验证安装
espeak --version
espeak -v zh "测试"  # 应该能听到"测试"的语音

# 4. 重启Electron应用
./start-electron.sh
```

## 验证修复

在Electron应用的开发者工具控制台运行：

```javascript
// 检查可用语音
const voices = window.speechSynthesis.getVoices();
console.log('可用语音数量:', voices.length);
console.log('语音列表:', voices.map(v => `${v.name} (${v.lang})`));

// 测试语音合成
if (voices.length > 0) {
  const utterance = new SpeechSynthesisUtterance('测试语音');
  utterance.lang = 'zh-CN';
  utterance.onend = () => console.log('✅ 语音播放完成');
  utterance.onerror = (e) => console.error('❌ 语音播放失败:', e);
  window.speechSynthesis.speak(utterance);
} else {
  console.error('❌ 没有可用的语音引擎');
}
```

## 如果仍然没有声音

### 检查1：speech-dispatcher是否运行

```bash
# 检查进程
pgrep -x speech-dispatcher

# 如果没有运行，启动它
speech-dispatcher -d

# 检查日志
journalctl --user -u speech-dispatcher -n 20
```

### 检查2：音频系统是否正常

```bash
# 检查PulseAudio
pulseaudio --check && echo "PulseAudio运行中" || echo "PulseAudio未运行"

# 测试系统音频
speaker-test -t sine -f 1000 -l 1
```

### 检查3：Electron中的音频上下文

在开发者工具控制台运行：

```javascript
// 检查音频上下文
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
console.log('音频上下文状态:', audioContext.state);

// 如果被暂停，需要用户交互后恢复
if (audioContext.state === 'suspended') {
  audioContext.resume().then(() => {
    console.log('✅ 音频上下文已恢复');
  });
}
```

## 常见问题

### Q: 安装后仍然显示0个语音

**A:** 可能需要重启Electron应用，或者检查speech-dispatcher是否正在运行：

```bash
# 重启speech-dispatcher
pkill speech-dispatcher
speech-dispatcher -d

# 然后重启Electron应用
```

### Q: espeak可以工作，但Electron中仍然没有语音

**A:** 确保speech-dispatcher正在运行，它是Electron/Chromium和espeak之间的桥梁：

```bash
# 检查并启动
pgrep -x speech-dispatcher || speech-dispatcher -d
```

### Q: 只有英文语音，没有中文语音

**A:** 安装中文语音包：

```bash
sudo apt-get install -y espeak-data-zh
# 或者
sudo apt-get install -y festival festvox-cmu-us-slt-hts
```

## 详细说明

更多信息请参考：
- `ELECTRON_AUDIO_FIX.md` - 详细的音频问题修复指南
- `ELECTRON_RESOURCE_FIX.md` - 资源加载问题修复指南



---

## 来源: SIMPLE_VOICE_FIX.md

## 问题
- 浏览器中语音可以工作
- Electron中语音不工作
- 安装语音包困难

## 最简单的解决方案

### 方案1：使用浏览器版本（推荐）

既然浏览器中语音可以工作，而且您需要多通道语音，建议：

1. **在浏览器中运行应用**（语音可以工作）
2. **使用Web Audio API实现多通道**（代码中已有相关实现）

### 方案2：让Electron使用系统语音引擎

已更新 `electron/main.js`，现在会自动尝试启动speech-dispatcher。

**只需运行一次**：

```bash
# 安装基础包（不需要中文语音包）
sudo apt-get install -y speech-dispatcher espeak espeak-data

# 启动speech-dispatcher（只需运行一次）
speech-dispatcher -d

# 重启Electron应用
./start-electron.sh
```

### 方案3：使用浏览器 + Web Audio API多通道

如果浏览器中语音可以工作，可以在浏览器中使用Web Audio API实现多通道：

1. 在浏览器中打开应用
2. 代码中已有 `webAudioMultiChannelService.ts` 和 `ttsAudioService.ts`
3. 这些服务可以使用Web Audio API实现多通道播放

## 快速测试

### 测试1：检查speech-dispatcher

```bash
pgrep -x speech-dispatcher
# 如果有输出（显示PID），说明正在运行
# 如果没有输出，运行：speech-dispatcher -d
```

### 测试2：在Electron中检查语音

重启Electron后，在开发者工具控制台运行：

```javascript
// 等待一下，让语音加载
setTimeout(() => {
  const voices = window.speechSynthesis.getVoices();
  console.log('可用语音数量:', voices.length);
  if (voices.length > 0) {
    console.log('✅ 语音引擎工作正常');
    const utterance = new SpeechSynthesisUtterance('测试');
    utterance.lang = 'zh-CN';
    window.speechSynthesis.speak(utterance);
  } else {
    console.error('❌ 仍然没有语音');
  }
}, 2000);
```

## 如果仍然不行

### 选项1：使用浏览器版本

既然浏览器可以工作，直接在浏览器中运行：

```bash
npm run dev
# 然后在浏览器中打开 http://localhost:3000
```

### 选项2：检查系统语音引擎

```bash
# 检查系统有哪些TTS引擎
which espeak
which festival
which pico2wave

# 测试系统语音
espeak "test"
echo "测试" | festival --tts 2>/dev/null || echo "festival不可用"
```

## 关于多通道语音

**重要**：无论是浏览器还是Electron，`speechSynthesis` API都只支持单通道。

要实现多通道，需要使用：
1. **Web Audio API** - 捕获语音输出，然后混合到不同声道
2. **TTS API + 音频文件** - 生成音频文件，然后用Web Audio API播放

代码中已有相关实现（`webAudioMultiChannelService.ts`），但需要进一步完善。

## 建议

如果安装语音包太困难，建议：
1. **短期**：在浏览器中运行（语音可以工作）
2. **中期**：完善Web Audio API多通道实现
3. **长期**：考虑使用在线TTS API（如Google TTS、Azure TTS）



---

## 来源: VOICE_INSTALL_FIX.md

## 问题
`espeak-data-zh` 包在您的Ubuntu软件源中不可用。

## 解决方案

### 方法1：安装基础包（推荐）

即使没有中文语音包，espeak仍然可以工作，只是中文发音可能不够标准：

```bash
# 安装基础语音引擎
sudo apt-get update
sudo apt-get install -y speech-dispatcher espeak espeak-data

# 启动speech-dispatcher
speech-dispatcher -d

# 测试（应该能工作）
espeak "test"
espeak "测试"  # 即使没有中文包，也能发音
```

### 方法2：使用修复脚本

```bash
chmod +x install-voice-fix.sh
# 使用整理后的脚本路径
./docs/root-docs/scripts/install/install-voice-fix.sh

# 或创建符号链接后直接使用
./docs/root-docs/create-symlinks.sh
./install-voice-fix.sh
```

### 方法3：查找可用的中文语音包

```bash
# 搜索可用的espeak相关包
apt-cache search espeak | grep -i chinese
apt-cache search espeak | grep -i zh

# 或者搜索所有中文TTS
apt-cache search tts | grep -i chinese
apt-cache search speech | grep -i chinese
```

### 方法4：使用其他TTS引擎

```bash
# 安装festival（备选TTS引擎）
sudo apt-get install -y festival festvox-cmu-us-slt-hts

# 或者安装picoTTS
sudo apt-get install -y libttspico-utils
```

## 验证安装

安装后，运行：

```bash
# 检查espeak
which espeak
espeak --version

# 检查speech-dispatcher
pgrep -x speech-dispatcher

# 测试语音
espeak "test"
espeak "测试"
```

## 在Electron中验证

重启Electron应用后，在开发者工具控制台运行：

```javascript
const voices = window.speechSynthesis.getVoices();
console.log('可用语音数量:', voices.length);
console.log('语音列表:', voices.map(v => `${v.name} (${v.lang})`));

// 测试语音
if (voices.length > 0) {
  const utterance = new SpeechSynthesisUtterance('测试');
  utterance.lang = 'zh-CN';
  window.speechSynthesis.speak(utterance);
}
```

## 重要提示

1. **即使没有espeak-data-zh，espeak仍然可以工作**
   - 只是中文发音可能不够标准
   - 但功能是正常的

2. **speech-dispatcher必须运行**
   - 这是Electron和espeak之间的桥梁
   - 如果未运行，Electron中不会有语音

3. **必须重启Electron应用**
   - 安装后需要重启才能生效

## 如果仍然没有语音

1. 确认speech-dispatcher正在运行：
   ```bash
   pgrep -x speech-dispatcher
   # 如果没有输出，运行：speech-dispatcher -d
   ```

2. 检查Electron中的语音列表：
   ```javascript
   window.speechSynthesis.getVoices().length
   ```

3. 查看speech-dispatcher日志：
   ```bash
   journalctl --user -u speech-dispatcher -n 20
   ```



---

