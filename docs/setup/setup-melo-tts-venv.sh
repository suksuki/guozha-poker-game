#!/bin/bash
# Melo TTS 虚拟环境设置脚本
# 用于在虚拟环境中安装和配置 Melo TTS

set -e  # 遇到错误立即退出

echo "=========================================="
echo "Melo TTS 虚拟环境设置"
echo "=========================================="
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
VENV_DIR="$PROJECT_ROOT/.venv-melo-tts"

echo "项目根目录: $PROJECT_ROOT"
echo "虚拟环境目录: $VENV_DIR"
echo ""

# 检查 Python 版本
echo "检查 Python 版本..."
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 python3"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "Python 版本: $(python3 --version)"
if [ "$(printf '%s\n' "3.10" "$PYTHON_VERSION" | sort -V | head -n1)" != "3.10" ]; then
    echo "❌ 错误: 需要 Python 3.10 或更高版本"
    exit 1
fi
echo "✅ Python 版本符合要求"
echo ""

# 创建虚拟环境
if [ -d "$VENV_DIR" ]; then
    echo "虚拟环境已存在: $VENV_DIR"
    echo "是否删除并重新创建? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "删除现有虚拟环境..."
        rm -rf "$VENV_DIR"
        echo "✅ 已删除"
    else
        echo "使用现有虚拟环境"
    fi
fi

if [ ! -d "$VENV_DIR" ]; then
    echo "创建虚拟环境..."
    python3 -m venv "$VENV_DIR"
    echo "✅ 虚拟环境创建成功"
fi
echo ""

# 检查并安装系统依赖
echo "检查系统依赖..."
echo "Melo TTS 需要系统级的 MeCab 库..."

if ! command -v mecab &> /dev/null; then
    echo "⚠️  未检测到 MeCab，需要安装系统依赖..."
    echo "正在安装系统依赖（需要 sudo 权限）..."
    echo ""
    
    # 检测 Linux 发行版
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        echo "检测到 Debian/Ubuntu 系统"
        echo "请运行以下命令安装系统依赖："
        echo ""
        echo "sudo apt-get update"
        echo "sudo apt-get install -y mecab libmecab-dev mecab-ipadic-utf8"
        echo ""
        echo "然后重新运行此脚本。"
        echo ""
        read -p "是否现在安装系统依赖? (需要 sudo 密码) [y/N]: " install_sys_deps
        if [[ "$install_sys_deps" =~ ^[Yy]$ ]]; then
            sudo apt-get update
            sudo apt-get install -y mecab libmecab-dev mecab-ipadic-utf8 || {
                echo "❌ 系统依赖安装失败，请手动安装后重试"
                exit 1
            }
            echo "✅ 系统依赖安装完成"
        else
            echo "请先安装系统依赖，然后重新运行此脚本"
            exit 1
        fi
    elif [ -f /etc/redhat-release ]; then
        # RedHat/CentOS
        echo "检测到 RedHat/CentOS 系统"
        echo "请运行以下命令安装系统依赖："
        echo ""
        echo "sudo yum install -y mecab mecab-devel mecab-ipadic"
        echo ""
        echo "然后重新运行此脚本。"
        exit 1
    else
        echo "⚠️  未知的 Linux 发行版，请手动安装 MeCab"
        echo "Debian/Ubuntu: sudo apt-get install mecab libmecab-dev mecab-ipadic-utf8"
        echo "RedHat/CentOS: sudo yum install mecab mecab-devel mecab-ipadic"
        exit 1
    fi
else
    echo "✅ MeCab 已安装: $(mecab --version 2>&1 | head -n1)"
fi
echo ""

# 激活虚拟环境并升级 pip
echo "激活虚拟环境并升级 pip..."
source "$VENV_DIR/bin/activate"

# 确保 Rust 在 PATH 中（如果已安装）
if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
fi

pip install --upgrade pip
echo "✅ pip 已升级"
echo ""

