# Windows 快速开始指南

## 前置要求

1. **Node.js** (v18 或更高版本)
   - 下载：https://nodejs.org/
   - 安装后验证：`node --version`

2. **Git** (可选，用于克隆代码)
   - 下载：https://git-scm.com/

## 快速开始

### 1. 克隆或复制项目

如果使用 Git：
```cmd
git clone https://github.com/suksuki/guozha-poker-game.git
cd guozha-poker-game
```

### 2. 安装依赖

```cmd
npm install
```

或者使用批处理文件：
```cmd
install-deps.bat
```

### 3. 启动应用

```cmd
npm run electron:dev
```

或者使用批处理文件：
```cmd
start-dev.bat
```

## 配置 Ollama（用于 LLM 聊天）

1. 下载并安装 Ollama for Windows：
   - 访问：https://ollama.ai/download
   - 下载 Windows 版本并安装

2. 下载模型：
```cmd
ollama pull qwen2:0.5b
```

3. 验证 Ollama 运行：
```cmd
ollama list
```

应用会自动连接到 `http://localhost:11434` 的 Ollama 服务。

## 常见问题

### 端口被占用

如果 3000 端口被占用：
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 编码问题

如果出现乱码：
1. 确保所有 JSON 文件都是 UTF-8 编码
2. 在 VS Code 中：文件 -> 高级保存选项 -> UTF-8
3. 重启应用

### Electron 窗口不显示

1. 检查任务栏是否有 Electron 图标
2. 尝试 Alt+Tab 切换窗口
3. 检查控制台是否有错误信息

## 开发命令

- `npm run dev` - 只启动 Vite 开发服务器
- `npm run electron:dev` - 启动 Electron 开发环境
- `npm run build` - 构建生产版本
- `npm run electron:build` - 构建 Electron 应用
- `npm test` - 运行测试

## 项目结构

```
guozha-poker-game/
├── electron/          # Electron 主进程代码
├── src/              # 源代码
│   ├── components/   # React 组件
│   ├── services/     # 服务（语音、聊天等）
│   ├── i18n/         # 国际化资源
│   └── ...
├── public/           # 静态资源
└── package.json      # 项目配置
```

## 技术支持

如果遇到问题：
1. 检查控制台错误信息
2. 查看 `WINDOWS_MIGRATION.md` 获取详细迁移指南
3. 检查 GitHub Issues

