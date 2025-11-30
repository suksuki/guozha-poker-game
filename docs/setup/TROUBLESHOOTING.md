# Melo TTS 故障排除指南

## 常见安装问题

### 问题 1: `Failed building wheel for tokenizers` / `ERROR: Failed to build installable wheels for tokenizers`

**原因**: `tokenizers` 包需要 Rust 编译器来编译。

**解决方案**:

#### 方式 1: 安装 Rust（推荐）

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 激活 Rust 环境
source ~/.cargo/env

# 重新运行安装脚本
bash docs/setup/setup-melo-tts-venv.sh
```

#### 方式 2: 使用系统依赖安装脚本（推荐）

```bash
# 这会自动安装 Rust 和其他依赖
bash docs/setup/install-system-deps.sh

# 然后重新运行 Python 包安装
bash docs/setup/setup-melo-tts-venv.sh
```

#### 方式 3: 手动安装系统依赖

```bash
# 安装所有依赖（包括 Rust）
sudo apt-get update
sudo apt-get install -y mecab libmecab-dev mecab-ipadic-utf8 build-essential python3-dev

# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 重新运行安装
bash docs/setup/setup-melo-tts-venv.sh
```

### 问题 2: `RuntimeError: Could not configure working env. Have you installed MeCab?`

**原因**: 缺少系统级的 MeCab 库。

**解决方案**:

```bash
# 安装 MeCab
sudo apt-get update
sudo apt-get install -y mecab libmecab-dev mecab-ipadic-utf8

# 验证安装
mecab --version

# 重新运行安装脚本
bash docs/setup/setup-melo-tts-venv.sh
```

### 问题 3: `error: externally-managed-environment`

**原因**: 系统 Python 环境被保护，不允许直接安装包。

**解决方案**: 使用虚拟环境（我们的脚本会自动创建）。

### 问题 4: `ModuleNotFoundError: No module named 'fastapi'`

**原因**: 之前的安装失败，依赖未安装。

**解决方案**:

```bash
# 清理虚拟环境
rm -rf .venv-melo-tts

# 确保系统依赖已安装
bash docs/setup/install-system-deps.sh

# 重新运行安装
bash docs/setup/setup-melo-tts-venv.sh
```

### 问题 5: 安装过程很慢或卡住

**原因**: 
- 正在编译 Rust 代码（正常，可能需要 5-10 分钟）
- 网络问题
- 资源不足

**解决方案**:

1. **耐心等待**: Rust 编译需要时间，特别是在第一次安装时
2. **检查资源**: 确保有足够的内存和磁盘空间
3. **检查网络**: 确保网络连接稳定

### 问题 6: 编译失败，内存不足

**原因**: 编译 Rust 包需要较多内存。

**解决方案**:

```bash
# 增加交换空间（如果可用）
sudo swapon --show  # 查看当前交换空间

# 或者使用预编译的 wheel 文件（如果可用）
pip install --only-binary :all: tokenizers
```

### 问题 7: 端口被占用

**错误**: `Address already in use`

**解决方案**:

```bash
# 查找占用端口的进程
lsof -i :7860
# 或
netstat -tulpn | grep 7860

# 杀死进程或修改端口
# 修改 docs/setup/melo-tts-api-server.py 中的端口号
```

## 完整重新安装步骤

如果遇到无法解决的问题，可以完全清理并重新安装：

```bash
# 1. 清理虚拟环境
rm -rf .venv-melo-tts

# 2. 安装系统依赖（包括 Rust）
bash docs/setup/install-system-deps.sh

# 3. 确保 Rust 在 PATH 中
source ~/.cargo/env

# 4. 重新安装 Python 包
bash docs/setup/setup-melo-tts-venv.sh

# 5. 启动服务器
bash start-melo-tts.sh
```

## 验证安装

安装完成后，验证所有组件：

```bash
# 1. 检查系统依赖
mecab --version
rustc --version
gcc --version

# 2. 激活虚拟环境
source .venv-melo-tts/bin/activate

# 3. 检查 Python 包
pip list | grep -E "melo|fastapi|tokenizers"

# 4. 测试服务器
bash start-melo-tts.sh
# 在另一个终端运行：
curl http://localhost:7860/health
```

## 获取帮助

如果以上方法都无法解决问题：

1. **查看日志**: 安装脚本会输出详细日志
2. **检查系统要求**: 
   - Python 3.10+
   - 至少 2GB 内存
   - 至少 5GB 磁盘空间
3. **查看错误信息**: 复制完整的错误信息以便排查

## 系统要求检查清单

- [ ] Python 3.10 或更高版本
- [ ] 足够的磁盘空间（至少 5GB）
- [ ] 足够的内存（至少 2GB）
- [ ] 网络连接正常
- [ ] 系统依赖已安装（MeCab、Rust、编译工具）

## 性能优化建议

如果安装很慢：

1. **使用国内镜像**（如果在中国）:
   ```bash
   # 配置 pip 镜像
   pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
   
   # 配置 Rust 镜像
   export RUSTUP_DIST_SERVER=https://mirrors.ustc.edu.cn/rust-static
   export RUSTUP_UPDATE_ROOT=https://mirrors.ustc.edu.cn/rust-static/rustup
   ```

2. **使用预编译包**: 某些包可能有预编译的 wheel 文件

3. **增加交换空间**: 如果内存不足

## 常见错误消息速查

| 错误消息 | 解决方案 |
|---------|---------|
| `Could not configure working env. Have you installed MeCab?` | 安装 MeCab: `sudo apt-get install mecab libmecab-dev` |
| `Failed building wheel for tokenizers` | 安装 Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| `externally-managed-environment` | 使用虚拟环境（脚本会自动创建） |
| `ModuleNotFoundError` | 重新安装依赖或清理虚拟环境 |
| `Address already in use` | 更改端口或杀死占用进程 |

