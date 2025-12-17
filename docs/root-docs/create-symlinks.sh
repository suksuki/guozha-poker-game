#!/bin/bash
# 创建常用脚本的符号链接到项目根目录
# 方便从根目录直接运行脚本

cd "$(dirname "$0")/../.." || exit 1

SCRIPT_DIR="docs/root-docs/scripts"

echo "🔗 创建常用脚本的符号链接..."

# 启动脚本
if [ ! -f "start-wsl.sh" ]; then
    ln -s "${SCRIPT_DIR}/start/start-wsl.sh" start-wsl.sh
    echo "✅ 创建 start-wsl.sh"
fi

if [ ! -f "start-all.sh" ]; then
    ln -s "${SCRIPT_DIR}/start/start-all.sh" start-all.sh
    echo "✅ 创建 start-all.sh"
fi

if [ ! -f "start-app-and-piper.sh" ]; then
    ln -s "${SCRIPT_DIR}/start/start-app-and-piper.sh" start-app-and-piper.sh
    echo "✅ 创建 start-app-and-piper.sh"
fi

# 安装脚本
if [ ! -f "install-nodejs-wsl.sh" ]; then
    ln -s "${SCRIPT_DIR}/install/install-nodejs-wsl.sh" install-nodejs-wsl.sh
    echo "✅ 创建 install-nodejs-wsl.sh"
fi

if [ ! -f "install-voice-packages.sh" ]; then
    ln -s "${SCRIPT_DIR}/install/install-voice-packages.sh" install-voice-packages.sh
    echo "✅ 创建 install-voice-packages.sh"
fi

# 测试脚本
if [ ! -f "test-voice.sh" ]; then
    ln -s "${SCRIPT_DIR}/test/test-voice.sh" test-voice.sh
    echo "✅ 创建 test-voice.sh"
fi

echo ""
echo "✨ 符号链接创建完成！"
echo "现在可以直接从根目录运行这些脚本了。"
echo ""
echo "使用示例："
echo "  ./start-wsl.sh"
echo "  ./start-all.sh"
echo "  ./install-nodejs-wsl.sh"

