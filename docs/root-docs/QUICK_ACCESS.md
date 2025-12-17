# 快速访问指南

## 📁 文档快速链接

### 🚀 启动相关
- [WSL启动指南](startup/WSL-START.md) - 推荐方式
- [快速开始](startup/QUICK_START.md) - 5分钟上手
- [服务启动说明](startup/START-SERVICES.md) - 所有服务
- [Windows启动](startup/README-WINDOWS.md) - Windows环境

### ⚙️ 配置相关
- [TTS配置指南](tts/TTS_CONFIG_GUIDE.md) - TTS服务配置
- [MeLo-TTS完整指南](tts/MeLo-TTS完整配置指南.md) - MeLo TTS详细配置
- [外网访问配置](config/外网访问配置指南.md) - 外网访问设置
- [启动说明](config/启动说明.md) - 基本启动说明

### 📊 项目状态
- [项目状态](status/PROJECT_STATUS.md) - 当前项目状态
- [项目展示](status/PROJECT_SHOWCASE.md) - 项目亮点
- [完成报告](status/FINAL_COMPLETION_REPORT.md) - 完成情况
- [最终总结](status/FINAL_SUMMARY.md) - 项目总结

### 🛠️ 脚本快速链接

#### 启动脚本
```bash
# WSL环境启动（推荐）
./scripts/start/start-wsl.sh

# 启动所有服务
./scripts/start/start-all.sh

# 启动应用和Piper TTS
./scripts/start/start-app-and-piper.sh
```

#### 安装脚本
```bash
# 安装Node.js（WSL）
./scripts/install/install-nodejs-wsl.sh

# 安装语音包
./scripts/install/install-voice-packages.sh

# 修复安装问题
./scripts/install/fix-install.sh
```

#### 测试脚本
```bash
# 测试语音
./scripts/test/test-voice.sh

# 测试Ollama API
./scripts/test/test-ollama-api.sh
```

#### Windows脚本
```bash
# Windows批处理脚本
./scripts/windows/start-all.bat
./scripts/windows/start-dev.bat
```

#### Python脚本
```bash
# 启动MeLo TTS服务器
python scripts/python/start-melo-tts-server.py
```

## 📝 使用说明

### 从根目录运行脚本

1. **使用完整路径**：
   ```bash
   ./docs/root-docs/scripts/start/start-wsl.sh
   ```

2. **创建符号链接**（推荐）：
   ```bash
   # 创建常用脚本的符号链接
   ln -s docs/root-docs/scripts/start/start-wsl.sh start-wsl.sh
   ln -s docs/root-docs/scripts/start/start-all.sh start-all.sh
   
   # 然后可以直接运行
   ./start-wsl.sh
   ```

3. **添加到PATH**：
   ```bash
   export PATH=$PATH:$(pwd)/docs/root-docs/scripts/start
   start-wsl.sh
   ```

## 🔍 查找文档

### 按功能查找

- **启动问题** → `startup/` 目录
- **配置问题** → `config/` 或 `tts/` 目录
- **项目状态** → `status/` 目录
- **技术文档** → 根目录下的 `*.md` 文件

### 按类型查找

- **Shell脚本** → `scripts/start/`, `scripts/install/`, `scripts/test/`, `scripts/tools/`
- **Windows脚本** → `scripts/windows/`
- **Python脚本** → `scripts/python/`
- **测试文件** → `test-files/`

## 📌 注意事项

- 所有脚本路径已从根目录移动到 `docs/root-docs/scripts/`
- 文档中的脚本路径可能需要更新
- 建议创建符号链接方便使用
- 临时文件可以定期清理

---

**提示**：查看 [README.md](../README.md) 了解完整项目文档结构。

