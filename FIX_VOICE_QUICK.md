# 快速修复：没有中文发音

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
./test-voice.sh

# 2. 如果espeak未安装，运行安装脚本
chmod +x install-voice-packages.sh
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

