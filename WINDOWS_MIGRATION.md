# Windows 迁移指南

## 迁移步骤

### 1. 将代码复制到 Windows

你可以通过以下方式将代码从 WSL 复制到 Windows：

**方法1：使用 Git（推荐）**
```bash
# 在 Windows PowerShell 或 CMD 中
cd C:\Users\YourUsername\Projects
git clone https://github.com/suksuki/guozha-poker-game.git
cd guozha-poker-game
```

**方法2：直接从 WSL 复制**
```bash
# 在 WSL 中
cd ~/guozha_poker_game
# 使用 Windows 路径复制（假设 Windows 用户目录是 /mnt/c/Users/YourUsername/）
cp -r . /mnt/c/Users/YourUsername/Projects/guozha-poker-game
```

### 2. 安装 Node.js 和 npm

在 Windows 上安装 Node.js：
1. 访问 https://nodejs.org/
2. 下载并安装 LTS 版本
3. 验证安装：
```cmd
node --version
npm --version
```

### 3. 安装依赖

在项目目录中运行：
```cmd
npm install
```

### 4. 安装 Electron（如果还没有）

```cmd
npm install electron --save-dev
```

### 5. 启动应用

使用提供的批处理文件：
```cmd
start-dev.bat
```

或者直接使用 npm：
```cmd
npm run electron:dev
```

## Windows 特定配置

### 端口配置

在 Windows 上，Vite 服务器可以只监听 localhost：
- 当前配置：`host: '0.0.0.0'`（允许从其他设备访问）
- Windows 本地开发可以改为：`host: 'localhost'`（更安全）

### 路径分隔符

所有路径配置已经使用 Node.js 的 `path` 模块，会自动处理 Windows 和 Linux 的路径差异。

### 字体配置

Windows 系统自带中文字体，Electron 应该能正确显示中文：
- Microsoft YaHei（微软雅黑）
- SimSun（宋体）
- SimHei（黑体）

## 常见问题

### 1. 编码问题

如果仍然出现乱码，检查：
- 确保所有 JSON 文件都是 UTF-8 编码
- 在 VS Code 中：右下角点击编码，选择 "UTF-8"
- 保存时选择 "使用编码保存" -> "UTF-8"

### 2. 端口被占用

```cmd
# 查看端口占用
netstat -ano | findstr :3000
# 结束进程（替换 PID）
taskkill /PID <PID> /F
```

### 3. 权限问题

如果遇到权限问题，以管理员身份运行 PowerShell 或 CMD。

## 启动脚本

已创建以下 Windows 批处理文件：
- `start-dev.bat` - 启动开发环境
- `start.bat` - 启动应用（如果已构建）

## 下一步

迁移完成后：
1. 测试应用是否正常启动
2. 检查中文显示是否正常
3. 测试 LLM 聊天功能（确保 Ollama 在 Windows 上运行）
4. 测试多声道语音功能

