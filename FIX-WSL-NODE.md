# 修复 WSL Node.js 问题

## 问题
WSL 正在使用 Windows 的 Node.js (`/mnt/c/Program Files/nodejs/npm`)，导致 UNC 路径问题。

## 解决方案：在 WSL 中安装 Node.js

### 方法1：使用脚本（推荐）

在 WSL Ubuntu 终端中运行：

```bash
cd /home/jin/guozha_poker_game
bash install-nodejs-wsl.sh
```

### 方法2：手动安装

```bash
# 更新包列表
sudo apt update

# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

应该显示类似：
- `v20.x.x`
- `10.x.x`

### 安装完成后

1. **清理并重新安装项目依赖**：
```bash
cd /home/jin/guozha_poker_game
rm -rf node_modules package-lock.json
npm install
```

2. **启动服务器**：
```bash
npm run dev
```

### 验证 WSL Node.js

运行：
```bash
which node
which npm
```

应该显示：
- `/usr/bin/node` 或 `/usr/local/bin/node`
- `/usr/bin/npm` 或 `/usr/local/bin/npm`

**不是** `/mnt/c/Program Files/nodejs/...`

## 如果安装后还是使用 Windows 的 Node.js

检查 PATH 环境变量：

```bash
echo $PATH
```

如果 `/mnt/c/Program Files/nodejs` 在前面，需要调整 PATH，或者使用：

```bash
export PATH="/usr/bin:$PATH"
```

然后重新运行 `npm install` 和 `npm run dev`。

