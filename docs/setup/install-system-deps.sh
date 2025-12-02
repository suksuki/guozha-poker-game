#!/bin/bash
# 安装 Melo TTS 所需的系统依赖
# 需要在安装 Python 包之前运行

set -e

echo "=========================================="
echo "安装 Melo TTS 系统依赖"
echo "=========================================="
echo ""

# 检测 Linux 发行版
if [ -f /etc/debian_version ]; then
    echo "检测到 Debian/Ubuntu 系统"
    echo "正在安装系统依赖..."
    echo ""
    
    # 更新包列表
    sudo apt-get update
    
    # 安装 MeCab 和相关依赖
    sudo apt-get install -y \
        mecab \
        libmecab-dev \
        mecab-ipadic-utf8 \
        build-essential \
        python3-dev \
        git \
        curl \
        pkg-config \
        libssl-dev
    
    # 安装 Rust（tokenizers 需要）
    echo ""
    echo "检查 Rust 编译器（tokenizers 需要）..."
    if ! command -v rustc &> /dev/null; then
        echo "未检测到 Rust，正在安装..."
        echo "这可能需要几分钟时间..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        
        # 将 Rust 添加到 PATH
        export PATH="$HOME/.cargo/bin:$PATH"
        source "$HOME/.cargo/env"
        
        echo "✅ Rust 安装完成"
    else
        echo "✅ Rust 已安装: $(rustc --version)"
    fi
    
    echo ""
    echo "✅ 系统依赖安装完成"
    
elif [ -f /etc/redhat-release ]; then
    echo "检测到 RedHat/CentOS 系统"
    echo "正在安装系统依赖..."
    echo ""
    
    sudo yum install -y \
        mecab \
        mecab-devel \
        mecab-ipadic \
        gcc \
        gcc-c++ \
        python3-devel \
        git \
        curl \
        pkgconfig \
        openssl-devel
    
    echo ""
    echo "✅ 系统依赖安装完成"
    
else
    echo "⚠️  未知的 Linux 发行版"
    echo "请手动安装以下系统包："
    echo ""
    echo "Debian/Ubuntu:"
    echo "  sudo apt-get install mecab libmecab-dev mecab-ipadic-utf8 build-essential python3-dev"
    echo ""
    echo "RedHat/CentOS:"
    echo "  sudo yum install mecab mecab-devel mecab-ipadic gcc gcc-c++ python3-devel"
    echo ""
    exit 1
fi

# 安装 Rust（如果是 RedHat/CentOS）
if [ -f /etc/redhat-release ] && ! command -v rustc &> /dev/null; then
    echo "安装 Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    export PATH="$HOME/.cargo/bin:$PATH"
    source "$HOME/.cargo/env"
fi

echo ""
echo "=========================================="
echo "验证安装"
echo "=========================================="

# 验证 MeCab
if command -v mecab &> /dev/null; then
    echo "✅ MeCab: $(mecab --version 2>&1 | head -n1)"
else
    echo "❌ MeCab 未找到"
    exit 1
fi

# 验证编译工具
if command -v gcc &> /dev/null; then
    echo "✅ GCC: $(gcc --version | head -n1)"
else
    echo "❌ GCC 未找到"
    exit 1
fi

# 验证 Rust（可选，但推荐）
if command -v rustc &> /dev/null; then
    echo "✅ Rust: $(rustc --version)"
else
    echo "⚠️  Rust 未找到（某些包可能需要 Rust 编译）"
    echo "   可以稍后安装: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
fi

echo ""
echo "=========================================="
echo "✅ 系统依赖安装完成！"
echo "=========================================="
echo ""
echo "下一步：运行 Python 包安装脚本"
echo "  bash docs/setup/setup-melo-tts-venv.sh"
echo ""

