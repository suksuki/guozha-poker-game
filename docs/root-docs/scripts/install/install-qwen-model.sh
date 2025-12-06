#!/bin/bash
# 在远程 Ubuntu 服务器上安装 qwen2:0.5b 模型

SERVER="192.168.0.13"
MODEL="qwen2:0.5b"

echo "========================================"
echo "📥 在 ${SERVER} 上安装模型: ${MODEL}"
echo "========================================"
echo ""

# 方法 1: 如果你有 SSH 访问权限
echo "方法 1: 通过 SSH 安装（需要密码）"
echo "----------------------------------------"
echo "命令："
echo "ssh jin@${SERVER} 'ollama pull ${MODEL}'"
echo ""

# 方法 2: 直接在服务器上执行
echo "方法 2: 直接在服务器上执行"
echo "----------------------------------------"
echo "1. SSH 登录到服务器："
echo "   ssh jin@${SERVER}"
echo ""
echo "2. 在服务器上运行："
echo "   ollama pull ${MODEL}"
echo ""
echo "3. 验证安装："
echo "   ollama list"
echo ""
echo "4. 测试模型："
echo "   ollama run ${MODEL} \"你好\""
echo ""

# 如果你提供了 SSH 密钥或密码，可以自动执行
read -p "是否自动通过 SSH 安装？(y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "正在连接到 ${SERVER}..."
    ssh jin@${SERVER} "ollama pull ${MODEL}"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ 模型安装成功！"
        echo ""
        echo "📋 验证安装："
        ssh jin@${SERVER} "ollama list"
    else
        echo "❌ 安装失败，请检查 SSH 连接"
    fi
else
    echo "请手动在服务器上执行以上命令"
fi

echo ""
echo "========================================"
echo "📝 安装完成后，在游戏中使用:"
echo "   - 服务器: ${SERVER}:11434"
echo "   - 模型: ${MODEL}"
echo "========================================"

