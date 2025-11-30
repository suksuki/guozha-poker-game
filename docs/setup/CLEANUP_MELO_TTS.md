# Melo TTS 清理指南

如果不再需要 Melo TTS，可以使用以下方法清理安装内容。

## 🗑️ 快速清理

### 使用自动化清理脚本（推荐）

```bash
bash docs/setup/cleanup-melo-tts.sh
```

脚本会自动：
- ✅ 删除虚拟环境 (`.venv-melo-tts`)
- ✅ 删除启动脚本 (`start-melo-tts.sh`)
- ⚠️ 询问是否删除 Rust（可选）
- ⚠️ 询问是否卸载系统包（可选）

## 🔧 手动清理

### 1. 删除虚拟环境

```bash
# 删除虚拟环境目录
rm -rf .venv-melo-tts
```

### 2. 删除启动脚本

```bash
# 删除启动脚本
rm -f start-melo-tts.sh
```

### 3. 清理 Rust（可选）

如果 Rust 只为 Melo TTS 安装，可以删除：

```bash
# 删除 Rust 安装
rm -rf ~/.cargo

# 清理 shell 配置文件中的 PATH
# 编辑 ~/.bashrc 或 ~/.zshrc，删除包含 .cargo 的行
nano ~/.bashrc
# 或
nano ~/.zshrc
```

### 4. 卸载系统包（可选）

⚠️ **警告**: 这些包可能被其他项目使用，请谨慎卸载。

```bash
# Debian/Ubuntu
sudo apt-get remove mecab libmecab-dev mecab-ipadic-utf8

# 可选：如果不再需要编译工具
# sudo apt-get remove build-essential python3-dev
```

## 📝 清理清单

清理完成后，检查以下内容：

- [ ] 虚拟环境目录已删除 (`.venv-melo-tts`)
- [ ] 启动脚本已删除 (`start-melo-tts.sh`)
- [ ] (可选) Rust 已清理 (`~/.cargo`)
- [ ] (可选) 系统包已卸载
- [ ] (可选) Shell 配置文件已清理

## 🔄 重新安装

如果以后想重新安装，只需：

```bash
# 重新运行设置脚本
bash docs/setup/setup-melo-tts-venv.sh
```

## ⚠️ 注意事项

1. **源代码和文档**: 清理脚本不会删除源代码和文档文件
   - 如果需要删除，请手动删除相关文件

2. **系统包依赖**: 某些系统包可能被其他软件依赖
   - 卸载时系统会提示依赖关系
   - 建议保留系统包，除非确定不再需要

3. **Rust**: 如果其他项目也使用 Rust，建议保留

4. **虚拟环境**: 只占用磁盘空间，删除不会影响系统

## 📊 磁盘空间

清理后可以释放的磁盘空间：
- 虚拟环境: 约 500MB - 2GB（取决于安装的包）
- Rust 工具链: 约 1GB - 3GB（如果删除）
- 系统包: 约 50MB - 200MB（如果卸载）

## 🆘 遇到问题

如果清理过程中遇到问题：

1. **权限错误**: 使用 `sudo` 运行系统包卸载
2. **文件被占用**: 确保没有进程在使用虚拟环境
3. **依赖冲突**: 系统包卸载时会自动处理依赖关系

