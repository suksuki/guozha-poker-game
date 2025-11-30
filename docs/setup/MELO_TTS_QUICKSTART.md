# Melo TTS 快速开始指南

## 🚀 快速部署

### 1. 安装系统依赖（必需）

Melo TTS 需要系统级的 MeCab 库，必须先安装：

```bash
# 使用自动化脚本安装系统依赖
bash docs/setup/install-system-deps.sh

# 或者手动安装（Debian/Ubuntu）
sudo apt-get update
sudo apt-get install -y mecab libmecab-dev mecab-ipadic-utf8 build-essential python3-dev
```

### 2. 使用自动化脚本安装 Python 包

```bash
# 运行设置脚本（会自动创建虚拟环境并安装所有依赖）
bash docs/setup/setup-melo-tts-venv.sh

# 启动服务器
bash start-melo-tts.sh
```

就这么简单！脚本会自动处理虚拟环境的创建和依赖安装。

### 2. 验证服务运行

```bash
# 健康检查
curl http://localhost:7860/health

# 测试 TTS
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "你好，世界", "lang": "ZH"}' \
  --output test.wav
```

### 3. 应用自动检测

应用会自动检测 `http://localhost:7860` 上的 Melo TTS 服务，无需额外配置！

## 🔧 手动安装（如果自动化脚本不适用）

如果自动化脚本有问题，可以手动创建虚拟环境：

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

## ⚠️ 常见问题

### 问题：`error: externally-managed-environment`

**原因**: 系统 Python 环境被保护，不允许直接安装包。

**解决**: 使用虚拟环境！自动化脚本会自动创建虚拟环境。

如果手动创建，使用：
```bash
python3 -m venv .venv-melo-tts
source .venv-melo-tts/bin/activate
```

### 问题：`ModuleNotFoundError: No module named 'fastapi'`

**原因**: 依赖未安装或未激活虚拟环境。

**解决**: 
1. 确保激活了虚拟环境：`source .venv-melo-tts/bin/activate`
2. 安装依赖：`pip install fastapi uvicorn pydantic`

### 问题：`Failed building wheel for tokenizers`

**原因**: 缺少 Rust 编译器。

**解决**: 
```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 或者运行系统依赖安装脚本（会自动安装 Rust）
bash docs/setup/install-system-deps.sh
```

### 问题：虚拟环境不存在

**解决**: 运行设置脚本：
```bash
bash docs/setup/setup-melo-tts-venv.sh
```

## 📝 配置说明

Melo TTS 已集成到 TTS 服务管理器中，默认优先级最高（优先级 0）。

### 默认配置

- **服务地址**: `http://localhost:7860`
- **优先级**: 0（最高）
- **超时时间**: 30秒
- **重试次数**: 2次

### 自定义配置

如果需要自定义配置，可以在应用初始化时设置：

```typescript
import { initTTS } from './tts/initTTS';

initTTS({
  enableMelo: true,
  meloConfig: {
    baseUrl: 'http://localhost:7860',
    timeout: 30000,
    retryCount: 2,
    speaker: 'ZH',
    language: 'ZH',
  },
});
```

## 🔍 故障排除

### 检查服务状态

```bash
# 健康检查
curl http://localhost:7860/health

# 查看服务器日志
# 服务器会在终端输出日志信息
```

### 检查虚拟环境

```bash
# 确认虚拟环境存在
ls -la .venv-melo-tts

# 激活虚拟环境并检查 Python 包
source .venv-melo-tts/bin/activate
pip list | grep -i melo
pip list | grep -i fastapi
```

### 重新安装

如果遇到问题，可以删除虚拟环境并重新设置：

```bash
# 删除虚拟环境
rm -rf .venv-melo-tts

# 重新运行设置脚本
bash docs/setup/setup-melo-tts-venv.sh
```

## 📚 更多信息

- 详细部署文档: [melo-tts-setup.md](./melo-tts-setup.md)
- API 服务器代码: [melo-tts-api-server.py](./melo-tts-api-server.py)
- TTS 系统文档: [src/tts/README.md](../../src/tts/README.md)

## ✅ 验证清单

完成以下步骤后，您就成功集成了 Melo TTS：

- [ ] 运行了设置脚本或手动创建了虚拟环境
- [ ] Melo TTS 已安装在虚拟环境中
- [ ] 语言资源已下载
- [ ] API 服务器已启动
- [ ] 健康检查返回 `{"status": "ok"}`
- [ ] 可以生成测试音频文件
- [ ] 应用可以连接到服务
- [ ] 应用中的语音合成使用 Melo TTS

完成！🎉
