# 快速修复：Ubuntu Electron 无声音问题

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

