# Electron 问题修复指南

> 本文档由以下文档合并而成：
- `docs/fixes/ELECTRON_AUDIO_FIX.md`
- `docs/fixes/ELECTRON_RESOURCE_FIX.md`
- `docs/fixes/ELECTRON_UBUNTU_ENCODING_FIX.md`

---

## 来源: ELECTRON_AUDIO_FIX.md

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
# 使用整理后的脚本路径
./docs/root-docs/scripts/start/start-electron.sh

# 或创建符号链接后直接使用
./docs/root-docs/create-symlinks.sh
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



---

## 来源: ELECTRON_RESOURCE_FIX.md

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
# 使用整理后的脚本路径
./docs/root-docs/scripts/start/start-electron.sh

# 或创建符号链接后直接使用
./docs/root-docs/create-symlinks.sh
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



---

## 来源: ELECTRON_UBUNTU_ENCODING_FIX.md

## 问题描述

在Ubuntu系统上运行Electron应用时，可能出现中文乱码问题，特别是与语音包相关的文本显示。

## 解决方案

### 1. 系统环境设置

#### 检查当前语言环境

```bash
locale
```

确保输出中包含：
```
LANG=zh_CN.UTF-8
LC_ALL=zh_CN.UTF-8
```

#### 设置系统语言环境（如果未设置）

```bash
# 编辑语言环境配置文件
sudo nano /etc/default/locale
```

添加或修改为：
```
LANG=zh_CN.UTF-8
LC_ALL=zh_CN.UTF-8
LC_CTYPE=zh_CN.UTF-8
```

保存后，重新登录或重启系统。

#### 安装中文语言包

```bash
sudo apt-get update
sudo apt-get install language-pack-zh-hans language-pack-zh-hans-base
```

#### 安装中文字体

```bash
# 安装Noto CJK字体（推荐）
sudo apt-get install fonts-noto-cjk

# 或者安装其他中文字体
sudo apt-get install fonts-wqy-microhei fonts-wqy-zenhei
```

### 2. Electron应用代码设置

#### 在启动脚本中设置环境变量

创建或更新 `start-electron.sh`：

```bash
#!/bin/bash

# 设置UTF-8编码环境变量
export LANG=zh_CN.UTF-8
export LC_ALL=zh_CN.UTF-8
export LC_CTYPE=zh_CN.UTF-8

# 设置Node.js编码
export NODE_OPTIONS="--max-old-space-size=4096"

cd /home/jin/guozha_poker_game
echo "正在启动 Electron 开发环境..."
echo "这将启动 Vite 开发服务器和 Electron 窗口"
echo ""
npm run electron:dev
```

#### 在electron/main.js中设置

`electron/main.js` 已经包含了编码设置，但需要确保在Ubuntu上正确工作：

1. **环境变量设置**（已包含）：
```javascript
if (process.platform === 'win32' || process.platform === 'linux') {
  process.env.LANG = 'zh_CN.UTF-8';
  process.env.LC_ALL = 'zh_CN.UTF-8';
  process.env.LC_CTYPE = 'zh_CN.UTF-8';
}
```

2. **文件读取时使用UTF-8编码**（如果读取文件）：
```javascript
import fs from 'fs';

// 读取文件时明确指定UTF-8编码
const content = fs.readFileSync(filePath, 'utf8');
```

### 3. 文件路径处理

如果语音包文件路径包含中文，需要正确处理：

```javascript
import path from 'path';
import { fileURLToPath } from 'url';

// 使用正确的路径处理方式
const filePath = path.join(__dirname, '语音包', '文件名.txt');
// 确保使用UTF-8编码读取
const content = fs.readFileSync(filePath, 'utf8');
```

### 4. 检查清单

在Ubuntu上运行Electron应用前，请确认：

- [ ] 系统语言环境设置为 `zh_CN.UTF-8`
- [ ] 已安装中文语言包
- [ ] 已安装中文字体（Noto CJK 或 WQY）
- [ ] `start-electron.sh` 脚本设置了正确的环境变量
- [ ] `electron/main.js` 中设置了编码环境变量
- [ ] 所有文本文件都是UTF-8编码
- [ ] 文件路径中的中文能正确处理

### 5. 测试编码是否正确

在Electron应用中，打开开发者工具（DevTools），运行：

```javascript
// 测试中文显示
console.log('测试中文：过炸扑克游戏');
console.log('文档字符集:', document.characterSet);
console.log('文档语言:', document.documentElement.lang);

// 测试语音包相关文本
const testText = '语音包测试';
console.log('语音包文本:', testText);
```

### 6. 常见问题排查

#### 问题1：控制台中文显示乱码

**解决方案**：
- 确保终端使用UTF-8编码
- 在终端中运行：`export LANG=zh_CN.UTF-8`

#### 问题2：文件读取乱码

**解决方案**：
- 确保文件本身是UTF-8编码
- 使用 `fs.readFileSync(filePath, 'utf8')` 明确指定编码

#### 问题3：文件路径包含中文时出错

**解决方案**：
- 使用 `path.join()` 而不是字符串拼接
- 确保路径字符串是UTF-8编码

#### 问题4：Electron窗口中文显示乱码

**解决方案**：
- 检查 `electron/main.js` 中的字体设置
- 确保系统已安装中文字体
- 检查HTML中的 `<meta charset="UTF-8">` 标签

### 7. 快速修复脚本

创建一个快速检查和修复脚本 `fix-ubuntu-encoding.sh`：

```bash
#!/bin/bash

echo "=== Ubuntu Electron 编码修复脚本 ==="

# 检查语言环境
echo "1. 检查语言环境..."
locale | grep -E "LANG|LC_ALL"

# 检查中文字体
echo "2. 检查中文字体..."
fc-list :lang=zh | head -5

# 检查语言包
echo "3. 检查中文语言包..."
dpkg -l | grep language-pack-zh

# 设置环境变量
echo "4. 设置环境变量..."
export LANG=zh_CN.UTF-8
export LC_ALL=zh_CN.UTF-8
export LC_CTYPE=zh_CN.UTF-8

echo "=== 修复完成 ==="
echo "如果仍有问题，请运行："
echo "  sudo apt-get install language-pack-zh-hans fonts-noto-cjk"
```

## 参考资源

- [Ubuntu Locale设置文档](https://help.ubuntu.com/community/Locale)
- [Electron编码问题](https://www.electronjs.org/docs/latest/tutorial/encoding)
- [Node.js文件系统编码](https://nodejs.org/api/fs.html#fs_file_system_encodings)



---

