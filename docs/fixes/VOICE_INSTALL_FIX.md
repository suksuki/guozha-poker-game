# 语音引擎安装问题修复

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

