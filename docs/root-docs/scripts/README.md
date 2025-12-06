# 脚本文件说明

## 目录结构

```
scripts/
├── start/          # 启动脚本
├── install/        # 安装和修复脚本
├── test/           # 测试脚本
└── tools/          # 工具脚本
```

## 脚本分类

### start/ - 启动脚本
用于启动各种服务和应用：
- `start-wsl.sh` - WSL环境启动（推荐）
- `start-all.sh` - 启动所有服务
- `start-app-and-piper.sh` - 启动应用和Piper TTS
- `start-ollama.sh` - 启动Ollama服务
- `start-piper-tts.sh` - 启动Piper TTS服务
- `start-electron.sh` - 启动Electron应用

### install/ - 安装脚本
用于安装依赖和修复环境：
- `install-*.sh` - 各种安装脚本
- `fix-*.sh` - 各种修复脚本
- `clean-and-install.sh` - 清理并安装

### test/ - 测试脚本
用于运行测试：
- `test-*.sh` - 各种测试脚本
- `run-*.sh` - 运行测试脚本

### tools/ - 工具脚本
各种工具和辅助脚本：
- `check-*.sh` - 检查脚本
- `commit-*.sh` - Git提交脚本
- `restart-*.sh` - 重启脚本
- `monitor-*.sh` - 监控脚本
- `debug-*.sh` - 调试脚本

## 使用方式

### 从根目录运行
```bash
# 使用完整路径
./docs/root-docs/scripts/start/start-wsl.sh

# 或创建符号链接后直接运行
./start-wsl.sh
```

### 创建符号链接（推荐）
```bash
# 创建常用脚本的符号链接
ln -s docs/root-docs/scripts/start/start-wsl.sh start-wsl.sh
ln -s docs/root-docs/scripts/start/start-all.sh start-all.sh
```

## 注意事项

- 所有脚本已从根目录移动到 `docs/root-docs/scripts/`
- 如需在根目录使用，建议创建符号链接
- 脚本路径可能需要根据实际情况调整