# 检查 Rust（tokenizers 需要）
if ! command -v rustc &> /dev/null; then
    echo "⚠️  警告: 未检测到 Rust 编译器"
    echo "tokenizers 包需要 Rust 来编译，安装可能会失败"
    echo ""
    echo "建议先安装 Rust:"
    echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    echo "  source ~/.cargo/env"
    echo ""
    read -p "是否继续安装? (y/N): " continue_install
    if [[ ! "$continue_install" =~ ^[Yy]$ ]]; then
        echo "安装已取消，请先安装 Rust 后重试"
        exit 1
    fi
else
    echo "✅ Rust 已安装: $(rustc --version)"
fi
echo ""

# 安装 Melo TTS
echo "安装 Melo TTS..."
echo "这可能需要几分钟时间（需要编译依赖）..."
echo "如果遇到错误，请确保已安装系统依赖："
echo "  sudo apt-get install mecab libmecab-dev mecab-ipadic-utf8"
echo ""

if ! pip install git+https://github.com/myshell-ai/MeloTTS.git; then
    echo ""
    echo "❌ Melo TTS 安装失败"
    echo ""
    echo "常见问题："
    echo "1. 缺少 MeCab 系统库"
    echo "   解决: sudo apt-get install mecab libmecab-dev mecab-ipadic-utf8"
    echo ""
    echo "2. 缺少编译工具"
    echo "   解决: sudo apt-get install build-essential python3-dev"
    echo ""
    echo "3. 缺少 Rust 编译器（tokenizers 需要）"
    echo "   解决: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    echo "   然后: source ~/.cargo/env"
    echo "   或者运行: bash docs/setup/install-system-deps.sh"
    echo ""
    echo "4. 网络问题"
    echo "   解决: 检查网络连接，或使用代理"
    echo ""
    echo "建议："
    echo "  运行系统依赖安装脚本（会自动安装 Rust）:"
    echo "  bash docs/setup/install-system-deps.sh"
    echo ""
    exit 1
fi
echo "✅ Melo TTS 安装完成"
echo ""

# 下载语言资源
echo "下载语言资源 (unidic)..."
if python -m unidic download 2>&1; then
    echo "✅ 语言资源下载完成"
else
    echo "⚠️  警告: unidic 下载失败，可能需要手动安装"
    echo "可以稍后运行: python -m unidic download"
fi
echo ""

# 安装 API 服务器依赖
echo "安装 API 服务器依赖..."
pip install fastapi uvicorn pydantic
echo "✅ API 服务器依赖安装完成"
echo ""

# 创建启动脚本
START_SCRIPT="$PROJECT_ROOT/start-melo-tts.sh"
cat > "$START_SCRIPT" << EOF
#!/bin/bash
# 启动 Melo TTS API 服务器

SCRIPT_DIR="\$( cd "\$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
VENV_DIR="\$SCRIPT_DIR/.venv-melo-tts"

if [ ! -d "\$VENV_DIR" ]; then
    echo "❌ 错误: 虚拟环境不存在，请先运行 setup-melo-tts-venv.sh"
    exit 1
fi

echo "激活虚拟环境..."
source "\$VENV_DIR/bin/activate"

echo "启动 Melo TTS API 服务器..."
cd "\$SCRIPT_DIR/docs/setup"
python melo-tts-api-server.py
EOF

chmod +x "$START_SCRIPT"
echo "✅ 创建启动脚本: $START_SCRIPT"
echo ""

echo "=========================================="
echo "✅ 设置完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 启动服务器:"
echo "   bash start-melo-tts.sh"
echo ""
echo "   或者手动启动:"
echo "   source $VENV_DIR/bin/activate"
echo "   cd docs/setup"
echo "   python melo-tts-api-server.py"
echo ""
echo "2. 验证服务:"
echo "   curl http://localhost:7860/health"
echo ""
echo "虚拟环境位置: $VENV_DIR"
echo "=========================================="

