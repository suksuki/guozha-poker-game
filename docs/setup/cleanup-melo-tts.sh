#!/bin/bash
# 清理 Melo TTS 安装内容

set -e

echo "=========================================="
echo "清理 Melo TTS 安装内容"
echo "=========================================="
echo ""

# 获取项目根目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

VENV_DIR="$PROJECT_ROOT/.venv-melo-tts"
START_SCRIPT="$PROJECT_ROOT/start-melo-tts.sh"

echo "项目根目录: $PROJECT_ROOT"
echo ""

# 清理虚拟环境
if [ -d "$VENV_DIR" ]; then
    echo "删除虚拟环境: $VENV_DIR"
    rm -rf "$VENV_DIR"
    echo "✅ 虚拟环境已删除"
else
    echo "虚拟环境不存在，跳过"
fi
echo ""

# 清理启动脚本
if [ -f "$START_SCRIPT" ]; then
    echo "删除启动脚本: $START_SCRIPT"
    rm -f "$START_SCRIPT"
    echo "✅ 启动脚本已删除"
else
    echo "启动脚本不存在，跳过"
fi
echo ""

# 提示清理 Rust（可选）
if [ -d "$HOME/.cargo" ]; then
    echo "检测到 Rust 安装目录: $HOME/.cargo"
    echo "Rust 可能被其他项目使用，是否删除? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "删除 Rust 安装..."
        rm -rf "$HOME/.cargo"
        echo "✅ Rust 已删除"
        echo ""
        echo "⚠️  注意: 如果 ~/.bashrc 或 ~/.zshrc 中有 Rust PATH 配置，请手动清理"
    else
        echo "保留 Rust 安装"
    fi
else
    echo "未检测到 Rust 安装，跳过"
fi
echo ""

# 提示清理系统包（可选）
echo "是否卸载系统级依赖? (mecab, build-essential 等)"
echo "这些包可能被其他项目使用，请谨慎选择"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo "卸载系统包..."
    
    if [ -f /etc/debian_version ]; then
        sudo apt-get remove -y \
            mecab \
            libmecab-dev \
            mecab-ipadic-utf8 2>/dev/null || echo "部分包可能未安装或已被其他软件使用"
        
        echo ""
        echo "是否也卸载编译工具? (build-essential, python3-dev)"
        echo "⚠️  警告: 这些工具可能被其他项目使用"
        read -r remove_build
        if [[ "$remove_build" =~ ^[Yy]$ ]]; then
            sudo apt-get remove -y build-essential python3-dev 2>/dev/null || echo "部分包可能被其他软件使用"
        fi
    elif [ -f /etc/redhat-release ]; then
        sudo yum remove -y \
            mecab \
            mecab-devel \
            mecab-ipadic 2>/dev/null || echo "部分包可能未安装或已被其他软件使用"
    fi
    
    echo "✅ 系统包卸载完成（部分包可能因依赖关系无法卸载）"
else
    echo "保留系统包"
fi
echo ""

echo "=========================================="
echo "✅ 清理完成！"
echo "=========================================="
echo ""
echo "已清理的内容:"
echo "  ✅ 虚拟环境 (.venv-melo-tts)"
echo "  ✅ 启动脚本 (start-melo-tts.sh)"
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "  ✅ 系统包（部分可能因依赖关系保留）"
fi
echo ""
echo "注意:"
echo "  - 源代码和文档文件未删除（如需删除请手动操作）"
echo "  - 如果安装了 Rust，可能需要手动从 ~/.bashrc 或 ~/.zshrc 中移除 PATH 配置"
echo ""

