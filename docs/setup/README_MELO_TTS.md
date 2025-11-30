# Melo TTS 部署说明

## ⚡ 快速开始（推荐）

由于现代 Linux 系统（如 Ubuntu 22.04+）的 Python 环境被保护，**必须使用虚拟环境**。

### 一步安装并启动

```bash
# 1. 运行自动化设置脚本
bash docs/setup/setup-melo-tts-venv.sh

# 2. 启动服务器（使用生成的启动脚本）
bash start-melo-tts.sh
```

就这么简单！脚本会自动：
- ✅ 创建虚拟环境（`.venv-melo-tts`）
- ✅ 检查 Python 版本
- ✅ 安装所有依赖（Melo TTS、FastAPI 等）
- ✅ 下载语言资源
- ✅ 创建启动脚本

## 📋 文件说明

### 脚本文件

- **`docs/setup/setup-melo-tts-venv.sh`** - 自动化设置脚本
  - 创建虚拟环境
  - 安装所有依赖
  - 配置语言资源
  
- **`start-melo-tts.sh`** - 快速启动脚本（项目根目录）
  - 激活虚拟环境
  - 启动 API 服务器

- **`docs/setup/melo-tts-api-server.py`** - API 服务器代码
  - FastAPI 服务器实现
  - 提供 TTS API 端点

### 文档文件

- **`docs/setup/MELO_TTS_QUICKSTART.md`** - 快速开始指南
- **`docs/setup/melo-tts-setup.md`** - 详细部署文档

## 🔧 使用方式

### 方式 1: 自动化脚本（最简单）

```bash
# 首次设置
bash docs/setup/setup-melo-tts-venv.sh

# 以后每次启动
bash start-melo-tts.sh
```

### 方式 2: 手动操作

```bash
# 创建虚拟环境
python3 -m venv .venv-melo-tts

# 激活虚拟环境
source .venv-melo-tts/bin/activate

# 安装依赖
pip install --upgrade pip
pip install git+https://github.com/myshell-ai/MeloTTS.git
python -m unidic download
pip install fastapi uvicorn pydantic

# 启动服务器
cd docs/setup
python melo-tts-api-server.py
```

### 方式 3: 使用 uvicorn 直接启动

```bash
source .venv-melo-tts/bin/activate
cd docs/setup
uvicorn melo-tts-api-server:app --host 0.0.0.0 --port 7860
```

## ✅ 验证安装

### 1. 检查虚拟环境

```bash
ls -la .venv-melo-tts
```

### 2. 检查依赖

```bash
source .venv-melo-tts/bin/activate
pip list | grep -E "melo|fastapi|uvicorn"
```

### 3. 测试服务器

```bash
# 启动服务器后，在另一个终端运行：
curl http://localhost:7860/health

# 应该返回：
# {"status":"ok","service":"Melo TTS","version":"1.0.0"}
```

### 4. 测试 TTS

```bash
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "你好，世界", "lang": "ZH"}' \
  --output test.wav

# 播放音频文件验证
```

## 🐛 常见问题

### 问题 1: `error: externally-managed-environment`

**解决**: 使用虚拟环境！运行 `bash docs/setup/setup-melo-tts-venv.sh`

### 问题 2: `ModuleNotFoundError: No module named 'fastapi'`

**解决**: 
1. 激活虚拟环境：`source .venv-melo-tts/bin/activate`
2. 安装依赖：`pip install fastapi uvicorn pydantic`

### 问题 3: 端口被占用

**解决**: 修改 `melo-tts-api-server.py` 中的端口号，或使用环境变量：

```bash
PORT=7861 bash start-melo-tts.sh
```

### 问题 4: 虚拟环境创建失败

**解决**: 检查 Python 版本（需要 3.10+）：

```bash
python3 --version
```

如果版本不足，需要升级 Python 或使用 pyenv。

## 📝 配置说明

### 默认配置

- **虚拟环境**: `.venv-melo-tts`（项目根目录）
- **服务器地址**: `http://localhost:7860`
- **API 端点**: `/tts` (POST), `/health` (GET)

### 修改配置

如果需要修改服务器地址或端口，编辑 `docs/setup/melo-tts-api-server.py`：

```python
# 修改端口
uvicorn.run(app, host="0.0.0.0", port=7861)
```

应用配置在 `src/tts/initTTS.ts` 中可以修改。

## 🎯 下一步

1. ✅ 运行设置脚本安装依赖
2. ✅ 启动服务器
3. ✅ 验证服务运行
4. ✅ 在应用中测试语音合成

应用会自动检测并使用 Melo TTS 服务！

## 📚 相关文档

- [快速开始指南](./MELO_TTS_QUICKSTART.md)
- [详细部署文档](./melo-tts-setup.md)
- [API 服务器代码](./melo-tts-api-server.py)

