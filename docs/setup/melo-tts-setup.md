# Melo TTS 本地部署指南

本指南将帮助您在本地部署 Melo TTS 服务，并配置应用程序使用它。

## 📋 前置要求

- Python 3.10 或更高版本
- pip（Python 包管理器）
- 至少 2GB 可用内存
- （可选）GPU 支持可提升性能

## 🚀 安装步骤

### ⚠️ 重要提示

1. **虚拟环境必需**: 现代 Linux 发行版（如 Ubuntu 22.04+）通常使用"外部管理的 Python 环境"，不允许直接在系统 Python 中安装包。**强烈建议使用虚拟环境**。

2. **系统依赖必需**: Melo TTS 需要系统级的 MeCab 库。在安装 Python 包之前，需要先安装系统依赖。

### 方式 1: 使用自动化脚本（推荐）

我们提供了自动化设置脚本，但**需要先安装系统依赖**：

#### 步骤 1: 安装系统依赖

```bash
# 运行系统依赖安装脚本
bash docs/setup/install-system-deps.sh
```

或者手动安装：

```bash
# Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y mecab libmecab-dev mecab-ipadic-utf8 build-essential python3-dev

# RedHat/CentOS
sudo yum install -y mecab mecab-devel mecab-ipadic gcc gcc-c++ python3-devel
```

#### 步骤 2: 运行 Python 包设置脚本

```bash
# 运行设置脚本
bash docs/setup/setup-melo-tts-venv.sh
```

脚本会自动：
- 检查系统依赖
- 创建虚拟环境（`.venv-melo-tts`）
- 安装 Melo TTS
- 下载语言资源
- 安装 API 服务器依赖
- 创建启动脚本

设置完成后，使用以下命令启动服务器：

```bash
# 使用启动脚本（推荐）
bash start-melo-tts.sh

# 或者手动启动
source .venv-melo-tts/bin/activate
cd docs/setup
python melo-tts-api-server.py
```

### 方式 2: 手动设置虚拟环境

如果不想使用自动化脚本，可以手动创建虚拟环境：

#### 0. 安装系统依赖（必需！）

```bash
# Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y mecab libmecab-dev mecab-ipadic-utf8 build-essential python3-dev

# RedHat/CentOS
sudo yum install -y mecab mecab-devel mecab-ipadic gcc gcc-c++ python3-devel
```

#### 1. 创建虚拟环境

```bash
# 在项目根目录创建虚拟环境
python3 -m venv .venv-melo-tts

# 激活虚拟环境
source .venv-melo-tts/bin/activate
```

#### 2. 升级 pip

```bash
pip install --upgrade pip
```

#### 3. 安装 Melo TTS

```bash
# 克隆并安装 Melo TTS
pip install git+https://github.com/myshell-ai/MeloTTS.git
```

#### 4. 下载语言资源

```bash
# 下载中文语言资源（必需）
python -m unidic download

# （可选）如果使用日语，下载日语资源
# python -m unidic download
```

#### 5. 安装 NLTK 数据（如果需要）

```bash
python -c "import nltk; nltk.download('averaged_perceptron_tagger_eng')"
```

#### 6. 安装 API 服务器依赖

```bash
# 安装 FastAPI 和相关依赖
pip install fastapi uvicorn pydantic
```

### 方式 3: 不使用虚拟环境（不推荐）

⚠️ **警告**: 这可能破坏系统 Python 环境，不推荐使用。

如果必须使用系统 Python，需要添加 `--break-system-packages` 标志：

```bash
pip install --break-system-packages git+https://github.com/myshell-ai/MeloTTS.git
python -m unidic download
pip install --break-system-packages fastapi uvicorn pydantic
```

但**强烈建议使用虚拟环境**！

## 🔧 配置 API 服务器

### 方式 1: 使用启动脚本（推荐）

如果使用了自动化设置脚本，可以直接使用项目根目录的启动脚本：

```bash
bash start-melo-tts.sh
```

### 方式 2: 手动启动

```bash
# 1. 激活虚拟环境（如果使用虚拟环境）
source .venv-melo-tts/bin/activate

# 2. 进入项目目录
cd docs/setup

# 3. 启动服务器
python melo-tts-api-server.py

# 或者使用 uvicorn 直接启动
uvicorn melo-tts-api-server:app --host 0.0.0.0 --port 7860
```

服务器启动后，您可以在浏览器中访问：
- API 文档：http://localhost:7860/docs
- 健康检查：http://localhost:7860/health

## 🔌 配置应用程序

### 方式 1: 通过环境变量配置

在应用启动时，Melo TTS 会自动检测 `http://localhost:7860` 的服务。

### 方式 2: 在代码中配置

在 `src/App.tsx` 或 TTS 初始化代码中：

```typescript
import { initTTS } from './tts/initTTS';

// 初始化 TTS 系统，启用 Melo TTS
initTTS({
  enableMelo: true,
  meloConfig: {
    baseUrl: 'http://localhost:7860',
    timeout: 30000,
    retryCount: 2,
    speaker: 'ZH',  // 可选：指定说话人
    language: 'ZH',  // 可选：指定语言
  },
}).catch(console.error);
```

