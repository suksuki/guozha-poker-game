# 文档引用更新指南

## 📋 需要更新的文档引用

由于文件已从根目录移动到 `docs/root-docs/`，以下文档中的脚本路径引用可能需要更新：

### 🔍 需要检查的文档

1. **docs/setup/** 目录下的文档
   - 可能包含 `./start-*.sh`, `./install-*.sh` 等引用
   - 需要更新为 `./docs/root-docs/scripts/start/start-*.sh`

2. **docs/fixes/** 目录下的文档
   - 可能包含脚本路径引用
   - 需要更新为新的路径

3. **docs/usage/** 目录下的文档
   - 可能包含脚本使用说明
   - 需要更新路径

4. **docs/root-docs/startup/** 目录下的文档
   - 这些文档本身已移动，但内部可能还有旧路径引用
   - 需要检查并更新

### 🔧 更新方法

#### 方法1：使用完整路径
```bash
# 旧方式
./start-wsl.sh

# 新方式
./docs/root-docs/scripts/start/start-wsl.sh
```

#### 方法2：创建符号链接（推荐）
```bash
# 运行符号链接创建脚本
./docs/root-docs/create-symlinks.sh

# 然后可以直接使用
./start-wsl.sh
```

### 📝 已更新的文档

- ✅ `docs/setup/FIX-WSL-NODE.md` - 已更新脚本路径

### 🔄 待更新的文档

以下文档可能需要更新（需要手动检查）：

- `docs/setup/tts-recommendation.md`
- `docs/setup/start-ollama.md`
- `docs/setup/piper-tts-quick-start-final.md`
- `docs/fixes/audio-fixes.md`
- `docs/fixes/fixes-summary.md`
- `docs/usage/local-tts-services-guide.md`
- `docs/root-docs/startup/*.md` (内部引用)

### 💡 建议

1. **统一使用符号链接方式**：
   - 运行 `./docs/root-docs/create-symlinks.sh` 创建符号链接
   - 在文档中推荐使用符号链接后的路径

2. **在文档中添加说明**：
   - 如果使用完整路径，添加注释说明
   - 推荐使用符号链接方式

3. **定期检查**：
   - 新添加的文档应使用新的路径结构
   - 旧文档逐步更新

---

**提示**：可以使用以下命令批量查找需要更新的文档：
```bash
grep -r "\./start-\|\./install-\|\./test-" docs/ --include="*.md"
```

