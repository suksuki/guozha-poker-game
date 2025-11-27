# Piper TTS 安装问题修复指南

## 问题1: Python环境管理错误

**错误信息：**
```
error: externally-managed-environment
```

**解决方案：使用虚拟环境**

运行安装脚本（推荐）：
```bash
./scripts/setup-piper-tts.sh
```

或手动创建虚拟环境：
```bash
# 创建虚拟环境
python3 -m venv venv-piper

# 激活虚拟环境
source venv-piper/bin/activate

# 安装依赖
pip install flask flask-cors

# 尝试安装piper-tts（可选，如果失败可以使用命令行工具）
pip install piper-tts || echo "piper-tts包安装失败，将使用命令行工具"
```

## 问题2: 模型下载404错误

**错误信息：**
```
404 Not Found
```

**解决方案：使用正确的下载方式**

### 方式1: 使用安装脚本（推荐）

```bash
./scripts/setup-piper-tts.sh
```

脚本会自动尝试多个下载源。

### 方式2: 手动下载模型

1. **访问HuggingFace模型页面：**
   ```
   https://huggingface.co/rhasspy/piper-voices/tree/main/zh/zh_CN
   ```

2. **选择模型（推荐xiaoyan女声）：**
   - 点击 `xiaoyan` 文件夹
   - 点击 `medium` 文件夹
   - 下载 `xiaoyan-medium.onnx` 和 `xiaoyan-medium.onnx.json`

3. **放到正确目录：**
   ```bash
   mkdir -p tts-services/models
   # 将下载的文件放到 tts-services/models/ 目录
   ```

### 方式3: 使用piper命令行工具下载

如果安装了piper命令行工具：
```bash
piper download --model zh_CN-xiaoyan-medium
```

## 快速修复步骤

1. **运行安装脚本：**
   ```bash
   chmod +x scripts/setup-piper-tts.sh
   ./scripts/setup-piper-tts.sh
   ```

2. **如果模型下载失败，手动下载：**
   - 访问：https://huggingface.co/rhasspy/piper-voices/tree/main/zh/zh_CN/xiaoyan/medium
   - 下载两个文件到 `tts-services/models/` 目录

3. **启动服务：**
   ```bash
   source venv-piper/bin/activate
   python scripts/piper-tts-server.py
   ```

## 替代方案：使用预编译版本

如果Python方案有问题，可以使用预编译版本：

1. **下载预编译版本：**
   ```bash
   cd tts-services
   wget https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_amd64.tar.gz
   tar -xzf piper_amd64.tar.gz
   ```

2. **下载模型（同上）**

3. **直接使用命令行：**
   ```bash
   echo "你好" | ./tts-services/piper/piper --model tts-services/models/xiaoyan-medium.onnx --output_file test.wav
   ```

4. **修改服务脚本使用命令行工具（已支持）**

## 验证安装

```bash
# 测试服务
curl -X POST http://localhost:5000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"你好，这是测试"}' \
  --output test.wav

# 如果生成了test.wav文件，说明安装成功！
```

## 常见问题

### Q: 虚拟环境激活后找不到命令？
A: 确保使用 `source venv-piper/bin/activate` 激活虚拟环境

### Q: 模型文件在哪里？
A: 应该在 `tts-services/models/` 目录，文件名应该是 `xiaoyan-medium.onnx`

### Q: 可以使用其他中文模型吗？
A: 可以，HuggingFace上有多个中文模型可选：
- xiaoyan (女声，推荐)
- xiaoyi (男声)
- 其他模型

### Q: 服务启动失败？
A: 检查：
1. 虚拟环境是否激活
2. 模型文件是否存在
3. 端口5000是否被占用

