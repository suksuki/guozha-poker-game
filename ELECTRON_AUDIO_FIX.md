# Electron 音频和语音问题修复指南

## 问题描述

在Ubuntu上运行Electron应用时，可能出现：
1. 音频文件无法加载（404错误或解码失败）
2. 语音合成失败（没有可用的语音引擎）

## 解决方案

### 1. 安装语音合成引擎（解决语音合成问题）

Ubuntu上需要安装语音合成引擎才能使用SpeechSynthesis API：

```bash
# 安装speech-dispatcher（推荐）
sudo apt-get update
sudo apt-get install speech-dispatcher espeak espeak-data

# 或者安装festival（备选）
sudo apt-get install festival festvox-cmu-us-slt-hts

# 安装中文语音包
sudo apt-get install espeak-data-zh
```

#### 验证安装

```bash
# 检查speech-dispatcher是否运行
systemctl --user status speech-dispatcher

# 如果没有运行，启动它
systemctl --user start speech-dispatcher

# 检查espeak是否可用
espeak --version
```

#### 配置speech-dispatcher

如果speech-dispatcher没有自动启动，可以手动启动：

```bash
# 启动speech-dispatcher
speech-dispatcher -d

# 或者作为系统服务
sudo systemctl enable speech-dispatcher
sudo systemctl start speech-dispatcher
```

### 2. 音频文件路径问题

在Electron开发环境中，Vite的public目录应该能正确映射。如果仍有问题：

#### 检查Vite配置

确保`vite.config.ts`中有：
```typescript
export default defineConfig({
  publicDir: 'public',
  // ...
})
```

#### 在Electron中调试音频路径

打开开发者工具，在控制台运行：

```javascript
// 测试音频文件路径
const testAudio = new Audio('/sounds/dun-small.aiff');
testAudio.addEventListener('canplaythrough', () => {
  console.log('✅ 音频文件可以加载');
  testAudio.play();
});
testAudio.addEventListener('error', (e) => {
  console.error('❌ 音频文件加载失败:', e);
  console.log('尝试的路径:', testAudio.src);
});
```

#### 如果路径不对，检查Network标签

在开发者工具的Network标签中：
1. 查看音频文件的请求URL
2. 检查状态码（应该是200，不是404）
3. 如果404，说明路径不对，需要调整

### 3. 音频格式问题

如果音频文件无法解码，可能是格式问题：

#### 检查音频文件格式

```bash
# 检查音频文件信息
file public/sounds/dun-small.aiff
ffprobe public/sounds/dun-small.aiff  # 如果安装了ffmpeg
```

#### 转换音频格式（如果需要）

如果AIFF格式有问题，可以转换为MP3：

```bash
# 安装ffmpeg（如果未安装）
sudo apt-get install ffmpeg

# 转换AIFF到MP3
cd public/sounds
for file in *.aiff; do
  ffmpeg -i "$file" "${file%.aiff}.mp3"
done
```

### 4. 完整修复步骤

```bash
# 1. 安装语音合成引擎
sudo apt-get update
sudo apt-get install speech-dispatcher espeak espeak-data espeak-data-zh

# 2. 启动speech-dispatcher
systemctl --user start speech-dispatcher
# 或者
speech-dispatcher -d

# 3. 检查音频文件是否存在
ls -la public/sounds/

# 4. 如果音频文件格式有问题，转换格式
sudo apt-get install ffmpeg
# 然后转换文件（见上面）

# 5. 重启Electron应用
./start-electron.sh
```

### 5. 验证修复

#### 检查语音合成

在开发者工具控制台运行：

```javascript
// 检查可用语音
const voices = window.speechSynthesis.getVoices();
console.log('可用语音数量:', voices.length);
voices.forEach((v, i) => console.log(`${i}: ${v.name} (${v.lang})`));

// 测试语音合成
const utterance = new SpeechSynthesisUtterance('测试语音');
utterance.lang = 'zh-CN';
utterance.onend = () => console.log('✅ 语音播放完成');
utterance.onerror = (e) => console.error('❌ 语音播放失败:', e);
window.speechSynthesis.speak(utterance);
```

#### 检查音频文件

在开发者工具控制台运行：

```javascript
// 测试音频文件
import { soundService } from './services/soundService';
soundService.preloadSounds().then(() => {
  console.log('✅ 音频预加载完成');
  soundService.playSound('dun-small');
});
```

### 6. 常见问题

#### 问题1：语音列表为空（0个语音）

**原因**：没有安装语音合成引擎

**解决**：
```bash
sudo apt-get install speech-dispatcher espeak espeak-data espeak-data-zh
systemctl --user start speech-dispatcher
```

#### 问题2：音频文件404错误

**原因**：路径不正确或文件不存在

**解决**：
1. 检查文件是否存在：`ls -la public/sounds/`
2. 检查Vite配置中的`publicDir`设置
3. 在Network标签中查看实际请求的URL

#### 问题3：音频文件无法解码

**原因**：格式不支持或文件损坏

**解决**：
1. 检查文件格式：`file public/sounds/dun-small.aiff`
2. 尝试转换为MP3格式
3. 重新下载音频文件

#### 问题4：语音合成失败（synthesis-failed错误）

**原因**：语音引擎未正确配置或没有中文语音包

**解决**：
```bash
# 安装中文语音包
sudo apt-get install espeak-data-zh

# 重启speech-dispatcher
systemctl --user restart speech-dispatcher
```

### 7. 调试技巧

#### 启用详细日志

在代码中添加更多日志来调试：

```javascript
// 在soundService.ts中
console.log('[SoundService] 尝试加载:', url);
console.log('[SoundService] 响应状态:', response.status);
console.log('[SoundService] 响应类型:', response.headers.get('content-type'));

// 在multiChannelVoiceService.ts中
console.log('[VoiceService] 可用语音:', window.speechSynthesis.getVoices());
console.log('[VoiceService] 语音引擎状态:', window.speechSynthesis.speaking);
```

#### 检查系统日志

```bash
# 查看speech-dispatcher日志
journalctl --user -u speech-dispatcher -f

# 查看系统音频日志
dmesg | grep -i audio
```

## 参考资源

- [speech-dispatcher文档](https://freebsoft.org/speechd)
- [espeak文档](https://github.com/espeak-ng/espeak-ng)
- [Electron音频问题](https://www.electronjs.org/docs/latest/tutorial/audio)

