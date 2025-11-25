# Electron Ubuntu 乱码问题解决方案

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