### 方式 3: 通过配置界面

如果应用提供了 TTS 配置界面，可以在那里启用和配置 Melo TTS。

## 🧪 测试服务

### 测试健康检查

```bash
curl http://localhost:7860/health
```

预期响应：
```json
{
  "status": "ok",
  "service": "Melo TTS",
  "version": "1.0.0"
}
```

### 测试 TTS API

```bash
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "你好，这是 Melo TTS 测试", "lang": "ZH"}' \
  --output test.wav
```

然后可以播放 `test.wav` 文件验证语音合成是否正常。

## 🎯 支持的参数

### 语言代码 (lang)

- `ZH` - 中文
- `EN` - 英语
- `JP` - 日语
- 其他 Melo TTS 支持的语言

### 说话人 (speaker)

- `ZH` - 中文默认说话人
- `ZH_MALE` - 中文男声（如果模型支持）
- `ZH_FEMALE` - 中文女声（如果模型支持）
- 其他模型支持的说话人 ID

## ⚙️ 高级配置

### 使用 Docker 部署（推荐生产环境）

创建 `Dockerfile`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# 安装 Melo TTS
RUN pip install git+https://github.com/myshell-ai/MeloTTS.git
RUN python -m unidic download

# 安装 API 服务器依赖
RUN pip install fastapi uvicorn pydantic

# 复制 API 服务器脚本
COPY docs/setup/melo-tts-api-server.py /app/

# 暴露端口
EXPOSE 7860

# 启动服务
CMD ["python", "melo-tts-api-server.py"]
```

构建和运行：

```bash
docker build -t melo-tts-server .
docker run -d -p 7860:7860 melo-tts-server
```

### 使用 systemd 服务（Linux）

创建 `/etc/systemd/system/melo-tts.service`:

```ini
[Unit]
Description=Melo TTS API Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/your/project/docs/setup
ExecStart=/usr/bin/python3 melo-tts-api-server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl enable melo-tts
sudo systemctl start melo-tts
```

## 🐛 故障排除

### 问题 1: 导入 Melo TTS 失败

**错误**: `ModuleNotFoundError: No module named 'melotts'`

**解决方案**:
```bash
pip install git+https://github.com/myshell-ai/MeloTTS.git
```

### 问题 2: 语言资源未找到

**错误**: `FileNotFoundError: [Errno 2] No such file or directory: 'unidic'`

**解决方案**:
```bash
python -m unidic download
```

### 问题 3: GPU 相关错误

**错误**: CUDA 相关错误

**解决方案**:
- 如果不需要 GPU，可以强制使用 CPU：
  - 在 `melo-tts-api-server.py` 中，修改 `device='auto'` 为 `device='cpu'`
- 或者安装正确的 CUDA 版本和 PyTorch

### 问题 4: 端口被占用

**错误**: `Address already in use`

**解决方案**:
- 修改 `melo-tts-api-server.py` 中的端口号
- 或者在启动时指定其他端口：
  ```bash
  uvicorn melo-tts-api-server:app --host 0.0.0.0 --port 7861
  ```

### 问题 5: 应用无法连接到服务

**解决方案**:
1. 确认服务正在运行：`curl http://localhost:7860/health`
2. 检查防火墙设置
3. 如果服务在不同机器上，修改应用配置中的 `baseUrl` 为实际服务器地址

## 📊 性能优化

1. **使用 GPU**: 如果有 NVIDIA GPU，安装 CUDA 版本的 PyTorch 可以显著提升性能
2. **预热模型**: 首次调用会较慢（模型加载），后续调用会更快
3. **批量处理**: 对于大量文本，考虑批量处理或使用队列
4. **缓存**: 应用已实现了音频缓存，重复文本会直接使用缓存

## 🔒 安全建议

1. **生产环境**:
   - 限制 CORS 允许的域名
   - 添加认证机制
   - 使用 HTTPS
   - 限制文本长度和请求频率

2. **修改 `melo-tts-api-server.py`**:
   ```python
   # 限制 CORS
   allow_origins=["https://yourdomain.com"]
   
   # 添加速率限制
   from slowapi import Limiter
   limiter = Limiter(key_func=get_remote_address)
   ```

## 📚 参考资源

- [Melo TTS GitHub](https://github.com/myshell-ai/MeloTTS)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [应用 TTS 文档](../../src/tts/README.md)

## ✅ 验证部署

完成部署后，检查以下内容：

- [ ] Melo TTS 已安装
- [ ] 语言资源已下载
- [ ] API 服务器可以启动
- [ ] 健康检查端点返回 `{"status": "ok"}`
- [ ] TTS API 可以生成音频
- [ ] 应用可以连接到服务并合成语音

## 🎉 完成！

现在您已经成功部署了 Melo TTS 服务！应用会自动检测并使用它进行语音合成。

如果遇到任何问题，请查看故障排除部分或提交 Issue。

