# 最简单的语音修复方案

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

